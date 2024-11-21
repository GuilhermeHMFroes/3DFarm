from flask import Flask, jsonify, request
from home import home  # Importa a função home do arquivo home.py
from printer_state import get_printer_status  # Importa a função get_printer_status
from database import create_tables, add_printer, get_printers

app = Flask(__name__)

# Cria as tabelas no banco de dados quando o app iniciar
create_tables()

@app.route('/')
def home_route():
    return home()  # Não passa argumentos para a função home

@app.route('/printer_state', methods=['GET'])
def printer_state_route():
    printer_status = get_printer_status()
    if "error" in printer_status:
        return jsonify({"error": printer_status["error"], "details": printer_status}), 500
    return jsonify(printer_status)

@app.route('/add_printer', methods=['POST'])
def add_printer_route():
    """Rota para adicionar uma nova impressora"""
    ip = request.form['ip']
    port = request.form['port']
    webcam_port = request.form['webcam']
    api_key = request.form['API']
    nome = request.form['nome']

    # Adiciona a impressora no banco de dados
    add_printer(ip, api_key, port, webcam_port, nome)

    return jsonify({"message": "Impressora adicionada com sucesso!"})

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
