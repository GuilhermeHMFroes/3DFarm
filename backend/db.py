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

    # tabela de impressoras registradas
    cur.execute("""
    CREATE TABLE IF NOT EXISTS printers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        ip TEXT,
        token TEXT UNIQUE,
        last_seen TIMESTAMP,
        last_status TEXT
    )
    """)

    # fila de impressão
    cur.execute("""
    CREATE TABLE IF NOT EXISTS queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        target_token TEXT, -- se null, pode ser processado por qualquer impressora autorizada
        status TEXT NOT NULL DEFAULT 'queued', -- queued, sent, printing, done, error
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    init_db()
