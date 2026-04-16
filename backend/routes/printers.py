from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required


import db

printers_bp = Blueprint('printers', __name__)

def row_to_dict(row):
    return {k: row[k] for k in row.keys()} if row else None

# Listar Impressoras
@printers_bp.route("/lists")
@jwt_required()
def printers_lists():
    printers = db.get_all_printers()
    return jsonify({"success": True, "printers": [row_to_dict(p) for p in printers]})

# Adicionar Impressora
@printers_bp.route("/add", methods=["POST"])
@jwt_required()
def printers_add():
    data = request.get_json()
    name, ip, token = data.get("name"), data.get("ip"), data.get("token")
    if not name or not token:
        return jsonify({"success": False, "message": "Nome e Token são obrigatórios"}), 400
    try:
        db.create_printer_entry(name, ip, token)
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

# Registrar Impressora (usado pelo plugin para atualizar IP e status) - SEM AUTENTICAÇÃO, pois é chamado pelo plugin externo
@printers_bp.route("/register_printer", methods=["POST"])
@jwt_required()
def printers_register_printer():
    data = request.get_json() or {}
    token = data.get("token")
    if not token:
        return jsonify({"success": False, "message": "token obrigatório"}), 400
        
    ip = data.get("ip") or request.remote_addr
    
    # Tenta conectar. Se o token não existir, retorna False.
    status = data.get("status")
    authorized = db.update_printer_connection(token, ip, status)
    
    if authorized:
        return jsonify({"success": True})
    else:
        return jsonify({"success": False, "message": "Token inválido ou impressora excluída"}), 401

#Deletar Impressora
@printers_bp.route("/delete/<int:printer_id>", methods=["DELETE"])
@jwt_required()
def printers_delete_printer(printer_id):

    if db.delete_printer_by_id(printer_id):
        return jsonify({"success": True, "message": "Impressora excluída"})
    else:
        return jsonify({"success": False, "message": "Impressora não encontrada"}), 404

