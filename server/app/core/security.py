from datetime import datetime, timedelta, timezone
from typing import Any, Union, Annotated

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jwt.exceptions import InvalidTokenError
from pwdlib import PasswordHash
from sqlmodel import Session

from app.core.config import get_settings
from app.core.dbsession import get_session
from app.db_models.user import User

settings = get_settings()

reusable_oauth2 = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

password_hash = PasswordHash.recommended()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its hash."""
    return password_hash.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Generate a hash from a plain password."""
    return password_hash.hash(password)


def create_access_token(
    subject: Union[str, Any], 
    expires_delta: timedelta | None = None,
    google_access_token: str | None = None
) -> str:
    """Create a new JWT access token."""
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,   
        )

    to_encode = {"exp": expire, "sub": str(subject)}
    if google_access_token:
        to_encode["google_access_token"] = google_access_token
        
    encoded_jwt = jwt.encode(
        to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
    )
    return encoded_jwt


def get_google_token(
    token: Annotated[str, Depends(reusable_oauth2)],
) -> str | None:
    """Dependency to retrieve the google_access_token from the JWT if present."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        return payload.get("google_access_token")
    except (InvalidTokenError, ValueError):
        return None


def get_current_user(
    session: Annotated[Session, Depends(get_session)],
    token: Annotated[str, Depends(reusable_oauth2)],
) -> User:
    """Dependency to retrieve the current authenticated user."""
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except (InvalidTokenError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Could not validate credentials",
        )

    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return user


def get_current_admin_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Dependency to retrieve the current authenticated user and verify admin status."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Not enough privileges"
        )
    return current_user