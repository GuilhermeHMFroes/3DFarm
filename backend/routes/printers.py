from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

from datetime import datetime
import json
import db

printers_bp = Blueprint('printers', __name__)

def row_to_dict(row):
    return {k: row[k] for k in row.keys()} if row else None

# Listar Impressoras e atualizar status de conexão (Idle, Printing, Disconnected)
@printers_bp.route("/lists")
@jwt_required()
def printers_lists():
    # 1. Busca as impressoras e as configurações de tempo
    printers_raw = db.get_all_printers()
    settings = db.get_all_settings()
    
    # Tempo do banco (convertido de minutos para segundos)
    try:
        timeout_limit = float(settings.get('inactivity_time', 2.0))
        print(f"Timeout configurado para {timeout_limit} segundos")
    except:
        timeout_limit = 120 # 2 minutos padrão

    now = datetime.utcnow() # SQLite usa UTC
    printers_ready = []

    for p in printers_raw:
        p_dict = row_to_dict(p)
        
        # --- LÓGICA QUE ESTAVA NO APP.JS AGORA AQUI ---
        
        # 1. Verifica Inatividade
        is_disconnected = True
        if p_dict.get('last_seen'):
            last_seen_dt = datetime.strptime(p_dict['last_seen'], '%Y-%m-%d %H:%M:%S')
            if (now - last_seen_dt).total_seconds() < timeout_limit:
                is_disconnected = False

        if is_disconnected:
            p_dict['condition'] = 'disconnected'
        else:
            # 2. Verifica Status (Printing vs Idle)
            try:
                status_data = json.loads(p_dict.get('last_status', '{}'))
                state = status_data.get('estado', '').upper()
                
                active_states = ["PRINTING", "PAUSED", "PAUSING", "RESUMING", "FINISHING"]
                if state in active_states:
                    p_dict['condition'] = 'active'
                else:
                    p_dict['condition'] = 'idle'
            except:
                p_dict['condition'] = 'idle'

        printers_ready.append(p_dict)
    
    return jsonify({"success": True, "printers": printers_ready})

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

