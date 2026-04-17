import secrets

from pathlib import Path

import os

def generate_token(nbytes=24):
    return secrets.token_urlsafe(nbytes)

def key_file():

    # Detecta se está no Docker ou Local
    if os.path.exists("/app"):
        # Se estiver no Docker, salva na pasta de volume mapeada
        KEY_FILE = Path("/app/data/.jwt_key")

    else:
        # Se estiver no PC, salva na pasta do projeto normalmente
        KEY_FILE = Path(__file__).parent / ".jwt_key"

    if not KEY_FILE.exists():
        # Gera uma chave aleatória de 32 bytes (muito segura) e converte para hexadecimal
        new_key = secrets.token_hex(32)

        # Garante que a pasta pai existe antes de salvar
        KEY_FILE.parent.mkdir(parents=True, exist_ok=True)

        with open(KEY_FILE, "w") as f:
            f.write(new_key)
        print(f"Nova JWT_SECRET_KEY gerada e salva em {KEY_FILE}")

    # Lê a chave do arquivo
    with open(KEY_FILE, "r") as f:
        return f.read().strip()
        
