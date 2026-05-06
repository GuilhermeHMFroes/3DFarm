# routes/settings.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
import db

settings_bp = Blueprint('settings', __name__)

@settings_bp.route("/data", methods=["GET"])
@jwt_required()
def get_config():
    try:
        settings = db.get_all_settings()
        return jsonify(settings), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@settings_bp.route("/config", methods=["POST"])
@jwt_required()
def save_config():
    try:
        data = request.get_json()
        # Aqui pegamos o valor que vem do Modal
        # Ex: { "inactivity_time": "5" }
        db.update_settings(data)
        return jsonify({"success": True, "message": "Configurações salvas"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500