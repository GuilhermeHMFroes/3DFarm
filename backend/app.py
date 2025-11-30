import os
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory, Response, stream_with_context
from flask_cors import CORS
import db
from utils import generate_token
import json
import sqlite3

from flask_socketio import SocketIO, emit, join_room, leave_room


import requests

# Caminhos
BASE_DIR = Path(__file__).resolve().parent
UPLOAD_FOLDER = BASE_DIR / "uploads"
UPLOAD_FOLDER.mkdir(exist_ok=True)

# Se o React estiver buildado em frontend/build:
FRONTEND_BUILD = BASE_DIR / ".." / "frontend" / "build"

# Flask app: aponta para o build do React
app = Flask(__name__, static_folder=str(FRONTEND_BUILD), static_url_path="/")
# Configuração do SocketIO (permite tamanhos de payload maiores para vídeo)
# max_http_buffer_size define o limite de tamanho do frame (5MB aqui)
socketio = SocketIO(app, cors_allowed_origins="*", max_http_buffer_size=5 * 1024 * 1024)
CORS(app)

# Inicializa DB
db.init_db()

# -----------------------
# Helpers DB
# -----------------------
def row_to_dict(row):
    return {k: row[k] for k in row.keys()} if row else None

def row_to_dict(row):
    return {k: row[k] for k in row.keys()} if row else None

# NOVO: Função exclusiva para CRIAR (usada apenas pelo botão do site)
def create_printer_entry(name, ip, token):
    conn = db.get_conn()
    cur = conn.cursor()
    # Tenta inserir. Se o token já existir (muito raro), o SQLite vai dar erro, o que é seguro.
    cur.execute("INSERT INTO printers (name, ip, token) VALUES (?,?,?)",
                (name, ip, token))
    conn.commit()
    conn.close()

# NOVO: Função exclusiva para CONECTAR (usada pelo plugin)
def update_printer_connection(token, ip, status_json=None):
    conn = db.get_conn()
    cur = conn.cursor()
    
    # 1. Verifica se o token existe no banco
    cur.execute("SELECT id FROM printers WHERE token = ?", (token,))
    row = cur.fetchone()
    
    # Se não encontrou o token, retorna Falso (bloqueia a conexão)
    if not row:
        conn.close()
        return False

    # 2. Se existe, atualiza IP, Visto Por Último e Status.
    #    NOTA: NÃO atualizamos o campo 'name'. O nome é protegido.
    if status_json:
        cur.execute("""UPDATE printers 
                       SET ip=?, last_seen=CURRENT_TIMESTAMP, last_status=? 
                       WHERE token=?""", (ip, status_json, token))
    else:
        cur.execute("""UPDATE printers 
                       SET ip=?, last_seen=CURRENT_TIMESTAMP 
                       WHERE token=?""", (ip, token))
    
    conn.commit()
    conn.close()
    return True # Sucesso

def enqueue_file(filename, filepath, target_token=None):
    conn = db.get_conn()
    cur = conn.cursor()
    cur.execute("""INSERT INTO queue (filename, filepath, target_token, status)
                   VALUES (?,?,?,'queued')""",
                (filename, str(filepath), target_token))
    conn.commit()
    inserted_id = cur.lastrowid
    conn.close()
    return inserted_id

def pop_next_for_token(token):
    conn = db.get_conn()
    cur = conn.cursor()

    # --- DEBUG ANTES DA BUSCA ---
    print(f"DEBUG DB: Procurando trabalho para token: '{token}'")
    
    # Vamos ver o que TEM na fila, só por curiosidade
    cur.execute("SELECT id, target_token, status FROM queue WHERE status='queued'")
    todos = cur.fetchall()
    print(f"DEBUG DB: Itens na fila agora: {[dict(r) for r in todos]}")
    # ----------------------------

    cur.execute("""SELECT * FROM queue 
                   WHERE status='queued' AND target_token=? 
                   ORDER BY created_at LIMIT 1""", (token,))
    row = cur.fetchone()

    cur.execute("""SELECT * FROM queue
                   WHERE status='queued' AND target_token=?
                   ORDER BY created_at LIMIT 1""", (token,))
    row = cur.fetchone()
    if not row:
        cur.execute("""SELECT * FROM queue
                       WHERE status='queued' AND target_token IS NULL
                       ORDER BY created_at LIMIT 1""")
        row = cur.fetchone()
    conn.close()
    return row_to_dict(row) if row else None

def mark_queue_status(qid, status):
    conn = db.get_conn()
    cur = conn.cursor()
    cur.execute("UPDATE queue SET status=? WHERE id=?", (status, qid))
    conn.commit()
    conn.close()

# -----------------------
# Endpoints para frontend
# -----------------------
@app.route("/api/generate_token", methods=["POST"])
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

@app.route("/api/printers")
def api_list_printers():
    conn = db.get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id,name,ip,token,last_seen,last_status FROM printers ORDER BY id")
    rows = cur.fetchall()
    conn.close()
    return jsonify({"success": True, "printers": [row_to_dict(r) for r in rows]})

@app.route("/api/files")
def api_list_files():
    """Lista todos os arquivos .gcode ou .gco na pasta uploads"""
    try:
        # Pega todos os arquivos terminados em .gcode ou .gco
        files = []
        for ext in ["*.gcode", "*.gco"]:
            for f in UPLOAD_FOLDER.glob(ext):
                files.append(f.name)
        
        return jsonify({"success": True, "files": sorted(files)})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/upload", methods=["POST"])
def upload_file():
    if "file" not in request.files:
        return jsonify({"success": False, "message": "Nenhum arquivo enviado"}), 400
    f = request.files["file"]
    if not f.filename:
        return jsonify({"success": False, "message": "Nome de arquivo inválido"}), 400
    safe_path = UPLOAD_FOLDER / f.filename
    f.save(safe_path)
    return jsonify({"success": True,
                    "fileName": f.filename,
                    "fileUrl": f"/uploads/{f.filename}"})

@app.route("/api/files/<filename>", methods=["DELETE"])
def api_delete_file(filename):
    """Apaga um arquivo G-code da pasta uploads"""
    try:
        # Segurança básica: garante que é apenas o nome do arquivo, sem caminhos (../)
        filename = os.path.basename(filename)
        file_path = UPLOAD_FOLDER / filename
        
        if file_path.exists():
            os.remove(file_path)
            return jsonify({"success": True, "message": f"Arquivo {filename} excluído"})
        else:
            return jsonify({"success": False, "message": "Arquivo não encontrado"}), 404
            
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/api/enqueue", methods=["POST"])
def api_enqueue():
    data = request.get_json() or {}
    fileName = data.get("fileName")
    target = data.get("target_token")
    
    # --- DEBUG NOVO ---
    print(f"DEBUG ENQUEUE: Recebi arquivo '{fileName}'")
    print(f"DEBUG ENQUEUE: Token Alvo recebido: '{target}'")
    # ------------------

    filepath = UPLOAD_FOLDER / (fileName or "")
    if not fileName or not filepath.exists():
        return jsonify({"success": False, "message": "Arquivo não encontrado"}), 404
    
    qid = enqueue_file(fileName, filepath, target)
    
    # --- DEBUG NOVO ---
    print(f"DEBUG ENQUEUE: Salvo no banco com ID: {qid}")
    # ------------------
    
    return jsonify({"success": True, "queue_id": qid})

@app.route("/api/queue")
def api_list_queue():
    conn = db.get_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM queue ORDER BY created_at DESC")
    rows = cur.fetchall()
    conn.close()
    return jsonify({"success": True, "queue": [row_to_dict(r) for r in rows]})

# -----------------------
# Endpoints para o plugin OctoPrint
# -----------------------
@app.route("/api/status", methods=["POST"])
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

@app.route("/api/fila")
def api_fila():
    token = request.args.get("token")
    if not token:
        return jsonify({"success": False, "message": "token obrigatório"}), 400
    
    # --- DEBUG ---
    print(f"DEBUG: Impressora com token {token[:5]}... perguntou por trabalho.")
    
    item = pop_next_for_token(token)
    
    if not item:
        # --- DEBUG ---
        print(f"DEBUG: Nenhum trabalho encontrado para este token.")
        return jsonify({"novo_arquivo": False})
    
    # --- DEBUG ---
    print(f"DEBUG: TRABALHO ENCONTRADO! ID: {item['id']}, Arquivo: {item['filename']}")

    mark_queue_status(item["id"], "sent")
    filename = os.path.basename(item["filepath"])
    
    # IMPORTANTE: Garante que a URL usa o IP externo, não localhost
    arquivo_url = request.url_root.rstrip("/") + f"/uploads/{filename}"
    
    print(f"DEBUG: Enviando URL: {arquivo_url}")
    
    return jsonify({
        "novo_arquivo": True,
        "arquivo_url": arquivo_url,
        "queue_id": item["id"],
        "filename": filename
    })

@app.route("/api/queue/confirm", methods=["POST"])
def api_queue_confirm():
    data = request.get_json() or {}
    qid, status = data.get("queue_id"), data.get("status")
    if not qid or not status:
        return jsonify({"success": False, "message": "queue_id e status obrigatórios"}), 400
    mark_queue_status(qid, status)
    return jsonify({"success": True})

@app.route("/uploads/<path:filename>")
def serve_uploads(filename):
    return send_from_directory(str(UPLOAD_FOLDER), filename)

@app.route("/api/register_printer", methods=["POST"])
def api_register_printer():
    data = request.get_json() or {}
    token = data.get("token")
    if not token:
        return jsonify({"success": False, "message": "token obrigatório"}), 400
        
    ip = data.get("ip") or request.remote_addr
    
    # Tenta conectar. Se o token não existir, retorna False.
    authorized = update_printer_connection(token, ip)
    
    if authorized:
        return jsonify({"success": True})
    else:
        return jsonify({"success": False, "message": "Token inválido ou impressora excluída"}), 401

#Deletar Impressora
@app.route("/api/printer/delete/<int:printer_id>", methods=["DELETE"])
def api_delete_printer(printer_id):
    """
    Apaga uma impressora do banco de dados usando o ID dela.
    """
    try:
        conn = db.get_conn()
        cur = conn.cursor()
        
        # Executa o comando DELETE no banco de dados
        cur.execute("DELETE FROM printers WHERE id = ?", (printer_id,))
        
        conn.commit()
        
        # Verifica se algo foi realmente apagado
        if cur.rowcount == 0:
            conn.close()
            return jsonify({"success": False, "message": "Impressora não encontrada"}), 404
            
        conn.close()
        return jsonify({"success": True, "message": "Impressora excluída"})

    except Exception as e:
        # (Opcional: logar o erro "e" no seu servidor)
        return jsonify({"success": False, "message": "Erro interno do servidor"}), 500

# Fazendo proxy com o octprint através do servidor

"""# 1. ROTA DE COMANDOS (Frontend -> Servidor)
@app.route("/api/printer/command", methods=["POST"])
def api_send_command():
    data = request.get_json() or {}
    token = data.get("token")
    cmd = data.get("command") # pause, resume, cancel
    
    if not token or not cmd:
        return jsonify({"success": False, "message": "Dados inválidos"}), 400

    conn = db.get_conn()
    cur = conn.cursor()
    cur.execute("INSERT INTO commands (target_token, command) VALUES (?,?)", (token, cmd))
    conn.commit()
    conn.close()
    
    return jsonify({"success": True, "message": f"Comando {cmd} enviado."})"""

# 2. ROTA PARA O PLUGIN BUSCAR COMANDOS (Plugin -> Servidor)
@app.route("/api/printer/check_commands")
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
@app.route("/api/proxy/webcam/<token>")
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

# -----------------------
# Serve React build
# -----------------------
@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve_react(path):
    index_path = FRONTEND_BUILD / "index.html"
    if index_path.exists():
        return send_from_directory(str(FRONTEND_BUILD), "index.html")
    return jsonify({"message": "API da Fazenda 3D - React não buildado."})

# --- ROTAS DE WEBSOCKET (O Túnel Reverso) ---

# 1. IMPRESSORA SE CONECTA
@socketio.on('printer_connect')
def handle_printer_connect(data):
    token = data.get('token')
    if token:
        # A impressora entra numa sala exclusiva com o nome do token
        join_room(token)
        print(f"WS: Impressora conectada na sala: {token}")
        emit('server_ack', {'status': 'connected'}, to=token)

# 2. SITE (REACT) QUER ASSISTIR
@socketio.on('join_stream')
def handle_join_stream(data):
    token = data.get('token')
    if token:
        # O Frontend entra na sala "stream_TOKEN"
        room_name = f"stream_{token}"
        join_room(room_name)
        
        # Avisa a impressora para começar a mandar vídeo (Economia de banda)
        # Envia apenas para a sala da impressora específica
        emit('start_video', {'fps': 10}, to=token)
        print(f"WS: Cliente assistindo {token}")

# 3. SITE (REACT) PAROU DE ASSISTIR
@socketio.on('leave_stream')
def handle_leave_stream(data):
    token = data.get('token')
    if token:
        room_name = f"stream_{token}"
        leave_room(room_name)
        # Avisa a impressora para parar (Economia de banda)
        emit('stop_video', {}, to=token)

# 4. TUNEL DE VÍDEO (Impressora -> Servidor -> Site)
@socketio.on('video_frame')
def handle_video_frame(data):
    token = data.get('token')
    image_data = data.get('image') # Bytes da imagem
    
    if token and image_data:
        # Repassa imediatamente para quem está na sala de stream
        # broadcast=False garante que vai só para a sala
        room_name = f"stream_{token}"
        emit('render_frame', {'image': image_data}, to=room_name)

# 5. COMANDOS EM TEMPO REAL (Site -> Servidor -> Impressora)
@app.route("/api/printer/command", methods=["POST"])
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

if __name__ == "__main__":
    #app.run(host="0.0.0.0", port=5000, debug=True)
    socketio.run(app, host="0.0.0.0", port=5000, allow_unsafe_werkzeug=True)

