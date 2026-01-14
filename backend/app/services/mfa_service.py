"""
Сервис многофакторной аутентификации (MFA).

Этот модуль реализует функциональность многофакторной аутентификации
с использованием одноразовых кодов, отправляемых по email.
"""
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


def generate_mfa_code(length: int = 6) -> str:
    """
    Генерировать случайный одноразовый код для MFA.
    
    Args:
        length: Длина кода (по умолчанию 6 символов)
    
    Returns:
        str: Сгенерированный код
    """
    return ''.join(secrets.choice(string.digits) for _ in range(length))


def generate_mfa_secret() -> str:
    """
    Генерировать секретный ключ для MFA.
    
    Returns:
        str: Секретный ключ
    """
    return secrets.token_urlsafe(32)


# Временное хранилище кодов (в продакшене лучше использовать Redis)
_mfa_codes: dict[str, dict] = {}


async def send_mfa_code_email(user_email: str, code: str) -> bool:
    """
    Отправить код MFA на email пользователя.
    
    В реальном приложении здесь должна быть интеграция с email-сервисом.
    Для демонстрации выводим код в консоль.
    
    Args:
        user_email: Email пользователя
        code: Одноразовый код
    
    Returns:
        bool: True, если код успешно отправлен
    """
    # В реальном приложении здесь должна быть отправка email
    # Например, через SendGrid, AWS SES, или SMTP
    print(f"[MFA] Код для {user_email}: {code}")
    return True


async def create_mfa_code(
    db: AsyncSession,
    user_id: int,
    user_email: str,
) -> str:
    """
    Создать и отправить код MFA пользователю.
    
    Args:
        db: Сессия базы данных
        user_id: ID пользователя
        user_email: Email пользователя
    
    Returns:
        str: Сгенерированный код
    """
    code = generate_mfa_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    
    # Сохранить код во временном хранилище
    _mfa_codes[str(user_id)] = {
        "code": code,
        "expires_at": expires_at,
        "used": False,
    }
    
    # Отправить код на email
    await send_mfa_code_email(user_email, code)
    
    return code


async def verify_mfa_code(
    db: AsyncSession,
    user_id: int,
    code: str,
) -> bool:
    """
    Проверить код MFA.
    
    Args:
        db: Сессия базы данных
        user_id: ID пользователя
        code: Введенный код
    
    Returns:
        bool: True, если код верный и не истек
    """
    user_id_str = str(user_id)
    
    if user_id_str not in _mfa_codes:
        return False
    
    mfa_data = _mfa_codes[user_id_str]
    
    # Проверить, не использован ли код
    if mfa_data["used"]:
        return False
    
    # Проверить, не истек ли код
    if datetime.now(timezone.utc) > mfa_data["expires_at"]:
        del _mfa_codes[user_id_str]
        return False
    
    # Проверить код
    if mfa_data["code"] != code:
        return False
    
    # Пометить код как использованный
    mfa_data["used"] = True
    
    return True


async def enable_mfa(
    db: AsyncSession,
    user_id: int,
) -> str:
    """
    Включить MFA для пользователя.
    
    Args:
        db: Сессия базы данных
        user_id: ID пользователя
    
    Returns:
        str: Секретный ключ MFA
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise ValueError("User not found")
    
    secret = generate_mfa_secret()
    
    # Обновить пользователя (если есть поле mfa_secret в модели)
    # В реальном приложении нужно добавить эти поля в модель User
    # user.mfa_enabled = True
    # user.mfa_secret = secret
    
    await db.commit()
    
    return secret


async def disable_mfa(
    db: AsyncSession,
    user_id: int,
) -> bool:
    """
    Отключить MFA для пользователя.
    
    Args:
        db: Сессия базы данных
        user_id: ID пользователя
    
    Returns:
        bool: True, если MFA успешно отключен
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        return False
    
    # Обновить пользователя
    # user.mfa_enabled = False
    # user.mfa_secret = None
    
    await db.commit()
    
    # Удалить все коды для этого пользователя
    user_id_str = str(user_id)
    if user_id_str in _mfa_codes:
        del _mfa_codes[user_id_str]
    
    return True

