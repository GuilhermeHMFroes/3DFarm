import eventlet
eventlet.monkey_patch()

from flask import Flask, send_from_directory
from flask_cors import CORS
from extensions import socketio, bcrypt, jwt
from routes import register_blueprints
import db

from pathlib import Path
import os

from utils import key_file # Garante a chave criptográfica para JWT
from datetime import timedelta

# --- CONFIGURAÇÃO DE CAMINHOS DINÂMICOS ---
BASE_DIR = Path(__file__).resolve().parent
UPLOAD_FOLDER = BASE_DIR / "uploads"
UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)

# Lógica de detecção do Frontend
# No PC: ../frontend/dist (ou build) | No Docker: ./static
local_dist = BASE_DIR.parent / "frontend" / "build" # ou "dist", verifique qual o npm gera
docker_dist = BASE_DIR / "static"

if local_dist.exists():
    static_folder_path = str(local_dist)
else:
    static_folder_path = str(docker_dist)

def create_app():

    front = True # Se quiser servir o frontend pelo Flask, mude para True se não, deixe como False e use 'npm start' para rodar o React separadamente (recomendado True para desenvolvimento)

    if front:

        # Configuração de Caminhos para o Frontend
        app = Flask(__name__, static_folder=static_folder_path, static_url_path="/")

        # ROTA PARA SERVIR O FRONTEND REACT
        @app.route("/", defaults={"path": ""})
        @app.route("/<path:path>")
        
        def serve_react(path):
            # 1. Tenta servir arquivos estáticos reais (js, css, imagens)
            if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
                return send_from_directory(app.static_folder, path)
            
            # 2. Bloqueia erro 404 em rotas que deveriam ser da API
            if path.startswith("api/"):
                return {"error": "API Route Not Found"}, 404
            
            # 3. Tudo o mais entrega o index.html para o React Router
            return send_from_directory(app.static_folder, "index.html")

    else:
        app = Flask(__name__)
    
    # Configurações do App
    app.config["JWT_SECRET_KEY"] = key_file()

    #configuração tempo para o jwt
    #app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=7) # deixa o token válido por 7 dias
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = False # token nunca expira

    
    #CORS(app)
    CORS(app, resources={r"/*": {"origins": "*"}})
    db.init_db()
    
    # Inicializa extensões
    socketio.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)

    from services import socket_service  # Importa o serviço de WebSocket para registrar os eventos
    
    # Registra as rotas separadas
    register_blueprints(app)

    @app.route('/uploads/<path:filename>')
    def serve_uploads(filename):
        # Esta rota permite que a impressora baixe o arquivo gcode
        return send_from_directory(str(UPLOAD_FOLDER), filename)
    
    return app

if __name__ == "__main__":
    app = create_app()
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)

    