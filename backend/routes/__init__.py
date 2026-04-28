
from .auth import auth_bp
from .dashboard import dashboard_bp
from .api import api_bp
from .printers import printers_bp

def register_blueprints(app):
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(dashboard_bp, url_prefix='/dashboard')
    app.register_blueprint(api_bp, url_prefix='/api')
    app.register_blueprint(printers_bp, url_prefix='/printers')
    