# db.py
import sqlite3
from pathlib import Path

DB_PATH = Path(__file__).parent / "fazenda.db"

def get_conn():
    conn = sqlite3.connect(DB_PATH)
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

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()