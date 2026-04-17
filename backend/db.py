# Configuração e inicialização do banco de dados

import sqlite3
from pathlib import Path
import os

# --- LÓGICA DE CAMINHO DINÂMICO ---
if os.path.exists("/app"):
    # No Docker, usamos a pasta mapeada pelo volume
    DB_PATH = Path("/app/data/fazenda.db")
else:
    # No seu computador, usa a pasta do projeto
    DB_PATH = Path(__file__).parent / "fazenda.db"

# Garante que a pasta pai exista (evita erro de 'Folder not found')
DB_PATH.parent.mkdir(parents=True, exist_ok=True)

def get_conn():
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_conn()
    cur = conn.cursor()

    # 1. Cria a tabela se não existir (para instalações novas)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS printers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        ip TEXT,
        token TEXT UNIQUE,
        last_seen TIMESTAMP,
        last_status TEXT,
        webcam_url TEXT  -- Adicionado aqui para novos bancos
    )
    """)

    # 2. Atualiza tabelas antigas (Migration Automática)
    # Tenta adicionar a coluna 'webcam_url' em bancos que já existem
    try:
        cur.execute("ALTER TABLE printers ADD COLUMN webcam_url TEXT")
        print("MIGRATION: Coluna 'webcam_url' adicionada com sucesso!")
    except sqlite3.OperationalError:
        # Se der erro, é porque a coluna já existe. Ignoramos.
        pass

    # fila de impressão
    cur.execute("""
    CREATE TABLE IF NOT EXISTS queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        target_token TEXT,
        status TEXT NOT NULL DEFAULT 'queued',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Tabela de Comandos de Controle
    cur.execute("""
    CREATE TABLE IF NOT EXISTS commands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        target_token TEXT NOT NULL,
        command TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Tabela de Usuários
    cur.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    conn.commit()
    conn.close()

# Funções de Acesso ao Banco de Dados do Dashboard

def get_all_queue():

    """Retorna todos os itens da fila ordenados pela data."""

    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT * FROM queue ORDER BY created_at DESC")
    rows = cur.fetchall()
    conn.close()
    return rows

def enqueue_file(filename, filepath, target_token=None):

    """Insere um novo arquivo na fila de impressão."""

    conn = get_conn()
    cur = conn.cursor()
    cur.execute("""INSERT INTO queue (filename, filepath, target_token, status)
                   VALUES (?, ?, ?, 'queued')""",
                (filename, str(filepath), target_token))
    conn.commit()
    inserted_id = cur.lastrowid
    conn.close()
    return inserted_id

def delete_queue_item(qid):

    """Remove um item da fila."""

    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM queue WHERE id = ?", (qid,))
    conn.commit()
    conn.close()

# Funções para gerenciamento de usuários

def get_user_by_username(username):
    conn = get_conn()
    cur = conn.cursor()
    user = cur.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()
    return user

def get_admin_count():
    conn = get_conn()
    cur = conn.cursor()
    count = cur.execute("SELECT COUNT(*) as total FROM users WHERE role = 'admin'").fetchone()
    conn.close()
    return count['total']

def create_user(username, hashed_password, role='user'):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
        (username, hashed_password, role)
    )
    conn.commit()
    conn.close()

def update_user_password(username, new_hashed_password):
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("UPDATE users SET password = ? WHERE username = ?", (new_hashed_password, username))
    conn.commit()
    conn.close()

def get_all_users():
    """Retorna a lista de todos os usuários (sem a senha)."""
    conn = get_conn()
    cur = conn.cursor()
    users = cur.execute("SELECT id, username, role FROM users").fetchall()
    conn.close()
    return users

def delete_user_by_id(user_id):
    """Exclui um usuário do banco pelo ID."""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return True

# Funções para Gerenciamento de Impressoras

def get_all_printers():
    """Retorna todas as impressoras cadastradas."""
    conn = get_conn()
    cur = conn.cursor()
    printers = cur.execute("SELECT * FROM printers").fetchall()
    conn.close()
    return printers

def create_printer_entry(name, ip, token): # Função atambém usada em api.py
    """Cria uma nova impressora no banco."""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO printers (name, ip, token, last_status) VALUES (?, ?, ?, ?)",
        (name, ip, token, "offline")
    )
    conn.commit()
    conn.close()

def update_printer_connection(token, ip, last_status=None):
    """Atualiza o status e IP da impressora via Token (usado pelo plugin)."""
    conn = get_conn()
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
    """, (ip, last_status or "online", token))
    
    conn.commit()
    conn.close()
    return True

def delete_printer_by_id(printer_id):
    """Remove uma impressora do banco pelo ID."""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM printers WHERE id = ?", (printer_id,))
    success = cur.rowcount > 0
    conn.commit()
    conn.close()
    return success

# API

def add_printer_command(token, command):
    """Registra um comando para ser enviado à impressora."""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("INSERT INTO commands (target_token, command) VALUES (?,?)", (token, command))
    conn.commit()
    conn.close()

def mark_queue_status(qid, status):
    """Atualiza o status de um item na fila (ex: 'printing', 'finished')."""
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("UPDATE queue SET status=? WHERE id=?", (status, qid))
    conn.commit()
    conn.close()

def update_printer_connection(token, ip, last_status=None):
    conn = get_conn()
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

def get_next_queued_item(token):
    """Busca o próximo arquivo na fila para um token específico."""
    conn = get_conn()
    cur = conn.cursor()
    row = cur.execute("""
        SELECT * FROM queue 
        WHERE status='queued' AND target_token=? 
        ORDER BY created_at LIMIT 1
    """, (token,)).fetchone()
    conn.close()
    return row

def get_printer_by_token(token):
    """Busca os dados de uma impressora específica pelo token."""
    conn = get_conn()
    cur = conn.cursor()
    printer = cur.execute("SELECT * FROM printers WHERE token = ?", (token,)).fetchone()
    conn.close()
    return printer

def get_and_delete_command(token):
    """Busca o comando mais antigo e o remove (Polling)."""
    conn = get_conn()
    cur = conn.cursor()
    cmd = cur.execute("SELECT * FROM commands WHERE target_token=? ORDER BY created_at LIMIT 1", (token,)).fetchone()
    if cmd:
        cur.execute("DELETE FROM commands WHERE id=?", (cmd['id'],))
        conn.commit()
    conn.close()
    return cmd

def get_next_queued_for_token(token):
    """Busca o próximo item da fila e o marca como 'sent'."""
    conn = get_conn()
    # Usamos o row_factory para facilitar o retorno como dicionário
    conn.row_factory = sqlite3.Row 
    cur = conn.cursor()
    
    row = cur.execute("""
        SELECT id, filename, filepath 
        FROM queue 
        WHERE target_token = ? AND status = 'queued' 
        ORDER BY id ASC LIMIT 1
    """, (token,)).fetchone()

    item = None
    if row:
        item = dict(row)
        # Atualiza o status para 'sent' (enviado)
        cur.execute("UPDATE queue SET status='sent' WHERE id=?", (item["id"],))
        conn.commit()
        
    conn.close()
    return item

def get_printer_webcam_info(token):
    """Busca IP e URL da webcam de uma impressora pelo token."""
    conn = get_conn()
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    row = cur.execute("SELECT ip, webcam_url FROM printers WHERE token = ?", (token,)).fetchone()
    conn.close()
    return dict(row) if row else None

if __name__ == "__main__":
    init_db()