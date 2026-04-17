# Helpers genéricos

import secrets

from pathlib import Path

def generate_token(nbytes=24):
    return secrets.token_urlsafe(nbytes)

def key_file():

    KEY_FILE = Path(__file__).parent / ".jwt_key"

    if not KEY_FILE.exists():
        # Gera uma chave aleatória de 32 bytes (muito segura) e converte para hexadecimal
        new_key = secrets.token_hex(32)
        with open(KEY_FILE, "w") as f:
            f.write(new_key)
        print(f"Nova JWT_SECRET_KEY gerada e salva em {KEY_FILE}")

    # Lê a chave do arquivo
    with open(KEY_FILE, "r") as f:
        return f.read().strip()
        
