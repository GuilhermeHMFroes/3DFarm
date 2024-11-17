#chave api: d9uxG2QTwj86Ugjc8ivcDWKO_Ho0vm5UinAo_s0IpXA

# app.py
from flask import Flask, jsonify

from home import home  # Importa a função home do arquivo home.py
from printer_state import get_printer_status  # Importa a função get_printer_status

app = Flask(__name__)

@app.route('/', methods=['GET'])
def home_route():
    return home()  # Chama a função home do arquivo home.py

@app.route('/printer_state', methods=['GET'])
def printer_state_route():
    """
    Retorna o estado da impressora como JSON para ser consumido pelo JavaScript.
    """
    printer_status = get_printer_status()  # Obtém o estado da impressora

    if "error" in printer_status:
        return jsonify({"error": printer_status["error"]}), 500

    return jsonify(printer_status)


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)

