# home.py

import requests
from flask import render_template
from printer_state import get_printer_status  # Importa a função de printer_state.py

# Configurações do OctoPrint
CAMERA_STREAM_URL = "http://192.168.1.8:8080/?action=stream"

def home():
    """
    Exibe a página principal com o feed da câmera e o estado da impressora.
    """
    try:
        # Obter o estado da impressora usando a função get_printer_status
        printer_state = get_printer_status()

        # Renderizar a página HTML
        return render_template(
            'index.html',
            printer_state=printer_state,
            camera_stream_url=CAMERA_STREAM_URL
        )
    except requests.exceptions.RequestException as e:
        # Exibe um erro na página em caso de falha
        return render_template('error.html', error_message=str(e)), 500
