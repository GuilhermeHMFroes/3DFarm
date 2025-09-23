# utils.py
import secrets

def generate_token(nbytes=24):
    return secrets.token_urlsafe(nbytes)
