from flask import Flask, jsonify, request, render_template
from home import home  # Importa a função home do arquivo home.py
from printer_state import get_all_printer_statuses, get_printer_status # Status das impressoras
from database import create_tables
from printer_manager import get_all_printers, add_printer, remove_printer, update_printer # Gerenciador de Imprpessoras
from upload import handle_file_upload  # Importa a função de upload
import os

app = Flask(__name__)

# Cria as tabelas no banco de dados ao iniciar a aplicação
create_tables()

@app.route('/')
def home_route():
    """Rota inicial."""
    return home()

@app.route('/get_all_printer_statuses', methods=['GET'])
def get_all_printer_statuses_route():
    """Rota para obter o estado de todas as impressoras."""
    printer_statuses, disconnected_printers = get_all_printer_statuses()
    return jsonify({
        "printer_states": printer_statuses,
        "disconnected_printers": disconnected_printers
    })

@app.route('/printer_state', methods=['GET'])
def printer_state_route():
    ip = request.args.get('ip')
    api_key = request.args.get('api_key')

    if not ip or not api_key:
        return jsonify({"error": "Os parâmetros 'ip' e 'api_key' são obrigatórios."}), 400

    printer_status = get_printer_status(ip, api_key)

    if "error" in printer_status:
        return jsonify({"error": printer_status["error"], "details": printer_status}), 500

    return jsonify(printer_status)

@app.route('/adicionaimpressora', methods=['GET'])
def adiciona_impressora():
    """Rota para carregar o template de adicionar impressora."""
    return render_template('adicionaimpressora.html')

@app.route('/add_printer', methods=['POST'])
def add_printer_route():
    """Rota para adicionar uma nova impressora."""
    ip = request.form['ip']
    port = request.form['port']
    webcam_port = request.form['webcam']
    api_key = request.form['API']
    nome = request.form['nome']

    success = add_printer(ip, api_key, port, webcam_port, nome)

    if success:
        return jsonify({"message": "Impressora adicionada com sucesso!"})
    return jsonify({"message": "Erro ao adicionar impressora."}), 500


@app.route('/manage_printers', methods=['GET'])
def manage_printers_route():
    """Rota para carregar o template de gerenciamento de impressoras."""
    printers = get_all_printers()
    return render_template('manage_printers.html', printers=printers)

@app.route('/remove_printer', methods=['POST'])
def remove_printer_route():
    """Rota para remover uma impressora."""
    data = request.get_json()
    ip = data.get("ip")

    if not ip:
        return jsonify({"error": "Parâmetro 'ip' é obrigatório."}), 400

    remove_printer(ip)

    return jsonify({"message": "Impressora removida com sucesso!"})

@app.route('/update_printer', methods=['POST'])
def update_printer_route():
    """Rota para atualizar informações de uma impressora."""
    data = request.get_json()
    ip = data.get("ip")
    api_key = data.get("api_key")
    port = data.get("port")
    webcam_port = data.get("webcam_port")
    nome = data.get("nome")

    if not ip:
        return jsonify({"error": "Parâmetro 'ip' é obrigatório."}), 400

    update_printer(ip, api_key, port, webcam_port, nome)

    return jsonify({"message": "Impressora atualizada com sucesso!"})

# Rota para upload de arquivos
@app.route('/upload', methods=['POST'])
def upload_file():
    """Rota para realizar o upload do arquivo."""
    return handle_file_upload()


@app.route('/list_files', methods=['GET'])
def list_files():
    try:
        files = os.listdir("uploads/")
        print(files)
        return jsonify({"success": True, "files": files})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)})



@app.route('/delete_file', methods=['POST'])
def delete_file():
    """Rota para excluir um arquivo."""
    data = request.get_json()
    file_name = data.get('fileName')
    
    if not file_name:
        return jsonify({"success": False, "message": "Arquivo não especificado"}), 400

    file_path = os.path.join('uploads/', file_name)
    
    if os.path.exists(file_path):
        try:
            print(f"Excluindo arquivo: {file_path}")  # Log de depuração
            os.remove(file_path)
            return jsonify({"success": True, "message": f"Arquivo {file_name} excluído com sucesso!"})
        except Exception as e:
            return jsonify({"success": False, "message": f"Erro ao excluir arquivo: {str(e)}"}), 500
    else:
        return jsonify({"success": False, "message": "Arquivo não encontrado"}), 404


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
