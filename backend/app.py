import eventlet
eventlet.monkey_patch()

from flask import Flask, send_from_directory
from flask_cors import CORS
from extensions import socketio, bcrypt, jwt
from routes import register_blueprints
import db

from pathlib import Path

# Configuração de Caminhos para o Frontend
BASE_DIR = Path(__file__).resolve().parent
FRONTEND_BUILD = BASE_DIR / ".." / "frontend" / "build"

# Caminhos
BASE_DIR = Path(__file__).resolve().parent
UPLOAD_FOLDER = BASE_DIR / "uploads"

UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)

def create_app():
    app = Flask(__name__, static_folder=str(FRONTEND_BUILD), static_url_path="/")
    
    # Configurações do App
    app.config["JWT_SECRET_KEY"] = "l~fdE;,iQcD8xAx-<95JI8c#7Em)1O" # Chave secreta para JWT , deve ser mudada quando for para produção
    
    CORS(app)
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

    # ROTA PARA SERVIR O FRONTEND REACT
    @app.route("/", defaults={"path": ""})
    @app.route("/<path:path>")
    def serve_react(path):
        # Se o caminho solicitado existe na pasta build (ex: imagens, js), serve o arquivo
        if path != "" and (FRONTEND_BUILD / path).exists():
            return send_from_directory(str(FRONTEND_BUILD), path)
        # Caso contrário (rotas do React Router), serve o index.html
        else:
            return send_from_directory(str(FRONTEND_BUILD), "index.html")
    
    return app

if __name__ == "__main__":
    app = create_app()
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)