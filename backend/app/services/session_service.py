"""
Сервис управления сессиями пользователей.

Этот модуль реализует функции создания, обновления и завершения сессий пользователей.
Обеспечивает отслеживание активных сессий и управление токенами аутентификации.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.session import UserSession
from app.models.user import User


async def create_session(
    db: AsyncSession,
    user_id: int,
    token: str,
    expires_minutes: int = 60,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> UserSession:
    """
    Создать новую сессию пользователя.
    
    Args:
        db: Сессия базы данных
        user_id: ID пользователя
        token: Токен аутентификации (JWT или UUID)
        expires_minutes: Время жизни сессии в минутах (по умолчанию 60)
        ip_address: IP адрес пользователя (опционально)
        user_agent: User-Agent браузера (опционально)
    
    Returns:
        UserSession: Созданная сессия
    """
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
    
    session = UserSession(
        user_id=user_id,
        token=token,
        expires_at=expires_at,
        ip_address=ip_address,
        user_agent=user_agent,
        is_active=True,
    )
    
    db.add(session)
    await db.commit()
    await db.refresh(session)
    
    return session


async def update_session_activity(
    db: AsyncSession,
    token: str,
) -> Optional[UserSession]:
    """
    Обновить время последней активности сессии.
    
    Args:
        db: Сессия базы данных
        token: Токен аутентификации
    
    Returns:
        UserSession: Обновленная сессия или None, если сессия не найдена
    """
    result = await db.execute(
        select(UserSession).where(
            UserSession.token == token,
            UserSession.is_active == True,
            UserSession.expires_at > datetime.now(timezone.utc)
        )
    )
    session = result.scalar_one_or_none()
    
    if session:
        session.last_activity = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(session)
    
    return session


async def end_session(
    db: AsyncSession,
    token: str,
) -> bool:
    """
    Завершить сессию пользователя (деактивировать токен).
    
    Args:
        db: Сессия базы данных
        token: Токен аутентификации
    
    Returns:
        bool: True, если сессия была успешно завершена
    """
    result = await db.execute(
        select(UserSession).where(UserSession.token == token)
    )
    session = result.scalar_one_or_none()
    
    if session:
        session.is_active = False
        await db.commit()
        return True
    
    return False


async def end_all_user_sessions(
    db: AsyncSession,
    user_id: int,
) -> int:
    """
    Завершить все активные сессии пользователя.
    
    Args:
        db: Сессия базы данных
        user_id: ID пользователя
    
    Returns:
        int: Количество завершенных сессий
    """
    result = await db.execute(
        select(UserSession).where(
            UserSession.user_id == user_id,
            UserSession.is_active == True
        )
    )
    sessions = result.scalars().all()
    
    count = 0
    for session in sessions:
        session.is_active = False
        count += 1
    
    await db.commit()
    return count


async def cleanup_expired_sessions(db: AsyncSession) -> int:
    """
    Удалить все истекшие сессии из базы данных.
    
    Args:
        db: Сессия базы данных
    
    Returns:
        int: Количество удаленных сессий
    """
    result = await db.execute(
        delete(UserSession).where(
            UserSession.expires_at < datetime.now(timezone.utc)
        )
    )
    await db.commit()
    return result.rowcount


async def get_active_sessions_count(
    db: AsyncSession,
    user_id: int,
) -> int:
    """
    Получить количество активных сессий пользователя.
    
    Args:
        db: Сессия базы данных
        user_id: ID пользователя
    
    Returns:
        int: Количество активных сессий
    """
    result = await db.execute(
        select(UserSession).where(
            UserSession.user_id == user_id,
            UserSession.is_active == True,
            UserSession.expires_at > datetime.now(timezone.utc)
        )
    )
    sessions = result.scalars().all()
    return len(list(sessions))

