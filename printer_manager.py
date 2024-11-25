import sqlite3

# Função para adicionar uma impressora ao banco de dados
def add_printer(ip, api_key, port, webcam_port, nome):
    conn = sqlite3.connect('printers.db')
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO printers (ip, api_key, port, webcam_port, nome)
        VALUES (?, ?, ?, ?, ?)
    ''', (ip, api_key, port, webcam_port, nome))
    conn.commit()
    conn.close()

# Função para obter todas as impressoras
def get_all_printers():
    conn = sqlite3.connect('printers.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM printers')
    printers = cursor.fetchall()
    conn.close()

    printers_list = []
    for printer in printers:
        printer_dict = {
            'id': printer[0],
            'ip': printer[1],
            'api_key': printer[2],
            'port': printer[3],
            'webcam_port': printer[4],
            'nome': printer[5]
        }
        printers_list.append(printer_dict)

    return printers_list

# Função para remover uma impressora
def remove_printer(ip):
    conn = sqlite3.connect('printers.db')
    cursor = conn.cursor()
    cursor.execute('DELETE FROM printers WHERE ip = ?', (ip,))
    conn.commit()
    conn.close()

# Função para atualizar uma impressora
def update_printer(ip, api_key, port, webcam_port, nome):
    conn = sqlite3.connect('printers.db')
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE printers
        SET api_key = ?, port = ?, webcam_port = ?, nome = ?
        WHERE ip = ?
    ''', (api_key, port, webcam_port, nome, ip))
    conn.commit()
    conn.close()

