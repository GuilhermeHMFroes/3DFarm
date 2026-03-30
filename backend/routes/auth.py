from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, create_access_token, jwt_required, get_jwt_identity

from extensions import bcrypt

import json
import sqlite3

import db

from pathlib import Path

auth_bp = Blueprint('auth', __name__)


@auth_bp.route("/check-setup", methods=["GET"])
def auth_check_setup():
    conn = db.get_conn()
    cur = conn.cursor()
    admin = cur.execute("SELECT id FROM users WHERE role = 'admin'").fetchone()
    conn.close()
    # Se não houver admin, retorna true para o frontend mostrar tela de cadastro inicial
    return jsonify({"setup_required": admin is None})

@auth_bp.route("/login", methods=["POST"])
def auth_login():
    data = request.get_json()
    username = data.get("username")
    password = data.get("password")

    conn = db.get_conn()
    cur = conn.cursor()
    
    # Verifica se o banco está vazio para o primeiro Admin
    count = cur.execute("SELECT COUNT(*) as total FROM users").fetchone()
    if count['total'] == 0:
        hashed_pw = bcrypt.generate_password_hash(password).decode('utf-8')
        cur.execute("INSERT INTO users (username, password, role) VALUES (?, ?, 'admin')", (username, hashed_pw))
        conn.commit()
        user = cur.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
    else:
        user = cur.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()

    conn.close()

    if user and bcrypt.check_password_hash(user['password'], password):
        # O identity do Token agora carrega ID e ROLE do usuário
        token = create_access_token(identity=json.dumps({"id": user['id'], "role": user['role']}))
        return jsonify({
            "success": True, 
            "token": token, 
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
    
    conn = db.get_conn()
    cur = conn.cursor()
    users = cur.execute("SELECT id, username, role FROM users").fetchall()
    conn.close()
    return jsonify([dict(u) for u in users])

# Excluir usuário (Apenas Admin)
@auth_bp.route("/users/<int:user_id>", methods=["DELETE"])
@jwt_required()
def auth_delete_user(user_id):
    current_user = json.loads(get_jwt_identity())
    if current_user['role'] != 'admin':
        return jsonify({"message": "Acesso negado"}), 403
    
    conn = db.get_conn()
    cur = conn.cursor()
    cur.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return jsonify({"success": True})

# Mudar senha (Qualquer usuário logado)
@auth_bp.route("/change-password", methods=["POST"])
@jwt_required()
def auth_change_password():
    current_user = json.loads(get_jwt_identity())
    data = request.get_json()
    
    conn = db.get_conn()
    cur = conn.cursor()
    user = cur.execute("SELECT * FROM users WHERE id = ?", (current_user['id'],)).fetchone()
    
    if bcrypt.check_password_hash(user['password'], data['old_password']):
        new_hashed = bcrypt.generate_password_hash(data['new_password']).decode('utf-8')
        cur.execute("UPDATE users SET password = ? WHERE id = ?", (new_hashed, user['id']))
        conn.commit()
        conn.close()
        return jsonify({"success": True})
    
    conn.close()
    return jsonify({"success": False, "message": "Senha antiga incorreta"}), 400

@auth_bp.route("/register", methods=["POST"])
@jwt_required()
def auth_register_user():
    # 1. Verifica se quem está tentando criar é um administrador
    current_user_data = json.loads(get_jwt_identity())
    if current_user_data.get('role') != 'admin':
        return jsonify({"message": "Acesso negado: Apenas administradores podem criar usuários"}), 403

    data = request.get_json()
    username = data.get("username")
    password = data.get("password")
    role = data.get("role", "user") # Padrão é 'user' se não enviado

    if not username or not password:
        return jsonify({"message": "Usuário e senha são obrigatórios"}), 400

    # 2. Criptografa a senha antes de salvar
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

    try:
        conn = db.get_conn()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
            (username, hashed_password, role)
        )
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "Usuário criado com sucesso!"})
    except sqlite3.IntegrityError:
        return jsonify({"message": "Este nome de usuário já existe"}), 400
    except Exception as e:
        return jsonify({"message": f"Erro interno: {str(e)}"}), 500