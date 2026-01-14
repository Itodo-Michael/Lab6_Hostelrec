"""
Модель пользователя системы.

Хранит информацию о пользователях системы, включая учетные данные,
роли и настройки многофакторной аутентификации.
"""
from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class User(Base):
    """
    Модель пользователя.
    
    Хранит информацию о пользователях системы:
    - Учетные данные (username, password)
    - Роль пользователя (customer, receptionist, manager, cleaner)
    - Настройки многофакторной аутентификации
    """
    __tablename__ = "hostel_users"  # Match the table name from Lab 3

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)  # Хэшированный пароль с использованием pbkdf2_sha256
    role = Column(String, nullable=False)  # receptionist, manager, cleaner, customer
    mfa_enabled = Column(Boolean, default=False, nullable=False)  # Включена ли MFA
    mfa_secret = Column(String, nullable=True)  # Секретный ключ для MFA

