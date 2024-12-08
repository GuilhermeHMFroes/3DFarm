import requests
from printer_manager import get_all_printers

def start_printing_on_printer(printer_ip, file_name, printer_id=None):
    """
    Inicia a impressão do arquivo em uma impressora específica.
    
    Args:
        printer_ip (str): O endereço IP da impressora.
        file_name (str): O nome do arquivo a ser impresso.
        printer_id (int, opcional): O ID da impressora a ser usada. Se não fornecido, usa o IP.
    
    Returns:
        bool: True se a impressão foi iniciada com sucesso, False caso contrário.
    """
    # Se o printer_id não for fornecido, usa o IP para identificar a impressora
    if printer_id is not None:
        # Recupera todas as impressoras do banco de dados
        printers = get_all_printers()

        # Busca a impressora com o ID correspondente
        printer = next((printer for printer in printers if printer['id'] == printer_id), None)

        if not printer:
            print(f"Impressora com ID {printer_id} não encontrada no banco de dados.")
            return False

        printer_ip = printer['ip']
        api_key = printer['api_key']
        api_port = printer['port']
    else:
        # Busque a impressora com o IP fornecido no banco de dados
        printers = get_all_printers()
        printer = next((printer for printer in printers if printer['ip'] == printer_ip), None)

        if not printer:
            print(f"Impressora com IP {printer_ip} não encontrada no banco de dados.")
            return False
        
        api_key = printer['api_key']
        api_port = printer['port']

    print(f'\n\n Api: {api_key}\n\n')

    # Verifica se o arquivo está carregado corretamente
    response = requests.get(f"http://{printer_ip}:5000/api/files/local/{file_name}", headers={"X-Api-Key": api_key})
    if response.status_code != 200:
        print(f"Erro ao acessar o arquivo: {response.status_code} - {response.text}")
        return False

    # Construa a URL da API da impressora
    api_url = f"http://{printer_ip}:5000/api/files/local/{file_name}"

    headers = {
        "Content-Type": "application/json",
        "X-Api-Key": api_key
    }

    # Seleciona o arquivo para impressão
    payload = {
        "command": "select",
        "print": True  # Seleciona o arquivo e inicia a impressão
    }

    try:
        response = requests.post(api_url, json=payload, headers=headers)
        if response.status_code == 204:
            print(f"Arquivo selecionado com sucesso na impressora {printer_ip}. Iniciando a impressão...")

            # Verifique o status da impressora
            status_response = requests.get(f"http://{printer_ip}:5000/api/printer", headers={"X-Api-Key": api_key})
            status = status_response.json()
            if status["state"]["text"] != "Operational":
                print(f"A impressora não está pronta. Status: {status['state']['text']}")
                return False

            # Envia o comando para iniciar a impressão
            start_payload = {
                "command": "start"
            }
            start_response = requests.post(f"http://{printer_ip}:5000/api/printer/print", json=start_payload, headers=headers)
            if start_response.status_code == 204:
                print("Impressão iniciada com sucesso!")
                return True
            else:
                print(f"Erro ao iniciar a impressão: {start_response.status_code} - {start_response.text}")
                return False
        else:
            print(f"Erro ao selecionar o arquivo para impressão: {response.status_code} - {response.text}")
            return False
    except requests.RequestException as e:
        print(f"Erro de comunicação com a impressora {printer_ip}: {str(e)}")
        return False
