# Система аутентификации и авторизации

## Описание

Этот документ описывает реализацию системы аутентификации и авторизации для лабораторной работы №6.

## Реализованные компоненты

### 1. База данных для хранения пользователей ✅

**Таблица `hostel_users`:**
- `id` - уникальный идентификатор пользователя
- `username` - имя пользователя (уникальное)
- `password` - хэшированный пароль
- `role` - роль пользователя (customer, receptionist, manager, cleaner)
- `mfa_enabled` - флаг включения многофакторной аутентификации
- `mfa_secret` - секретный ключ для MFA

**Таблица `user_sessions`:**
- `id` - уникальный идентификатор сессии
- `user_id` - ссылка на пользователя
- `token` - токен аутентификации (JWT)
- `created_at` - время создания сессии
- `last_activity` - время последней активности
- `expires_at` - время истечения сессии
- `is_active` - флаг активности сессии
- `ip_address` - IP адрес пользователя
- `user_agent` - User-Agent браузера

### 2. Модуль хэширования паролей ✅

**Файл:** `backend/app/core/security.py`

**Функции:**
- `get_password_hash(password: str) -> str` - хэширует пароль с использованием pbkdf2_sha256
- `verify_password(plain_password: str, hashed_password: str) -> bool` - проверяет пароль против хэша

**Особенности:**
- Использует алгоритм pbkdf2_sha256 (безопасный алгоритм с автоматической солью)
- Каждый пароль хэшируется с уникальной солью
- Соль автоматически генерируется библиотекой passlib

### 3. Модуль аутентификации ✅

**Файл:** `backend/app/api/routes/auth.py`

**Эндпоинты:**
- `POST /auth/token` - вход в систему
- `POST /auth/signup` - регистрация нового пользователя
- `GET /auth/google/url` - получение URL для OAuth Google
- `POST /auth/google/callback` - обработка callback от Google OAuth

**Функциональность:**
- Проверка имени пользователя и пароля
- Генерация JWT токена при успешной аутентификации
- Создание сессии пользователя
- Поддержка многофакторной аутентификации
- OAuth 2.0 аутентификация через Google

**Пример запроса:**
```bash
curl -X POST "http://localhost:8000/auth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=user@example.com&password=password123"
```

**Пример ответа:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "role": "customer",
  "mfa_required": false
}
```

### 4. Модуль авторизации ✅

**Файл:** `backend/app/core/security.py`

**Функции:**
- `get_current_user(token)` - получение текущего пользователя из токена
- `require_role(*allowed_roles)` - декоратор для проверки прав доступа

**Использование:**
```python
@router.get("/admin-only")
async def admin_route(
    _admin=Depends(require_role("manager", "admin"))
):
    return {"message": "Admin access granted"}
```

**Роли пользователей:**
- `customer` - обычный клиент
- `receptionist` - администратор ресепшена
- `manager` - менеджер
- `cleaner` - уборщик

### 5. Модуль управления сессиями ✅

**Файл:** `backend/app/services/session_service.py`

**Функции:**
- `create_session()` - создать новую сессию пользователя
- `update_session_activity()` - обновить время последней активности
- `end_session()` - завершить сессию (деактивировать токен)
- `end_all_user_sessions()` - завершить все сессии пользователя
- `cleanup_expired_sessions()` - удалить истекшие сессии
- `get_active_sessions_count()` - получить количество активных сессий

**Модель:** `backend/app/models/session.py`

**Эндпоинты:**
- `POST /auth/logout` - выход из системы (завершение всех сессий)

### 6. Google OAuth интеграция ✅

**Конфигурация:**
- `GOOGLE_CLIENT_ID` - Client ID из Google Cloud Console
- `GOOGLE_CLIENT_SECRET` - Client Secret из Google Cloud Console
- `GOOGLE_REDIRECT_URI` - URI перенаправления (http://localhost:3000/auth/google/callback)

**Поток OAuth:**
1. Frontend запрашивает `/auth/google/url`
2. Пользователь перенаправляется на Google для авторизации
3. Google перенаправляет обратно с кодом авторизации
4. Backend обменивает код на токен доступа
5. Получает информацию о пользователе (email, имя)
6. Создает/обновляет пользователя в системе
7. Возвращает JWT токен

**Пример использования:**
```bash
# Получить URL для авторизации
curl "http://localhost:8000/auth/google/url"

# Обработать callback (внутренний вызов)
curl -X POST "http://localhost:8000/auth/google/callback" \
  -H "Content-Type: application/json" \
  -d '{"code": "authorization_code_from_google"}'
```

### 7. Дополнительные функции ✅

#### Смена пароля пользователем

**Эндпоинт:** `POST /auth/change-password`

**Запрос:**
```json
{
  "old_password": "old_password123",
  "new_password": "new_password456"
}
```

**Особенности:**
- Требует аутентификации
- Проверяет старый пароль перед сменой
- После смены пароля все активные сессии завершаются

#### Многофакторная аутентификация (MFA)

**Файл:** `backend/app/services/mfa_service.py`

**Эндпоинты:**
- `POST /auth/mfa/enable` - включить MFA
- `POST /auth/mfa/verify` - проверить код MFA
- `POST /auth/mfa/disable` - отключить MFA

**Функциональность:**
- Генерация одноразовых кодов (6 цифр)
- Отправка кодов по email (в демо-версии вывод в консоль)
- Время жизни кода: 10 минут
- Автоматическая инвалидация использованных кодов

**Пример использования:**
```bash
# Включить MFA
curl -X POST "http://localhost:8000/auth/mfa/enable" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"password": "user_password"}'

# Проверить код MFA
curl -X POST "http://localhost:8000/auth/mfa/verify" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"code": "123456"}'
```

## Frontend интеграция

### Компоненты аутентификации

**LoginPage (`frontend/src/pages/LoginPage.tsx`):**
- Форма входа с поддержкой MFA
- Кнопка "Continue with Google" для OAuth
- Обработка popup окон для OAuth flow

**SignupPage (`frontend/src/pages/SignupPage.tsx`):**
- Форма регистрации новых пользователей
- Автоматическое перенаправление после успешной регистрации

**MFAPage (`frontend/src/pages/MFAPage.tsx`):**
- Управление многофакторной аутентификацией
- Включение/отключение MFA
- Проверка кодов MFA

**PasswordChangePage (`frontend/src/pages/PasswordChangePage.tsx`):**
- Смена пароля пользователя
- Автоматический выход после смены пароля

**SessionsPage (`frontend/src/pages/SessionsPage.tsx`):**
- Просмотр активных сессий
- Завершение отдельных сессий

**ForgotPasswordPage (`frontend/src/pages/ForgotPasswordPage.tsx`):**
- Восстановление пароля через email
- Сброс пароля с кодом подтверждения

**GoogleAuthCallback (`frontend/src/pages/GoogleAuthCallback.tsx`):**
- Обработка callback от Google OAuth
- Обмен кода на токен
- Перенаправление пользователя

### Хуки и сервисы

**useAuthStore (`frontend/src/hooks/useAuthStore.ts`):**
- Управление состоянием аутентификации
- Сохранение токена в localStorage
- Автоматическая перезагрузка токена

**API сервис (`frontend/src/services/api.ts`):**
- Автоматическая установка Authorization header
- Перехватчик 401 для автоматического выхода
- Повторная попытка запросов с новым токеном

## Безопасность

### Хэширование паролей
- Используется алгоритм pbkdf2_sha256
- Автоматическая генерация уникальной соли для каждого пароля
- Пароли никогда не хранятся в открытом виде

### Токены аутентификации
- Используется JWT (JSON Web Tokens)
- Алгоритм подписи: HS256
- Токены содержат время истечения
- Токены подписываются секретным ключом

### Управление сессиями
- Отслеживание активных сессий пользователей
- Автоматическое завершение истекших сессий
- Возможность завершить все сессии при смене пароля

### Защита от атак
- Защита от перебора паролей (rate limiting рекомендуется)
- Валидация входных данных
- Проверка прав доступа на уровне эндпоинтов

## Тестирование

### Тестовые данные

Для тестирования системы можно использовать следующие данные:

1. **Создать пользователя через signup:**
```bash
curl -X POST "http://localhost:8000/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "full_name": "Test User",
    "password": "testpassword123"
  }'
```

2. **Войти в систему:**
```bash
curl -X POST "http://localhost:8000/auth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=testpassword123"
```

3. **Сменить пароль (требуется токен):**
```bash
curl -X POST "http://localhost:8000/auth/change-password" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "old_password": "testpassword123",
    "new_password": "newpassword456"
  }'
```

## Структура проекта

```
backend/
├── app/
│   ├── api/
│   │   └── routes/
│   │       └── auth.py          # Эндпоинты аутентификации
│   ├── core/
│   │   └── security.py          # Модуль безопасности
│   ├── models/
│   │   ├── user.py              # Модель пользователя
│   │   └── session.py           # Модель сессии
│   ├── schemas/
│   │   └── auth.py              # Схемы данных
│   └── services/
│       ├── session_service.py   # Сервис управления сессиями
│       └── mfa_service.py       # Сервис MFA
└── AUTHENTICATION_SYSTEM.md     # Эта документация

frontend/
├── src/
│   ├── pages/
│   │   ├── LoginPage.tsx        # Страница входа
│   │   ├── SignupPage.tsx       # Страница регистрации
│   │   ├── MFAPage.tsx          # Страница MFA
│   │   ├── PasswordChangePage.tsx # Смена пароля
│   │   ├── SessionsPage.tsx     # Управление сессиями
│   │   ├── ForgotPasswordPage.tsx # Восстановление пароля
│   │   └── GoogleAuthCallback.tsx # Callback OAuth
│   ├── hooks/
│   │   └── useAuthStore.ts      # Хук состояния аутентификации
│   └── services/
│       └── api.ts               # API клиент
```

## Рекомендации для продакшена

1. **Хранилище MFA кодов:** Использовать Redis вместо словаря в памяти
2. **Отправка email:** Интегрировать реальный email-сервис (SendGrid, AWS SES)
3. **Rate limiting:** Добавить ограничение количества попыток входа
4. **Логирование:** Добавить логирование всех попыток аутентификации
5. **Мониторинг:** Отслеживание подозрительной активности
6. **HTTPS:** Использовать только HTTPS в продакшене
7. **Секретные ключи:** Хранить секретные ключи в переменных окружения
8. **Рефреш токены:** Реализовать механизм обновления токенов

## Заключение

Система аутентификации и авторизации реализует все требования лабораторной работы №6:

✅ База данных для пользователей
✅ Модуль хэширования паролей с солью
✅ Модуль аутентификации с JWT токенами
✅ Модуль авторизации на основе ролей
✅ Модуль управления сессиями
✅ Смена пароля пользователем
✅ Многофакторная аутентификация
✅ Google OAuth интеграция
✅ Полная frontend интеграция
✅ Документация кода

## Безопасность

### Хэширование паролей
- Используется алгоритм pbkdf2_sha256
- Автоматическая генерация уникальной соли для каждого пароля
- Пароли никогда не хранятся в открытом виде

### Токены аутентификации
- Используется JWT (JSON Web Tokens)
- Алгоритм подписи: HS256
- Токены содержат время истечения
- Токены подписываются секретным ключом

### Управление сессиями
- Отслеживание активных сессий пользователей
- Автоматическое завершение истекших сессий
- Возможность завершить все сессии при смене пароля

### Защита от атак
- Защита от перебора паролей (rate limiting рекомендуется)
- Валидация входных данных
- Проверка прав доступа на уровне эндпоинтов

## Тестирование

### Тестовые данные

Для тестирования системы можно использовать следующие данные:

1. **Создать пользователя через signup:**
```bash
curl -X POST "http://localhost:8000/auth/signup" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "full_name": "Test User",
    "password": "testpassword123"
  }'
```

2. **Войти в систему:**
```bash
curl -X POST "http://localhost:8000/auth/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=testpassword123"
```

3. **Сменить пароль (требуется токен):**
```bash
curl -X POST "http://localhost:8000/auth/change-password" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "old_password": "testpassword123",
    "new_password": "newpassword456"
  }'
```

## Структура проекта

```
backend/
├── app/
│   ├── api/
│   │   └── routes/
│   │       └── auth.py          # Эндпоинты аутентификации
│   ├── core/
│   │   └── security.py          # Модуль безопасности
│   ├── models/
│   │   ├── user.py              # Модель пользователя
│   │   └── session.py           # Модель сессии
│   ├── schemas/
│   │   └── auth.py              # Схемы данных
│   └── services/
│       ├── session_service.py   # Сервис управления сессиями
│       └── mfa_service.py       # Сервис MFA
└── AUTHENTICATION_SYSTEM.md     # Эта документация
```

## Рекомендации для продакшена

1. **Хранилище MFA кодов:** Использовать Redis вместо словаря в памяти
2. **Отправка email:** Интегрировать реальный email-сервис (SendGrid, AWS SES)
3. **Rate limiting:** Добавить ограничение количества попыток входа
4. **Логирование:** Добавить логирование всех попыток аутентификации
5. **Мониторинг:** Отслеживание подозрительной активности
6. **HTTPS:** Использовать только HTTPS в продакшене
7. **Секретные ключи:** Хранить секретные ключи в переменных окружения
8. **Рефреш токены:** Реализовать механизм обновления токенов

## Заключение

Система аутентификации и авторизации реализует все требования лабораторной работы №6:

✅ База данных для пользователей
✅ Модуль хэширования паролей с солью
✅ Модуль аутентификации с JWT токенами
✅ Модуль авторизации на основе ролей
✅ Модуль управления сессиями
✅ Смена пароля пользователем
✅ Многофакторная аутентификация
✅ Документация кода

Система готова к использованию и может быть расширена для продакшена.

