"""
Модуль безопасности и криптографии.

Этот модуль реализует функции хэширования паролей, создания и проверки
JWT токенов, а также управления доступом на основе ролей.

Используемые алгоритмы:
- pbkdf2_sha256 для хэширования паролей (с автоматической солью)
- JWT (HS256) для токенов аутентификации
"""
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt
from passlib.context import CryptContext
from pydantic import BaseModel

from app.core.config import get_settings

# Используем pbkdf2_sha256 - безопасный алгоритм хэширования с автоматической солью
# passlib автоматически генерирует уникальную соль для каждого пароля
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")


def get_password_hash(password: str) -> str:
    """
    Хэшировать пароль пользователя с использованием безопасного алгоритма.
    
    Использует pbkdf2_sha256 с автоматически генерируемой солью.
    Каждый вызов создает уникальный хэш даже для одинаковых паролей.
    
    Args:
        password: Пароль в открытом виде
    
    Returns:
        str: Хэшированный пароль (включает соль и параметры алгоритма)
    
    Example:
        >>> hash = get_password_hash("my_password")
        >>> len(hash) > 50  # Хэш содержит соль и параметры
        True
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Проверить пароль против хэша.
    
    Сравнивает введенный пароль с сохраненным хэшем, используя
    соль, которая была использована при хэшировании.
    
    Args:
        plain_password: Пароль в открытом виде
        hashed_password: Хэшированный пароль из базы данных
    
    Returns:
        bool: True, если пароль совпадает, False в противном случае
    
    Example:
        >>> hash = get_password_hash("my_password")
        >>> verify_password("my_password", hash)
        True
        >>> verify_password("wrong_password", hash)
        False
    """
    return pwd_context.verify(plain_password, hashed_password)

# OAuth2 схема для получения токена из заголовка Authorization
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


class TokenPayload(BaseModel):
    """
    Полезная нагрузка JWT токена.
    
    Содержит информацию о пользователе, закодированную в токене.
    """
    sub: str  # Subject (username пользователя)
    role: str  # Роль пользователя
    exp: int  # Время истечения токена (Unix timestamp)


def create_access_token(*, subject: str, role: str, expires_minutes: int | None = None) -> str:
    """
    Создать JWT токен аутентификации.
    
    Генерирует криптографически безопасный токен с использованием JWT (HS256).
    Токен содержит информацию о пользователе и время истечения.
    
    Args:
        subject: Имя пользователя (username)
        role: Роль пользователя
        expires_minutes: Время жизни токена в минутах (по умолчанию из настроек)
    
    Returns:
        str: JWT токен в виде строки
    
    Example:
        >>> token = create_access_token(subject="user@example.com", role="customer")
        >>> len(token) > 100
        True
    """
    settings = get_settings()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=expires_minutes or settings.auth_token_expire_minutes
    )
    payload = {"sub": subject, "role": role, "exp": int(expire.timestamp())}
    return jwt.encode(payload, settings.auth_secret_key, algorithm=settings.auth_algorithm)


def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]) -> TokenPayload:
    """
    Получить текущего аутентифицированного пользователя из токена.
    
    Декодирует и проверяет JWT токен из заголовка Authorization.
    Используется как зависимость FastAPI для защиты эндпоинтов.
    
    Args:
        token: JWT токен из заголовка Authorization
    
    Returns:
        TokenPayload: Данные пользователя из токена
    
    Raises:
        HTTPException: Если токен невалиден или истек
    
    Example:
        Использование в эндпоинте:
        >>> @router.get("/protected")
        >>> async def protected_route(current: TokenPayload = Depends(get_current_user)):
        >>>     return {"username": current.sub, "role": current.role}
    """
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.auth_secret_key, algorithms=[settings.auth_algorithm])
        token_data = TokenPayload(**payload)
        return token_data
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def require_role(*allowed_roles: str):
    """
    Декоратор для проверки прав доступа на основе ролей.
    
    Создает зависимость FastAPI, которая проверяет, имеет ли пользователь
    одну из разрешенных ролей. Используется для защиты эндпоинтов.
    
    Args:
        *allowed_roles: Список разрешенных ролей
    
    Returns:
        Функция-зависимость для FastAPI
    
    Example:
        Использование в эндпоинте:
        >>> @router.get("/admin-only")
        >>> async def admin_route(
        >>>     _admin=Depends(require_role("manager", "admin"))
        >>> ):
        >>>     return {"message": "Admin access granted"}
    """
    def role_dependency(user: Annotated[TokenPayload, Depends(get_current_user)]) -> TokenPayload:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient rights"
            )
        return user

    return role_dependency


