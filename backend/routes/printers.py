from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

from pathlib import Path

import db

printers_bp = Blueprint('printers', __name__)

@printers_bp.route("/lists")
def printers_lists():
    conn = db.get_conn()
    cur = conn.cursor()
    cur.execute("SELECT id,name,ip,token,last_seen,last_status FROM printers ORDER BY id")
    rows = cur.fetchall()
    conn.close()
    return jsonify({"success": True, "printers": [row_to_dict(r) for r in rows]})

@printers_bp.route("/register_printer", methods=["POST"])
def printers_register_printer():
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
@printers_bp.route("/delete/<int:printer_id>", methods=["DELETE"])
def printers_delete_printer(printer_id):
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
