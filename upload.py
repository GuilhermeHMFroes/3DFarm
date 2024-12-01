import os
from flask import request, jsonify

# Defina o diretório onde os arquivos serão salvos
UPLOAD_FOLDER = 'uploads'

# Verifica se o diretório de upload existe, senão cria
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def handle_file_upload():
    if 'file' not in request.files:
        return jsonify({"success": False, "message": "Nenhum arquivo enviado"}), 400

    file = request.files['file']
    
    if file.filename == '':
        return jsonify({"success": False, "message": "Nenhum arquivo selecionado"}), 400

    # Salve o arquivo no diretório especificado
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    return jsonify({"success": True, "fileName": file.filename, "filePath": file_path})
