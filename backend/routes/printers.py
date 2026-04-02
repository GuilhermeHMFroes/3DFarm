from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required

from pathlib import Path

import db

printers_bp = Blueprint('printers', __name__)

def row_to_dict(row):
    return {k: row[k] for k in row.keys()} if row else None


#====================================================================================================


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


#====================================================================================================


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
