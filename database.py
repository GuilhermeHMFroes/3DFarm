import sqlite3

DATABASE = 'printers.db'

def create_tables():
    """
    Cria as tabelas no banco de dados, ou atualiza a estrutura existente se necessário.
    """
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    # Verifica se a tabela já existe e ajusta a estrutura
    cursor.execute("PRAGMA table_info(printers)")
    columns = cursor.fetchall()

    # Se a tabela já existe e o tipo de webcam_port não é TEXT, atualiza a estrutura
    if columns and not any(col[1] == 'webcam_port' and col[2] == 'TEXT' for col in columns):
        print("Atualizando a estrutura da tabela 'printers'...")

        # Cria uma nova tabela com a estrutura desejada
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS printers_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip TEXT NOT NULL,
            api_key TEXT NOT NULL,
            port INTEGER NOT NULL,
            webcam_port TEXT NOT NULL,
            nome TEXT NOT NULL
        )
        ''')

        # Migra os dados da tabela antiga para a nova
        cursor.execute('INSERT INTO printers_new (id, ip, api_key, port, webcam_port, nome) SELECT id, ip, api_key, port, webcam_port, nome FROM printers')
        conn.commit()

        # Remove a tabela antiga e renomeia a nova tabela
        cursor.execute('DROP TABLE printers')
        cursor.execute('ALTER TABLE printers_new RENAME TO printers')
        conn.commit()

        print("Estrutura da tabela 'printers' atualizada com sucesso.")

    else:
        # Cria a tabela, se ela ainda não existir
        cursor.execute('''
        CREATE TABLE IF NOT EXISTS printers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ip TEXT NOT NULL,
            api_key TEXT NOT NULL,
            port INTEGER NOT NULL,
            webcam_port TEXT NOT NULL,
            nome TEXT NOT NULL
        )
        ''')
        conn.commit()

    conn.close()

def add_printer(ip, api_key, port, webcam_port, nome):
    """Adiciona uma nova impressora ao banco de dados"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute('''
    INSERT INTO printers (ip, api_key, port, webcam_port, nome) 
    VALUES (?, ?, ?, ?, ?)
    ''', (ip, api_key, port, webcam_port, nome))

    conn.commit()
    conn.close()

def get_printers():
    """Retorna todas as impressoras cadastradas no banco de dados"""
    conn = sqlite3.connect(DATABASE)
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM printers')
    printers = cursor.fetchall()

    conn.close()

    print(f"Impressoras recuperadas do banco de dados: {printers}")
    return printers
