import requests
import sqlite3

# Função para obter a lista de impressoras do banco de dados
def get_printers_from_db():
    conn = sqlite3.connect('printers.db')
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM printers')
    printers = cursor.fetchall()
    conn.close()
    return printers

# Função para obter o estado da impressora a partir da API do OctoPrint
def get_printer_status(ip, api_key):
    """
    Obtém o estado atual da impressora a partir da API do OctoPrint.
    """
    try:
        # Defina a URL da API da impressora, que vai utilizar o IP e a API key
        url = f"http://{ip}:5000/api/printer"
        headers = {"X-Api-Key": api_key}
        
        # Faz a requisição para a API do OctoPrint
        response = requests.get(url, headers=headers)
        response.raise_for_status()  # Levanta uma exceção se o status for diferente de 200
        
        # Retorna a resposta JSON
        return response.json()
    
    except requests.exceptions.RequestException as e:
        # Se ocorrer um erro, loga o erro
        print(f"Erro ao acessar a impressora {ip}: {str(e)}")
        # Caso o erro seja 409, tratamos como desconectado
        if e.response and e.response.status_code == 409:
            return {"error": f"Conflito ao acessar a impressora {ip}: {str(e)}"}
        # Retorna um dicionário com uma mensagem de erro para outros tipos de falha
        return {"error": f"Erro ao acessar a impressora {ip}: {str(e)}"}

def get_all_printer_statuses():
    printers = get_printers_from_db()  # Obtém todas as impressoras do banco
    printer_statuses = []
    disconnected_printers = []  # Lista para armazenar as impressoras desconectadas

    for printer in printers:
        ip = printer[1]  # Coluna IP
        api_key = printer[2]  # Coluna API Key
        webcam_port = printer[4]  # Coluna Porta da Webcam
        nome = printer[5] # Nome

        # Obtém o estado da impressora usando a API
        status = get_printer_status(ip, api_key)

        # Se ocorrer um erro, a resposta terá a chave 'error'
        if "error" in status:
            print(f"Impressora {ip} desconectada ou com erro: {status['error']}")
            # Adiciona a impressora à lista de desconectadas
            disconnected_printers.append({
                "ip": ip,
                "error": status["error"]
            })
            # Ignora impressoras com erro
            continue
        
        # Verificar se a chave 'state' e 'text' existem antes de acessá-las
        if "state" not in status or "text" not in status["state"]:
            status["state"] = {"state": {"text": "Desconectado"}}

        # Adiciona a impressora com seu status atualizado
        printer_statuses.append({
            "printer": {
                "id": printer[0],
                "ip": ip,
                "api_key": api_key,
                "port": printer[3],
                "webcam_port": webcam_port,
                "nome": nome,
            },
            "state": status
        })

    return printer_statuses, disconnected_printers
