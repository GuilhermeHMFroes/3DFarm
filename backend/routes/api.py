from flask import Blueprint, request, jsonify, send_from_directory, Response, stream_with_context

from extensions import socketio

from utils import generate_token
import json
import sqlite3

import db

import requests
import os
from pathlib import Path 

api_bp = Blueprint('api', __name__)

# Caminhos
BASE_DIR = Path(__file__).resolve().parent
UPLOAD_FOLDER = BASE_DIR / "uploads"


def create_printer_entry(name, ip, token):
    conn = db.get_conn()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO printers (name, ip, token, last_status) VALUES (?, ?, ?, ?)",
        (name, ip, token, "offline")
    )
    conn.commit()
    conn.close()

def mark_queue_status(qid, status):
    conn = db.get_conn()
    cur = conn.cursor()
    cur.execute("UPDATE queue SET status=? WHERE id=?", (status, qid))
    conn.commit()
    conn.close()

# No arquivo backend/routes/api.py

def update_printer_connection(token, ip, last_status=None):
    conn = db.get_conn()
    cur = conn.cursor()
    # Verifica se o token existe
    printer = cur.execute("SELECT id FROM printers WHERE token = ?", (token,)).fetchone()
    if not printer:
        conn.close()
        return False
    
    # Atualiza IP, status e última vez vista
    cur.execute("""
        UPDATE printers 
        SET ip = ?, last_status = ?, last_seen = CURRENT_TIMESTAMP 
        WHERE token = ?
    """, (ip, last_status, token))
    
    conn.commit()
    conn.close()
    return True

def pop_next_for_token(token):
    conn = db.get_conn()
    cur = conn.cursor()
    # Pega o arquivo mais antigo na fila para esta impressora
    item = cur.execute("""
        SELECT id, filename, filepath FROM queue 
        WHERE target_token = ? AND status = 'queued' 
        ORDER BY created_at ASC LIMIT 1
    """, (token,)).fetchone()
    
    if item:
        # Marca como enviado para não repetir
        cur.execute("UPDATE queue SET status = 'sent' WHERE id = ?", (item['id'],))
        conn.commit()
        result = {"filename": item['filename'], "filepath": item['filepath']}
    else:
        result = None
        
    conn.close()
    return result

@api_bp.route("/generate_token", methods=["POST"])
def api_generate_token():
    data = request.get_json() or {}
    name = data.get("name")
    ip = data.get("ip")
    
    # Validação extra: Nome é obrigatório para gerar token
    if not name:
        return jsonify({"success": False, "message": "Nome da impressora é obrigatório"}), 400

    token = generate_token()
    
    try:
        # Usa a função de CRIAÇÃO
        create_printer_entry(name, ip, token)
        return jsonify({"success": True, "token": token})
    except sqlite3.IntegrityError:
        return jsonify({"success": False, "message": "Erro de integridade (token duplicado?)"}), 500
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    
# -----------------------
# Endpoints para o plugin OctoPrint
# -----------------------
@api_bp.route("/status", methods=["POST"])
def api_status():
    data = request.get_json() or {}
    token = data.get("token")
    if not token:
        return jsonify({"success": False, "message": "token obrigatório"}), 400
        
    ip = data.get("ip") or request.remote_addr
    
    # Tenta atualizar o status. Se o token não existir, retorna False.
    # Note que removemos 'data.get("nome_impressora")' da lógica de update
    authorized = update_printer_connection(token, ip, json.dumps(data))
    
    if authorized:
        return jsonify({"success": True})
    else:
        # Retorna 401 Unauthorized para o plugin saber que algo está errado
        return jsonify({"success": False, "message": "Token inválido ou impressora excluída"}), 401

@api_bp.route("/fila")
def api_fila():
    token = request.args.get("token")
    if not token:
        return jsonify({"success": False, "message": "token obrigatório"}), 400
    
    # --- DEBUG ---
    print(f"DEBUG: Impressora com token {token[:5]}... perguntou por trabalho.")
    
    # Buscamos a conexão e garantimos que ela retorne dicionários
    conn = db.get_conn()
    conn.row_factory = sqlite3.Row  # <--- ISSO É ESSENCIAL
    cur = conn.cursor()

    # Em vez de chamar pop_next_for_token (que pode estar com erro interno),
    # fazemos a busca direta para garantir que o 'id' venha na query
    row = cur.execute("""
        SELECT id, filename, filepath 
        FROM queue 
        WHERE target_token = ? AND status = 'queued' 
        ORDER BY id ASC LIMIT 1
    """, (token,)).fetchone()

    if not row:
        conn.close()
        print(f"DEBUG: Nenhum trabalho encontrado para este token.")
        return jsonify({"novo_arquivo": False})

    # Converte o resultado do SQLite para um dicionário real do Python
    item = dict(row)
    
    # Agora o item['id'] não vai mais dar erro!
    print(f"DEBUG: TRABALHO ENCONTRADO! ID: {item['id']}, Arquivo: {item['filename']}")

    # Atualiza o status para 'sent' (enviado)
    cur.execute("UPDATE queue SET status='sent' WHERE id=?", (item["id"],))
    conn.commit()
    conn.close()

    filename = os.path.basename(item["filepath"])
    
    # Garante que a URL seja gerada corretamente para a impressora baixar
    arquivo_url = request.url_root.rstrip("/") + f"/uploads/{filename}"
    
    print(f"DEBUG: Enviando URL: {arquivo_url}")
    
    return jsonify({
        "novo_arquivo": True,
        "arquivo_url": arquivo_url,
        "queue_id": item["id"],
        "filename": filename
    })

@api_bp.route("/queue/confirm", methods=["POST"])
def api_queue_confirm():
    data = request.get_json() or {}
    qid, status = data.get("queue_id"), data.get("status")
    if not qid or not status:
        return jsonify({"success": False, "message": "queue_id e status obrigatórios"}), 400
    mark_queue_status(qid, status)
    return jsonify({"success": True})

# --------------------------------------------------
# SERVIDOR DE ARQUIVOS ESTÁTICOS (DOWNLOAD DE GCODE)
# --------------------------------------------------

@api_bp.route("/files/download/<path:filename>")
def api_serve_gcode_file(filename):
    return send_from_directory(str(UPLOAD_FOLDER), filename)

# 2. ROTA PARA O PLUGIN BUSCAR COMANDOS (Plugin -> Servidor)
@api_bp.route("/printer/check_commands")
def api_check_commands():
    token = request.args.get("token")
    if not token: return jsonify({"command": None})

    conn = db.get_conn()
    cur = conn.cursor()
    
    # Pega o comando mais antigo pendente
    cur.execute("SELECT id, command FROM commands WHERE target_token=? ORDER BY created_at LIMIT 1", (token,))
    row = cur.fetchone()
    
    if row:
        # Se achou, deleta o comando para não executar duas vezes
        cmd_id = row["id"]
        command = row["command"]
        cur.execute("DELETE FROM commands WHERE id=?", (cmd_id,))
        conn.commit()
        conn.close()
        return jsonify({"command": command})
    
    conn.close()
    return jsonify({"command": None})

# 3. PROXY DA WEBCAM (Frontend -> Servidor -> OctoPrint)
@api_bp.route("/proxy/webcam/<token>")
def proxy_webcam(token):
    # 1. Busca os dados no Banco
    conn = db.get_conn()
    cur = conn.cursor()
    cur.execute("SELECT ip, webcam_url FROM printers WHERE token = ?", (token,))
    row = cur.fetchone()
    conn.close()

    if not row or not row["ip"]:
        return "Impressora offline", 404

    ip = row["ip"]
    config_url = row["webcam_url"]

    # 2. Constrói a URL Universal
    # (Trata links relativos, portas, etc, para funcionar com qualquer origem)
    if not config_url:
        final_url = f"http://{ip}:8080/?action=stream"
    elif config_url.startswith("http"):
        final_url = config_url
    elif config_url.startswith("/"):
        final_url = f"http://{ip}{config_url}"
    elif config_url.startswith(":"):
        final_url = f"http://{ip}{config_url}"
    else:
        final_url = f"http://{ip}/{config_url}"

    # 3. O Proxy de Streaming Otimizado
    try:
        # stream=True conecta, mas só baixa os dados se pedirmos (On Demand)
        req = requests.get(final_url, stream=True, timeout=5)

        # Esta função geradora mantém o fluxo aberto apenas enquanto necessário
        def generate():
            try:
                # Lê pedaços de 1KB da câmera e repassa imediatamente
                for chunk in req.iter_content(chunk_size=1024):
                    if chunk:
                        yield chunk
            except GeneratorExit:
                # Isso acontece quando VOCÊ fecha o modal (o cliente desconecta)
                # O Python fecha a conexão com a câmera automaticamente aqui
                print(f"DEBUG: Cliente fechou modal. Parando stream de {ip}")
                req.close()
            except Exception as e:
                print(f"Erro no stream: {e}")

        # Retorna a resposta com headers que forçam o vídeo a tocar em tempo real
        return Response(stream_with_context(generate()), 
                        mimetype='multipart/x-mixed-replace; boundary=--boundarydonotcross')

    except Exception as e:
        return f"Erro ao conectar na câmera: {e}", 502
    
# 5. COMANDOS EM TEMPO REAL (Site -> Servidor -> Impressora)
@api_bp.route("/printer/command", methods=["POST"])
def api_send_command():
    # Mantemos a rota HTTP para o React usar, mas o envio vira Socket
    data = request.get_json() or {}
    token = data.get("token")
    cmd = data.get("command")
    
    if not token or not cmd:
        return jsonify({"success": False, "message": "Dados inválidos"}), 400

    # Grava no banco como backup
    conn = db.get_conn()
    cur = conn.cursor()
    cur.execute("INSERT INTO commands (target_token, command) VALUES (?,?)", (token, cmd))
    conn.commit()
    conn.close()

    # TENTA ENVIAR VIA SOCKET (Instantâneo)
    print(f"WS: Enviando comando '{cmd}' para {token}")
    socketio.emit('execute_command', {'cmd': cmd}, to=token)
    
    return jsonify({"success": True, "message": f"Comando {cmd} enviado via túnel."})

