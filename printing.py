import requests
from printer_manager import get_all_printers

def upload_file_to_octoprint(printer_ip, api_key, file_path, file_name):
    """
    Faz o upload de um arquivo G-code para o OctoPrint.
    
    Args:
        printer_ip (str): Endereço IP do OctoPrint.
        api_key (str): Chave da API do OctoPrint.
        file_path (str): Caminho completo para o arquivo G-code no sistema.
        file_name (str): Nome do arquivo G-code a ser enviado.

    Returns:
        bool: True se o upload foi bem-sucedido, False caso contrário.
    """
    url = f"http://{printer_ip}:5000/api/files/local"
    headers = {"X-Api-Key": api_key}
    files = {'file': (file_name, open(file_path, 'rb'), 'application/octet-stream')}

    try:
        response = requests.post(url, headers=headers, files=files)
        if response.status_code == 201:
            print("Arquivo carregado com sucesso!")
            return True
        else:
            print(f"Erro ao carregar arquivo: {response.status_code} - {response.text}")
            return False
    except requests.RequestException as e:
        print(f"Erro de comunicação com o OctoPrint: {e}")
        return False


def start_printing_on_printer(printer_ip, file_name, printer_id=None):
    """
    Realiza o upload e inicia a impressão do arquivo em uma impressora específica.
    
    Args:
        printer_ip (str): Endereço IP da impressora.
        file_name (str): Nome do arquivo a ser impresso.
        printer_id (int, opcional): ID da impressora. Se não fornecido, usa o IP.

    Returns:
        bool: True se a impressão foi iniciada com sucesso, False caso contrário.
    """
    # Recupera as informações da impressora
    if printer_id is not None:
        printers = get_all_printers()
        printer = next((printer for printer in printers if printer['id'] == printer_id), None)

        if not printer:
            print(f"Impressora com ID {printer_id} não encontrada no banco de dados.")
            return False

        printer_ip = printer['ip']
        api_key = printer['api_key']
        api_port = printer['port']
    else:
        printers = get_all_printers()
        printer = next((printer for printer in printers if printer['ip'] == printer_ip), None)

        if not printer:
            print(f"Impressora com IP {printer_ip} não encontrada no banco de dados.")
            return False
        
        api_key = printer['api_key']
        api_port = printer['port']

    file_path = f"uploads/{file_name}"  # Caminho completo do arquivo no sistema

    # Passo 1: Fazer upload do arquivo
    if not upload_file_to_octoprint(printer_ip, api_key, file_path, file_name):
        print("Erro ao carregar o arquivo no OctoPrint.")
        return False

    # Passo 2: Selecionar o arquivo para impressão
    api_url = f"http://{printer_ip}:5000/api/files/local/{file_name}"
    headers = {
        "Content-Type": "application/json",
        "X-Api-Key": api_key
    }
    payload = {
        "command": "select",
        "print": True  # Seleciona o arquivo e inicia a impressão
    }

    try:
        response = requests.post(api_url, json=payload, headers=headers)
        if response.status_code == 204:
            print("Impressão iniciada com sucesso!")
            return True
        else:
            print(f"Erro ao iniciar a impressão: {response.status_code} - {response.text}")
            return False
    except requests.RequestException as e:
        print(f"Erro de comunicação com a impressora {printer_ip}: {e}")
        return False

