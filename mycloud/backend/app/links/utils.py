import secrets

DEFAULT_TOKEN_BYTES = 32

def generate_token(nbytes: int = DEFAULT_TOKEN_BYTES) -> str:
    return secrets.token_urlsafe(nbytes)
