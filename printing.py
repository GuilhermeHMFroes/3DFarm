import requests

def start_printing_on_printer(file_name, ip):
    """
    Função que inicia a impressão no servidor de impressora específico.
    Você deve implementar a lógica para enviar o arquivo GCode para a impressora via API.
    """
    # Exemplo de código para enviar o comando de impressão (ajuste conforme sua implementação)
    printer_api_url = f"http://{ip}/api/print"
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {get_printer_api_key(ip)}'  # Obtenha a chave da impressora
    }
    data = {
        "file": file_name
    }

    try:
        response = requests.post(printer_api_url, json=data, headers=headers)
        return response.status_code == 200
    except Exception as e:
        print(f"Erro ao iniciar impressão: {e}")
        return False