# printer_state.py
import requests

# Configurações do OctoPrint
OCTOPRINT_URL = "http://192.168.1.8:5000"  # URL do OctoPrint
APPLICATION_KEY = "d9uxG2QTwj86Ugjc8ivcDWKO_Ho0vm5UinAo_s0IpXA"
headers = {
    "X-Api-Key": APPLICATION_KEY
}

def get_printer_status():
    """
    Obtém o estado atual da impressora a partir da API do OctoPrint.
    """
    try:
        printer_url = f"{OCTOPRINT_URL}/api/printer"
        response = requests.get(printer_url, headers=headers)
        response.raise_for_status()  # Verifica se houve erro na requisição
        return response.json()  # Retorna a resposta da API como um dicionário JSON
    except requests.exceptions.RequestException as e:
        # Se houver um erro, retorna um dicionário com a mensagem de erro
        return {"error": str(e)}
