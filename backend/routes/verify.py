from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

verify_bp = Blueprint('verify', __name__)

@verify_bp.route('/token', methods=['GET'])
@jwt_required()
def verify_token():
    return {"success": True}, 200