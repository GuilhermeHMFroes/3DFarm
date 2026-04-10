
from extensions import socketio
from flask_socketio import emit, join_room, leave_room
from flask import request

# --- ROTAS DE WEBSOCKET (O Túnel Reverso) ---

# 1. IMPRESSORA SE CONECTA
@socketio.on('printer_connect')
def handle_printer_connect(data):
    token = data.get('token')
    if token:
        # A impressora entra numa sala exclusiva com o nome do token
        join_room(token)
        print(f"DEBUG SALA: Impressora {token} entrou na sala. ID do Socket: {request.sid}")
        emit('server_ack', {'status': 'connected'}, room=token)

# 2. SITE (REACT) QUER ASSISTIR
@socketio.on('join_stream')
def on_join(data):
    token = data.get('token')
    if token:
        # O React entra na sala de vídeo
        room_name = f"stream_{token}"
        join_room(room_name)
        
        # IMPORTANTE: Envia o comando para a impressora (que está na sala 'token')
        # Adicione o namespace='/' explicitamente se necessário
        emit('start_video', {'data': 'iniciar'}, to=token) 
        
        print(f"DEBUG: Utilizador pediu vídeo. Sala: {room_name}. Avisando impressora: {token}")

# 3. SITE (REACT) PAROU DE ASSISTIR
@socketio.on('leave_stream')
def handle_leave_stream(data):
    token = data.get('token')
    if token:
        room_name = f"stream_{token}"
        leave_room(room_name)
        # Avisa a impressora para parar (Economia de banda)
        emit('stop_video', {}, to=token)

# 4. TUNEL DE VÍDEO (Impressora -> Servidor -> Site)

@socketio.on('video_frame')
def handle_video_frame(data):
    token = data.get('token')
    image_data = data.get('image')
    
    if token and image_data:
        # Envia apenas para quem está na sala de stream
        emit('render_frame', {'image': image_data}, to=f"stream_{token}")

