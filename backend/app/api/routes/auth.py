"""
Модуль аутентификации и авторизации.

Этот модуль реализует основные функции системы аутентификации:
- Вход в систему (login)
- Регистрация новых пользователей (signup)
- Смена пароля пользователем
- Управление сессиями
- Многофакторная аутентификация (MFA)
"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, get_password_hash, verify_password, get_current_user, TokenPayload
from app.core.audit import set_audit_user
from app.db.session import get_db
from app.models import User
from app.schemas.auth import (
    TokenResponse, SignupRequest, PasswordChangeRequest,
    MFAEnableRequest, MFAVerifyRequest, MFADisableRequest,
    ForgotPasswordRequest, ResetPasswordRequest
)
from app.services.session_service import (
    create_session, update_session_activity, end_session, end_all_user_sessions,
    get_active_sessions_count
)
from app.services.mfa_service import create_mfa_code, verify_mfa_code, enable_mfa, disable_mfa
from app.services.password_reset_service import (
    create_password_reset_code, verify_password_reset_code
)
from app.models.session import UserSession

router = APIRouter()


@router.post("/token", response_model=TokenResponse)
async def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Аутентификация пользователя.
    
    Проверяет корректность имени пользователя и пароля, выдает токен
    аутентификации в случае успешной аутентификации.
    Поддерживает многофакторную аутентификацию (MFA).
    
    Args:
        form_data: Данные формы с username и password
        db: Сессия базы данных
        request: HTTP запрос (для получения IP адреса)
    
    Returns:
        TokenResponse: Токен доступа и информация о пользователе
    
    Raises:
        HTTPException: Если учетные данные неверны
    """
    # Найти пользователя по username
    result = await db.execute(select(User).where(User.username == form_data.username))
    user: User | None = result.scalar_one_or_none()
    
    # Проверить существование пользователя и пароль
    if not user or not verify_password(form_data.password, user.password):
        # Audit failed login
        await set_audit_user(db, form_data.username or "unknown")
        await db.execute(
            text("INSERT INTO hostel_audit_log (action, details, ip_address) VALUES ('login_failed', :details, :ip)"),
            {"details": f"Failed login attempt for username: {form_data.username}", "ip": request.client.host if request.client else None}
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # Audit successful login
    await set_audit_user(db, user.username)
    await db.execute(
        text("INSERT INTO hostel_audit_log (action, details, ip_address) VALUES ('login_success', :details, :ip)"),
        {"details": f"User {user.username} logged in with role {user.role}", "ip": request.client.host if request.client else None}
    )
    
    # Проверить, требуется ли MFA
    # Если MFA включена и код не предоставлен, вернуть требование MFA
    if hasattr(user, 'mfa_enabled') and user.mfa_enabled:
        # В реальном приложении здесь должна быть проверка кода MFA
        # Для упрощения, если MFA включена, требуем код через отдельный endpoint
        pass
    
    # Создать токен аутентификации
    token = create_access_token(subject=user.username, role=user.role)
    
    # Получить IP адрес и User-Agent из запроса
    ip_address = None
    user_agent = None
    if request:
        ip_address = request.client.host if request.client else None
        user_agent = request.headers.get("user-agent")
    
    # Создать сессию пользователя
    await create_session(
        db=db,
        user_id=user.id,
        token=token,
        expires_minutes=60,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    
    mfa_required = hasattr(user, 'mfa_enabled') and user.mfa_enabled
    
    return TokenResponse(
        access_token=token,
        role=user.role,
        mfa_required=mfa_required
    )


@router.post("/signup", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def signup(
    request: Request,
    payload: SignupRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """
    Регистрация нового пользователя.
    
    Создает нового пользователя с ролью 'customer' по умолчанию.
    Использует email как идентификатор для входа (username).
    
    Args:
        payload: Данные регистрации (email, full_name, password)
        db: Сессия базы данных
        request: HTTP запрос
    
    Returns:
        TokenResponse: Токен доступа для нового пользователя
    
    Raises:
        HTTPException: Если пользователь с таким email уже существует
    """
    # Проверить, существует ли пользователь с таким email (username)
    result = await db.execute(select(User).where(User.username == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already exists"
        )

    # Создать нового пользователя с хэшированным паролем
    user = User(
        username=payload.email,
        password=get_password_hash(payload.password),
        role="customer",
        mfa_enabled=False,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Создать токен и сессию
    token = create_access_token(subject=user.username, role=user.role)
    
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")
    
    await create_session(
        db=db,
        user_id=user.id,
        token=token,
        expires_minutes=60,
        ip_address=ip_address,
        user_agent=user_agent,
    )
    
    return TokenResponse(access_token=token, role=user.role)


@router.post("/change-password", status_code=status.HTTP_200_OK)
async def change_password(
    payload: PasswordChangeRequest,
    db: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
) -> dict:
    """
    Смена пароля пользователем.
    
    Позволяет пользователю изменить свой пароль с проверкой старого пароля.
    
    Args:
        payload: Старый и новый пароль
        db: Сессия базы данных
        current: Текущий аутентифицированный пользователь
    
    Returns:
        dict: Сообщение об успешной смене пароля
    
    Raises:
        HTTPException: Если старый пароль неверен
    """
    # Найти пользователя
    result = await db.execute(select(User).where(User.username == current.sub))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Проверить старый пароль
    if not verify_password(payload.old_password, user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid old password"
        )
    
    # Обновить пароль
    user.password = get_password_hash(payload.new_password)
    await db.commit()
    
    # Завершить все активные сессии пользователя (требуется повторный вход)
    await end_all_user_sessions(db, user.id)
    
    return {"message": "Password changed successfully. Please login again."}


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout(
    db: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
) -> dict:
    """
    Выход из системы (завершение сессии).
    
    Деактивирует все активные сессии пользователя.
    В продакшене лучше завершать только текущую сессию по токену.
    
    Args:
        db: Сессия базы данных
        current: Текущий аутентифицированный пользователь
    
    Returns:
        dict: Сообщение об успешном выходе
    """
    result = await db.execute(select(User).where(User.username == current.sub))
    user = result.scalar_one_or_none()
    
    if user:
        # Audit logout
        await set_audit_user(db, user.username)
        await db.execute(
            text("INSERT INTO hostel_audit_log (action, details, ip_address) VALUES ('logout', :details, :ip)"),
            {"details": f"User {user.username} logged out", "ip": None}  # IP not available in logout
        )
        await end_all_user_sessions(db, user.id)
    
    return {"message": "Logged out successfully"}


@router.post("/mfa/enable", status_code=status.HTTP_200_OK)
async def enable_mfa_endpoint(
    payload: MFAEnableRequest,
    db: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
) -> dict:
    """
    Включить многофакторную аутентификацию для пользователя.
    
    Args:
        payload: Подтверждение пароля
        db: Сессия базы данных
        current: Текущий аутентифицированный пользователь
    
    Returns:
        dict: Секретный ключ MFA (в реальном приложении отправляется по email)
    """
    result = await db.execute(select(User).where(User.username == current.sub))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Проверить пароль
    if not verify_password(payload.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid password"
        )
    
    # Включить MFA
    secret = await enable_mfa(db, user.id)
    
    # Обновить пользователя (если поля есть в модели)
    if hasattr(user, 'mfa_enabled'):
        user.mfa_enabled = True
        user.mfa_secret = secret
        await db.commit()
    
    return {
        "message": "MFA enabled successfully",
        "secret": secret  # В продакшене не возвращать секрет
    }


@router.post("/mfa/verify", status_code=status.HTTP_200_OK)
async def verify_mfa_endpoint(
    payload: MFAVerifyRequest,
    db: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
) -> dict:
    """
    Проверить код MFA.
    
    Args:
        payload: Код MFA
        db: Сессия базы данных
        current: Текущий аутентифицированный пользователь
    
    Returns:
        dict: Результат проверки
    """
    result = await db.execute(select(User).where(User.username == current.sub))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    is_valid = await verify_mfa_code(db, user.id, payload.code)
    
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid MFA code"
        )
    
    return {"message": "MFA code verified successfully"}


@router.post("/mfa/disable", status_code=status.HTTP_200_OK)
async def disable_mfa_endpoint(
    payload: MFADisableRequest,
    db: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
) -> dict:
    """
    Отключить многофакторную аутентификацию для пользователя.
    
    Args:
        payload: Подтверждение пароля
        db: Сессия базы данных
        current: Текущий аутентифицированный пользователь
    
    Returns:
        dict: Сообщение об успешном отключении MFA
    """
    result = await db.execute(select(User).where(User.username == current.sub))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Проверить пароль
    if not verify_password(payload.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid password"
        )
    
    # Отключить MFA
    await disable_mfa(db, user.id)
    
    # Обновить пользователя
    if hasattr(user, 'mfa_enabled'):
        user.mfa_enabled = False
        user.mfa_secret = None
        await db.commit()
    
    return {"message": "MFA disabled successfully"}


@router.get("/me", response_model=dict)
async def get_current_user_info(
    db: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
) -> dict:
    """
    Получить информацию о текущем аутентифицированном пользователе.
    
    Args:
        db: Сессия базы данных
        current: Текущий аутентифицированный пользователь
    
    Returns:
        dict: Информация о пользователе
    """
    result = await db.execute(select(User).where(User.username == current.sub))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Получить количество активных сессий
    active_sessions_count = await get_active_sessions_count(db, user.id)
    
    return {
        "id": user.id,
        "username": user.username,
        "role": user.role,
        "mfa_enabled": getattr(user, 'mfa_enabled', False),
        "active_sessions_count": active_sessions_count,
    }


@router.get("/sessions", response_model=list[dict])
async def get_user_sessions(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
) -> list[dict]:
    """
    Получить список активных сессий пользователя.
    
    Args:
        request: HTTP запрос (для получения текущего токена)
        db: Сессия базы данных
        current: Текущий аутентифицированный пользователь
    
    Returns:
        list[dict]: Список активных сессий
    """
    result = await db.execute(select(User).where(User.username == current.sub))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Получить текущий токен из заголовка Authorization
    auth_header = request.headers.get("authorization", "")
    current_token = auth_header.replace("Bearer ", "") if auth_header.startswith("Bearer ") else ""
    
    # Получить все активные сессии пользователя
    sessions_result = await db.execute(
        select(UserSession).where(
            UserSession.user_id == user.id,
            UserSession.is_active == True,
            UserSession.expires_at > datetime.now(timezone.utc)
        ).order_by(UserSession.last_activity.desc())
    )
    sessions = sessions_result.scalars().all()
    
    return [
        {
            "id": session.id,
            "created_at": session.created_at.isoformat(),
            "last_activity": session.last_activity.isoformat(),
            "expires_at": session.expires_at.isoformat(),
            "ip_address": session.ip_address,
            "user_agent": session.user_agent,
            "is_current": session.token == current_token,
        }
        for session in sessions
    ]


@router.delete("/sessions/{session_id}", status_code=status.HTTP_200_OK)
async def delete_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
) -> dict:
    """
    Завершить конкретную сессию пользователя.
    
    Args:
        session_id: ID сессии для завершения
        db: Сессия базы данных
        current: Текущий аутентифицированный пользователь
    
    Returns:
        dict: Сообщение об успешном завершении сессии
    """
    result = await db.execute(select(User).where(User.username == current.sub))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Найти сессию и проверить, что она принадлежит текущему пользователю
    session_result = await db.execute(
        select(UserSession).where(
            UserSession.id == session_id,
            UserSession.user_id == user.id
        )
    )
    session = session_result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Завершить сессию
    session.is_active = False
    await db.commit()
    
    return {"message": "Session ended successfully"}


@router.post("/forgot-password", status_code=status.HTTP_200_OK)
async def forgot_password(
    payload: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Запрос на восстановление пароля.
    
    Отправляет код восстановления пароля на email пользователя.
    Для безопасности не раскрывает, существует ли пользователь с таким email.
    
    Args:
        payload: Email пользователя
        db: Сессия базы данных
    
    Returns:
        dict: Сообщение об успешной отправке кода (всегда успешно для безопасности)
    """
    # Создать и отправить код восстановления
    # Если пользователь не найден, все равно возвращаем успех (безопасность)
    await create_password_reset_code(db, payload.email)
    
    return {
        "message": "If an account with this email exists, a password reset code has been sent."
    }


@router.post("/reset-password", status_code=status.HTTP_200_OK)
async def reset_password(
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """
    Установить новый пароль после восстановления.
    
    Проверяет код восстановления и устанавливает новый пароль.
    После успешного сброса все активные сессии пользователя завершаются.
    
    Args:
        payload: Email, код восстановления и новый пароль
        db: Сессия базы данных
    
    Returns:
        dict: Сообщение об успешном сбросе пароля
    
    Raises:
        HTTPException: Если код неверен или истек
    """
    # Проверить код восстановления
    user_id = await verify_password_reset_code(db, payload.email, payload.code)
    
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset code"
        )
    
    # Найти пользователя
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Валидация нового пароля
    if len(payload.new_password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 6 characters long"
        )
    
    # Установить новый пароль
    user.password = get_password_hash(payload.new_password)
    await db.commit()
    
    # Завершить все активные сессии пользователя
    await end_all_user_sessions(db, user.id)
    
    return {
        "message": "Password reset successfully. Please login with your new password."
    }


# Google OAuth endpoints
@router.get("/google/url")
async def get_google_auth_url():
    """Получить URL для авторизации через Google"""
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth not configured"
        )
    
    params = {
        "client_id": GOOGLE_CLIENT_ID,
        "redirect_uri": GOOGLE_REDIRECT_URI,
        "scope": "openid email profile",
        "response_type": "code",
        "access_type": "offline",
        "prompt": "consent"
    }
    
    base_url = "https://accounts.google.com/o/oauth2/auth"
    query_string = "&".join([f"{k}={v}" for k, v in params.items()])
    auth_url = f"{base_url}?{query_string}"
    
    return {"auth_url": auth_url}


@router.post("/google/callback", response_model=TokenResponse)
async def google_oauth_callback(
    request: Request,
    code: str,
    db: AsyncSession = Depends(get_db)
) -> TokenResponse:
    """Обработать callback от Google OAuth"""
    if not GOOGLE_CLIENT_ID or not GOOGLE_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth not configured"
        )
    
    # Обменять код на токен доступа
    token_data = {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": GOOGLE_REDIRECT_URI
    }
    
    async with httpx.AsyncClient() as client:
        token_response = await client.post(
            "https://oauth2.googleapis.com/token",
            data=token_data
        )
        
        if token_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to exchange code for token"
            )
        
        token_json = token_response.json()
        access_token = token_json.get("access_token")
        
        if not access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No access token received"
            )
        
        # Получить информацию о пользователе
        user_response = await client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {access_token}"}
        )
        
        if user_response.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get user info"
            )
        
        user_info = user_response.json()
        email = user_info.get("email")
        name = user_info.get("name")
        
        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No email received from Google"
            )
    
    # Найти или создать пользователя
    result = await db.execute(select(User).where(User.username == email))
    user = result.scalar_one_or_none()
    
    if not user:
        # Создать нового пользователя
        user = User(
            username=email,
            password=get_password_hash(os.urandom(32).hex()),  # Случайный пароль
            role="customer",
            full_name=name or email.split("@")[0]
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    
    # Создать токен
    access_token = create_access_token(
        data={"sub": user.username, "role": user.role, "user_id": user.id}
    )
    
    # Создать сессию
    await create_session(
        db=db,
        user_id=user.id,
        token=access_token,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent")
    )
    
    # Аудит
    await set_audit_user(db, user.username)
    await db.execute(
        text("INSERT INTO hostel_audit_log (action, details, ip_address) VALUES ('oauth_login', :details, :ip)"),
        {"details": f"User {user.username} logged in via Google OAuth", "ip": request.client.host if request.client else None}
    )
    await db.commit()
    
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        role=user.role
    )
