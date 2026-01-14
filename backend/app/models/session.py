"""
Модель для управления сессиями пользователей.

Этот модуль реализует систему управления сессиями для отслеживания активных
сессий пользователей и их токенов аутентификации.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .user import Base


class UserSession(Base):
    """
    Модель сессии пользователя.
    
    Хранит информацию об активных сессиях пользователей, включая токены
    аутентификации, время создания и последнего обновления.
    """
    __tablename__ = "user_sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("hostel_users.id", ondelete="CASCADE"), nullable=False, index=True)
    token = Column(String, unique=True, nullable=False, index=True)  # JWT токен или UUID
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_activity = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    ip_address = Column(String, nullable=True)  # IP адрес пользователя
    user_agent = Column(String, nullable=True)  # User-Agent браузера

    user = relationship("User", backref="sessions")



