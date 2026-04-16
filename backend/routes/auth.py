from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, create_access_token, jwt_required, get_jwt_identity

from extensions import bcrypt

import db
import json

auth_bp = Blueprint('auth', __name__)


@auth_bp.route("/check-setup", methods=["GET"])
def auth_check_setup(): 
    
    # Verificando se existe pelo menos um admin para permitir o primeiro login ou se precisa criar um admin
    
    admin_exists = db.get_admin_count() > 0
    return jsonify({"setup_required": not admin_exists})

@auth_bp.route("/login", methods=["POST"])
def auth_login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"success": False, "message": "Dados incompletos"}), 400

    # Busca usuário via helper do DB
    user = db.get_user_by_username(username)

    # Lógica de primeiro Admin (Auto-setup) se o banco estiver vazio
    if not user and db.get_admin_count() == 0:
        hashed_pw = bcrypt.generate_password_hash(password).decode('utf-8')
        db.create_user(username, hashed_pw, 'admin')
        user = db.get_user_by_username(username)

    if user and bcrypt.check_password_hash(user['password'], password):
        # MANTEMOS O JSON.DUMPS pois seu código antigo usava assim para decodificar no front
        identity_data = json.dumps({"id": user['id'], "role": user['role']})
        token = create_access_token(identity=identity_data)

        # RETORNO EXATO que o seu Frontend espera:
        return jsonify({
            "success": True, 
            "token": token,  # Antes estava 'access_token', por isso falhava
            "role": user['role'], 
            "username": user['username']
        })
    
    return jsonify({"success": False, "message": "Usuário ou senha incorretos"}), 401

# Listar usuários (Apenas Admin)
@auth_bp.route("/users", methods=["GET"])
@jwt_required()
def auth_list_users():
    current_user = json.loads(get_jwt_identity())
    if current_user['role'] != 'admin':
        return jsonify({"message": "Acesso negado"}), 403
    
    users = db.get_all_users()

    return jsonify([dict(u) for u in users])

# Excluir usuário (Apenas Admin)
@auth_bp.route("/users/<int:user_id>", methods=["DELETE"])
@jwt_required()
def auth_delete_user(user_id):
    current_user = json.loads(get_jwt_identity())
    if current_user['role'] != 'admin':
        return jsonify({"message": "Acesso negado"}), 403
    
    db.delete_user_by_id(user_id)

    return jsonify({"success": True})

# Mudar senha (Qualquer usuário logado)
@auth_bp.route("/change-password", methods=["POST"])
@jwt_required()
def auth_change_password():
    user_identity = json.loads(get_jwt_identity())
    username = user_identity.get("username")
    
    data = request.get_json()
    old_pw = data.get("old_password")
    new_pw = data.get("new_password")

    user = db.get_user_by_username(username)

    if user and bcrypt.check_password_hash(user['password'], old_pw):
        new_hashed_pw = bcrypt.generate_password_hash(new_pw).decode('utf-8')
        db.update_user_password(username, new_hashed_pw)
        return jsonify({"success": True})
    
    return jsonify({"success": False, "message": "Senha antiga incorreta"}), 400

@auth_bp.route("/register", methods=["POST"])
@jwt_required()
def auth_register_user():

    # Criação de usuário (Apenas Admin)

    # 1. Verifica se quem está tentando criar é um administrador
    current_user_data = json.loads(get_jwt_identity())
    if current_user_data.get('role') != 'admin':
        return jsonify({"message": "Acesso negado"}), 403

    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    role = data.get("role", "user")

    if db.get_user_by_username(username):
        return jsonify({"message": "Usuário já existe"}), 400

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    db.create_user(username, hashed_password, role)
    return jsonify({"success": True, "message": "Usuário criado com sucesso!"})