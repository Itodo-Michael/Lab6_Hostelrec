"""
Сервис восстановления пароля.

Этот модуль реализует функциональность восстановления забытого пароля
с использованием одноразовых кодов, отправляемых по email.
"""
import secrets
import string
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


def generate_reset_code(length: int = 8) -> str:
    """
    Генерировать случайный код для восстановления пароля.
    
    Args:
        length: Длина кода (по умолчанию 8 символов)
    
    Returns:
        str: Сгенерированный код
    """
    # Используем буквы и цифры для более безопасного кода
    chars = string.ascii_uppercase + string.digits
    return ''.join(secrets.choice(chars) for _ in range(length))


# Временное хранилище кодов восстановления (в продакшене лучше использовать Redis)
_password_reset_codes: dict[str, dict] = {}


async def send_password_reset_email(user_email: str, code: str) -> bool:
    """
    Отправить код восстановления пароля на email пользователя.
    
    В реальном приложении здесь должна быть интеграция с email-сервисом.
    Для демонстрации выводим код в консоль.
    
    Args:
        user_email: Email пользователя
        code: Код восстановления
    
    Returns:
        bool: True, если код успешно отправлен
    """
    # В реальном приложении здесь должна быть отправка email
    # Например, через SendGrid, AWS SES, или SMTP
    print(f"[Password Reset] Код восстановления для {user_email}: {code}")
    print(f"[Password Reset] Ссылка для восстановления: /reset-password?code={code}&email={user_email}")
    return True


async def create_password_reset_code(
    db: AsyncSession,
    user_email: str,
) -> Optional[str]:
    """
    Создать и отправить код восстановления пароля пользователю.
    
    Args:
        db: Сессия базы данных
        user_email: Email пользователя (username)
    
    Returns:
        str: Сгенерированный код или None, если пользователь не найден
    """
    # Найти пользователя по email (username)
    result = await db.execute(select(User).where(User.username == user_email))
    user = result.scalar_one_or_none()
    
    if not user:
        # Не раскрываем, существует ли пользователь (безопасность)
        return None
    
    code = generate_reset_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=30)  # Код действителен 30 минут
    
    # Сохранить код во временном хранилище
    _password_reset_codes[user_email] = {
        "code": code,
        "expires_at": expires_at,
        "used": False,
        "user_id": user.id,
    }
    
    # Отправить код на email
    await send_password_reset_email(user_email, code)
    
    return code


async def verify_password_reset_code(
    db: AsyncSession,
    user_email: str,
    code: str,
) -> Optional[int]:
    """
    Проверить код восстановления пароля.
    
    Args:
        db: Сессия базы данных
        user_email: Email пользователя
        code: Введенный код
    
    Returns:
        int: ID пользователя, если код верный, иначе None
    """
    if user_email not in _password_reset_codes:
        return None
    
    reset_data = _password_reset_codes[user_email]
    
    # Проверить, не использован ли код
    if reset_data["used"]:
        return None
    
    # Проверить, не истек ли код
    if datetime.now(timezone.utc) > reset_data["expires_at"]:
        del _password_reset_codes[user_email]
        return None
    
    # Проверить код
    if reset_data["code"] != code:
        return None
    
    # Пометить код как использованный
    reset_data["used"] = True
    
    return reset_data["user_id"]


async def cleanup_expired_reset_codes() -> int:
    """
    Удалить все истекшие коды восстановления пароля.
    
    Returns:
        int: Количество удаленных кодов
    """
    now = datetime.now(timezone.utc)
    expired_emails = [
        email for email, data in _password_reset_codes.items()
        if now > data["expires_at"]
    ]
    
    for email in expired_emails:
        del _password_reset_codes[email]
    
    return len(expired_emails)



