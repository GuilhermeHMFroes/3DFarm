import os
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import db
from utils import generate_token
import json
import sqlite3

# Caminhos
BASE_DIR = Path(__file__).resolve().parent
UPLOAD_FOLDER = BASE_DIR / "uploads"
UPLOAD_FOLDER.mkdir(exist_ok=True)

# Se o React estiver buildado em frontend/build:
FRONTEND_BUILD = BASE_DIR / ".." / "frontend" / "build"

# Flask app: aponta para o build do React
app = Flask(__name__, static_folder=str(FRONTEND_BUILD), static_url_path="/")
CORS(app)

# Inicializa DB
db.init_db()

# -----------------------
# Helpers DB
# -----------------------
def row_to_dict(row):
    return {k: row[k] for k in row.keys()} if row else None

def register_or_update_printer(name, ip, token):
    conn = db.get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id FROM printers WHERE token = ?", (token,))
    if cur.fetchone():
        cur.execute("""UPDATE printers
                       SET name=?, ip=?, last_seen=CURRENT_TIMESTAMP
                       WHERE token=?""", (name, ip, token))
    else:
        cur.execute("INSERT INTO printers (name, ip, token) VALUES (?,?,?)",
                    (name, ip, token))
    conn.commit()
    conn.close()

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
    token = generate_token()
    register_or_update_printer(name, ip, token)
    return jsonify({"success": True, "token": token})

@app.route("/api/printers")
def api_list_printers():
    conn = db.get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id,name,ip,token,last_seen,last_status FROM printers ORDER BY id")
    rows = cur.fetchall()
    conn.close()
    return jsonify({"success": True, "printers": [row_to_dict(r) for r in rows]})

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

@app.route("/api/enqueue", methods=["POST"])
def api_enqueue():
    data = request.get_json() or {}
    fileName = data.get("fileName")
    target = data.get("target_token")
    filepath = UPLOAD_FOLDER / (fileName or "")
    if not fileName or not filepath.exists():
        return jsonify({"success": False, "message": "Arquivo não encontrado"}), 404
    qid = enqueue_file(fileName, filepath, target)
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
    register_or_update_printer(data.get("nome_impressora"), ip, token)
    conn = db.get_conn()
    cur = conn.cursor()
    cur.execute("UPDATE printers SET last_seen=CURRENT_TIMESTAMP, last_status=? WHERE token=?",
                (json.dumps(data), token))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

@app.route("/api/fila")
def api_fila():
    token = request.args.get("token")
    if not token:
        return jsonify({"success": False, "message": "token obrigatório"}), 400
    item = pop_next_for_token(token)
    if not item:
        return jsonify({"novo_arquivo": False})
    mark_queue_status(item["id"], "sent")
    filename = os.path.basename(item["filepath"])
    arquivo_url = request.url_root.rstrip("/") + f"/uploads/{filename}"
    return jsonify({"novo_arquivo": True,
                    "arquivo_url": arquivo_url,
                    "queue_id": item["id"],
                    "filename": filename})

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
    register_or_update_printer(data.get("nome_impressora"), ip, token)
    return jsonify({"success": True})

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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
