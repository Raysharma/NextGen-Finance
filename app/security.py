from datetime import datetime, timedelta, timezone
from typing import Any, Dict

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# Use PBKDF2-SHA256 to avoid optional bcrypt native dependency issues in some environments.
# PBKDF2 is secure for this demo and removes the 72-byte bcrypt limit problem.
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: Dict[str, Any], expires_minutes: int | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes if expires_minutes is not None else settings.access_token_expire_minutes
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def decode_token(token: str) -> Dict[str, Any]:
    return jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])


def generate_account_number() -> str:
    from secrets import randbelow

    return f"{10_000_000_000 + randbelow(90_000_000_000)}"
