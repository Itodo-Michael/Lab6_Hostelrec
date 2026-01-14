"""
Схемы данных для аутентификации и авторизации.

Этот модуль содержит Pydantic схемы для валидации данных
в запросах и ответах API аутентификации.
"""
from pydantic import BaseModel, EmailStr


class TokenResponse(BaseModel):
    """Ответ с токеном аутентификации."""
    access_token: str
    token_type: str = "bearer"
    role: str
    mfa_required: bool = False  # Требуется ли MFA


class LoginRequest(BaseModel):
    """Запрос на вход в систему."""
    username: str
    password: str
    mfa_code: str | None = None  # Код MFA (если требуется)


class SignupRequest(BaseModel):
    """Запрос на регистрацию нового пользователя."""
    email: str
    full_name: str
    password: str


class PasswordChangeRequest(BaseModel):
    """Запрос на смену пароля пользователем."""
    old_password: str
    new_password: str


class MFAEnableRequest(BaseModel):
    """Запрос на включение MFA."""
    password: str  # Подтверждение пароля для безопасности


class MFAVerifyRequest(BaseModel):
    """Запрос на проверку кода MFA."""
    code: str


class MFADisableRequest(BaseModel):
    """Запрос на отключение MFA."""
    password: str  # Подтверждение пароля для безопасности


class UserCreate(BaseModel):
    """Схема для создания пользователя (администратором)."""
    username: str
    password: str
    role: str | None = None


class UserUpdate(BaseModel):
    """Схема для обновления пользователя."""
    role: str | None = None
    password: str | None = None


class UserResponse(BaseModel):
    """Схема ответа с информацией о пользователе."""
    id: int
    username: str
    role: str
    mfa_enabled: bool = False


class ForgotPasswordRequest(BaseModel):
    """Запрос на восстановление пароля."""
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    """Запрос на установку нового пароля после восстановления."""
    email: EmailStr
    code: str
    new_password: str


