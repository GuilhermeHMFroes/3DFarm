from flask import Blueprint, request, jsonify, send_from_directory, Response, stream_with_context

from extensions import socketio

from utils import generate_token
import json

import db

import requests
import os
from pathlib import Path 

api_bp = Blueprint('api', __name__)

# Caminhos
BASE_DIR = Path(__file__).resolve().parent
UPLOAD_FOLDER = BASE_DIR / "uploads"

def valida_token(token):
    printer = db.get_printer_by_token(token) # Verifique se essa função existe no seu db.py
    if not printer:
        return False
    return printer

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
        db.create_printer_entry(name, ip, token)
        return jsonify({"success": True, "token": token})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    
# -----------------------
# Endpoints para o plugin OctoPrint
# -----------------------
@api_bp.route("/status", methods=["POST"])
def api_status():

    data = request.get_json() or {}
    token = data.get("token")

    if not token or not valida_token(token):
        return jsonify({"success": False, "message": "Token inválido ou não cadastrado"}), 401
        
    ip = data.get("ip") or request.remote_addr
    
    # Tenta atualizar o status. Se o token não existir, retorna False.
    authorized = db.update_printer_connection(token, ip, json.dumps(data))
    
    if authorized:
        return jsonify({"success": True})
    else:
        # Retorna 401 Unauthorized para o plugin saber que algo está errado
        return jsonify({"success": False, "message": "Token inválido ou impressora excluída"}), 401

@api_bp.route("/fila")
def api_fila():

    token = request.args.get("token")

    if not token or not valida_token(token):
        # Retorna 401 para que o plugin saiba que deve parar
        return jsonify({"success": False, "message": "Acesso negado"}), 401
    
    # --- DEBUG ---
    print(f"DEBUG: Impressora com token {token[:5]}... perguntou por trabalho.")
    
    item = db.get_next_queued_for_token(token)

    if not item:
        return jsonify({"novo_arquivo": False})
    
    # Agora o item['id'] não vai mais dar erro!
    print(f"DEBUG: TRABALHO ENCONTRADO! ID: {item['id']}, Arquivo: {item['filename']}")


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
    
    db.mark_queue_status(qid, status)
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

    data = request.get_json() or {}
    token = data.get("token")
    
    if not token:
        return jsonify({"command": None}), 400
    
    # Usa a função helper do db.py
    cmd = db.get_and_delete_command(token)
     
    return jsonify({"command": cmd['command'] if cmd else None})

# 3. PROXY DA WEBCAM (Frontend -> Servidor -> OctoPrint)
@api_bp.route("/proxy/webcam/<token>")
def proxy_webcam(token):
    
    # 1. Busca os dados no Banco
    
    printer = db.get_printer_webcam_info(token)

    if not printer or not printer["ip"]:
        return "Impressora offline ou não encontrada", 404

    ip = printer["ip"]
    config_url = printer["webcam_url"]

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

    db.add_printer_command(token, cmd)

    # 2. ENVIA VIA SOCKET (Para o plugin que usa Tempo Real)
    try:
        # Use 'to=' em vez de 'room=' e garanta o namespace='/'
        socketio.emit('execute_command', {"command": cmd}, to=token, namespace='/')
        print(f"WS: Comando '{cmd}' disparado para a sala {token}")
    except Exception as e:
        print(f"Erro ao emitir socket: {e}")

    return jsonify({"success": True, "message": "Comando enviado"})

