# Instâncias globais (SocketIO, JWT, Bcrypt)

from flask_socketio import SocketIO
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager

# Instâncias globais
socketio = SocketIO(cors_allowed_origins="*", async_mode='eventlet', max_http_buffer_size=5 * 1280 * 720)
bcrypt = Bcrypt()
jwt = JWTManager()