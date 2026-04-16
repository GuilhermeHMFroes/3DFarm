from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
import os
from pathlib import Path

import db

from utils import generate_token



def row_to_dict(row):
    return {k: row[k] for k in row.keys()} if row else None

dashboard_bp = Blueprint('dashboard', __name__)

UPLOAD_FOLDER = Path(__file__).parent.parent / "uploads"

UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)

# Arquivos .gcode

@dashboard_bp.route("/files")
@jwt_required()
def dashboard_files():

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

@dashboard_bp.route("/upload", methods=["POST"])
@jwt_required()
def dashboard_upload_file():

    """Recebe um arquivo via multipart/form-data e salva na pasta uploads"""

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

@dashboard_bp.route("/files/<filename>", methods=["DELETE"])
@jwt_required()
def dashboard_delete_file(filename):

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

@dashboard_bp.route("/enqueue", methods=["POST"])
@jwt_required()
def dashboard_enqueue():

    """Adiciona um arquivo à fila de impressão, opcionalmente direcionado a uma impressora específica via token"""

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
    
    qid = db.enqueue_file(fileName, filepath, target)
    
    # --- DEBUG NOVO ---
    print(f"DEBUG ENQUEUE: Salvo no banco com ID: {qid}")
    # ------------------
    
    return jsonify({"success": True, "queue_id": qid})


#====================================================================================================

@dashboard_bp.route("/queue")
@jwt_required()
def dashboard_list_queue():
    # CHAMADA CENTRALIZADA NO DB.PY
    rows = db.get_all_queue()
    
    queue_list = [row_to_dict(r) for r in rows]
    return jsonify({"success": True, "queue": queue_list})

@dashboard_bp.route("/queue/delete/<int:qid>", methods=["DELETE"])
@jwt_required()
def dashboard_delete_queue(qid):
    # CHAMADA CENTRALIZADA NO DB.PY
    db.delete_queue_item(qid)
    return jsonify({"success": True})
