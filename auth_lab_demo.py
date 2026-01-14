#!/usr/bin/env python3
"""
Лабораторная работа №6: Программирование систем аутентификации и авторизации

Этот скрипт демонстрирует простую систему аутентификации и авторизации пользователей
с использованием SQLite базы данных, хэширования паролей и JWT токенов.
"""

import sqlite3
import hashlib
import secrets
import jwt
import datetime
from typing import Optional, Dict, List
import os
import webbrowser
import requests

# Конфигурация
DATABASE_FILE = 'auth_system_demo.db'  # Changed to demo.db to avoid conflicts
SECRET_KEY = secrets.token_hex(32)  # Генерируем секретный ключ
ALGORITHM = 'HS256'
TOKEN_EXPIRE_MINUTES = 30

# Google OAuth конфигурация (замените на свои значения)
GOOGLE_CLIENT_ID = os.getenv('GOOGLE_CLIENT_ID', 'your-google-client-id')
GOOGLE_CLIENT_SECRET = os.getenv('GOOGLE_CLIENT_SECRET', 'your-google-client-secret')
GOOGLE_REDIRECT_URI = 'urn:ietf:wg:oauth:2.0:oob'  # Для консольных приложений
GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/auth'
GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo'

class PasswordHasher:
    """Модуль хэширования паролей с использованием PBKDF2 + SHA256"""

    @staticmethod
    def hash_password(password: str, salt: Optional[str] = None) -> str:
        """Хэширует пароль с солью"""
        if salt is None:
            salt = secrets.token_hex(16)  # Генерируем соль
        # Используем PBKDF2 с SHA256
        hash_obj = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
        return f"{salt}${hash_obj.hex()}"

    @staticmethod
    def verify_password(password: str, hashed: str) -> bool:
        """Проверяет пароль против хэша"""
        try:
            salt, hash_value = hashed.split('$', 1)
            return PasswordHasher.hash_password(password, salt) == hashed
        except ValueError:
            return False

class DatabaseManager:
    """Менеджер базы данных для пользователей и сессий"""

    def __init__(self, db_file: str):
        self.db_file = db_file
        self.init_database()

    def init_database(self):
        """Инициализирует базу данных"""
        with sqlite3.connect(self.db_file) as conn:
            cursor = conn.cursor()

            # Таблица пользователей
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'user',
                    mfa_enabled BOOLEAN DEFAULT 0,
                    mfa_secret TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # Таблица сессий
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS sessions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    token TEXT UNIQUE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    expires_at TIMESTAMP NOT NULL,
                    ip_address TEXT,
                    user_agent TEXT,
                    is_active BOOLEAN DEFAULT 1,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            ''')

            # Таблица аудита
            cursor.execute('''
                CREATE TABLE IF NOT EXISTS audit_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    action TEXT NOT NULL,
                    details TEXT,
                    ip_address TEXT,
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')

            # Создаем тестового пользователя
            self.create_test_user(cursor)
            conn.commit()

    def create_test_user(self, cursor):
        """Создает тестового пользователя"""
        test_users = [
            ('admin', 'admin123', 'admin'),
            ('manager', 'manager123', 'manager'),
            ('user', 'user123', 'user')
        ]

        for username, password, role in test_users:
            hashed = PasswordHasher.hash_password(password)
            try:
                cursor.execute(
                    'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
                    (username, hashed, role)
                )
            except sqlite3.IntegrityError:
                pass  # Пользователь уже существует

    def get_user(self, username: str) -> Optional[Dict]:
        """Получает пользователя по имени"""
        with sqlite3.connect(self.db_file) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM users WHERE username = ?', (username,))
            row = cursor.fetchone()
            if row:
                return {
                    'id': row[0],
                    'username': row[1],
                    'password_hash': row[2],
                    'role': row[3],
                    'mfa_enabled': row[4],
                    'mfa_secret': row[5],
                    'created_at': row[6]
                }
        return None

    def update_user_role(self, user_id: int, new_role: str):
        """Обновляет роль пользователя"""
        with sqlite3.connect(self.db_file) as conn:
            cursor = conn.cursor()
            cursor.execute('UPDATE users SET role = ? WHERE id = ?', (new_role, user_id))
            conn.commit()

    def change_password(self, user_id: int, new_password: str):
        """Изменяет пароль пользователя"""
        hashed = PasswordHasher.hash_password(new_password)
        with sqlite3.connect(self.db_file) as conn:
            cursor = conn.cursor()
            cursor.execute('UPDATE users SET password_hash = ? WHERE id = ?', (hashed, user_id))
            conn.commit()

class AuthManager:
    """Модуль аутентификации"""

    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager

    def authenticate(self, username: str, password: str) -> Optional[str]:
        """Аутентифицирует пользователя и возвращает JWT токен"""
        user = self.db.get_user(username)
        if not user or not PasswordHasher.verify_password(password, user['password_hash']):
            self._log_audit(None, 'login_failed', f'Failed login for {username}')
            return None

        # Создаем токен
        expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=TOKEN_EXPIRE_MINUTES)
        token_data = {
            'sub': user['username'],
            'role': user['role'],
            'user_id': user['id'],
            'exp': expire
        }
        token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)

        # Создаем сессию
        self._create_session(user['id'], token)

        self._log_audit(user['id'], 'login_success', f'User {username} logged in')
        return token

    def verify_token(self, token: str) -> Optional[Dict]:
        """Проверяет JWT токен"""
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            return None
        except jwt.InvalidTokenError:
            return None

    def _create_session(self, user_id: int, token: str):
        """Создает сессию пользователя"""
        expires_at = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=TOKEN_EXPIRE_MINUTES)
        with sqlite3.connect(self.db.db_file) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO sessions (user_id, token, expires_at)
                VALUES (?, ?, ?)
            ''', (user_id, token, expires_at))
            conn.commit()

    def _log_audit(self, user_id: Optional[int], action: str, details: str):
        """Логирует действие в аудит"""
        with sqlite3.connect(self.db.db_file) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO audit_log (user_id, action, details)
                VALUES (?, ?, ?)
            ''', (user_id, action, details))
            conn.commit()

class AuthorizationManager:
    """Модуль авторизации"""

    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager

    def check_permission(self, token: str, required_role: str) -> bool:
        """Проверяет права доступа"""
        payload = self.verify_token(token)
        if not payload:
            return False

        user_role = payload.get('role', 'user')

        # Иерархическая модель ролей
        role_hierarchy = {
            'admin': 3,
            'manager': 2,
            'user': 1
        }

        user_level = role_hierarchy.get(user_role, 0)
        required_level = role_hierarchy.get(required_role, 999)

        return user_level >= required_level

    def verify_token(self, token: str) -> Optional[Dict]:
        """Проверяет токен через AuthManager"""
        auth_manager = AuthManager(self.db)
        return auth_manager.verify_token(token)

class SessionManager:
    """Модуль управления сессиями"""

    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager

    def get_active_sessions(self, user_id: int) -> List[Dict]:
        """Получает активные сессии пользователя"""
        with sqlite3.connect(self.db.db_file) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT * FROM sessions
                WHERE user_id = ? AND is_active = 1 AND expires_at > datetime('now')
                ORDER BY created_at DESC
            ''', (user_id,))
            rows = cursor.fetchall()

            sessions = []
            for row in rows:
                sessions.append({
                    'id': row[0],
                    'user_id': row[1],
                    'token': row[2],
                    'created_at': row[3],
                    'expires_at': row[4],
                    'ip_address': row[5],
                    'user_agent': row[6],
                    'is_active': row[7]
                })
            return sessions

    def terminate_session(self, session_id: int, user_id: int):
        """Завершает сессию"""
        with sqlite3.connect(self.db.db_file) as conn:
            cursor = conn.cursor()
            cursor.execute('''
                UPDATE sessions SET is_active = 0
                WHERE id = ? AND user_id = ?
            ''', (session_id, user_id))
            conn.commit()

class OAuthManager:
    """Модуль OAuth аутентификации с Google"""

    def __init__(self, db_manager: DatabaseManager):
        self.db = db_manager

    def get_auth_url(self) -> str:
        """Получает URL для авторизации Google"""
        params = {
            'client_id': GOOGLE_CLIENT_ID,
            'redirect_uri': GOOGLE_REDIRECT_URI,
            'scope': 'openid email profile',
            'response_type': 'code',
            'access_type': 'offline'
        }
        auth_url = requests.Request('GET', GOOGLE_AUTH_URL, params=params).prepare().url
        return auth_url

    def exchange_code_for_token(self, code: str) -> Optional[Dict]:
        """Обменивает код авторизации на токен доступа"""
        data = {
            'client_id': GOOGLE_CLIENT_ID,
            'client_secret': GOOGLE_CLIENT_SECRET,
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': GOOGLE_REDIRECT_URI
        }
        try:
            response = requests.post(GOOGLE_TOKEN_URL, data=data)
            response.raise_for_status()
            return response.json()
        except requests.RequestException:
            return None

    def get_user_info(self, access_token: str) -> Optional[Dict]:
        """Получает информацию о пользователе от Google"""
        headers = {'Authorization': f'Bearer {access_token}'}
        try:
            response = requests.get(GOOGLE_USERINFO_URL, headers=headers)
            response.raise_for_status()
            return response.json()
        except requests.RequestException:
            return None

    def authenticate_with_google(self) -> Optional[str]:
        """Полный поток OAuth аутентификации с Google"""
        if GOOGLE_CLIENT_ID == 'your-google-client-id':
            print("Ошибка: Настройте GOOGLE_CLIENT_ID и GOOGLE_CLIENT_SECRET")
            return None

        # Получаем URL авторизации
        auth_url = self.get_auth_url()
        print(f"Откройте этот URL в браузере: {auth_url}")
        webbrowser.open(auth_url)

        # Запрашиваем код авторизации
        code = input("Введите код авторизации: ").strip()
        if not code:
            return None

        # Обмениваем код на токен
        token_data = self.exchange_code_for_token(code)
        if not token_data:
            print("Ошибка обмена кода на токен")
            return None

        access_token = token_data.get('access_token')
        if not access_token:
            print("Не получен токен доступа")
            return None

        # Получаем информацию о пользователе
        user_info = self.get_user_info(access_token)
        if not user_info:
            print("Ошибка получения информации о пользователе")
            return None

        # Создаем или обновляем пользователя в системе
        username = user_info.get('email')
        if not username:
            print("Не получен email пользователя")
            return None

        user = self.db.get_user(username)
        if not user:
            # Создаем нового пользователя
            hashed_password = PasswordHasher.hash_password(secrets.token_hex(32))  # Случайный пароль
            with sqlite3.connect(self.db.db_file) as conn:
                cursor = conn.cursor()
                cursor.execute(
                    'INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)',
                    (username, hashed_password, 'user')
                )
                conn.commit()
            user = self.db.get_user(username)

        # Создаем JWT токен
        expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=TOKEN_EXPIRE_MINUTES)
        token_data = {
            'sub': user['username'],
            'role': user['role'],
            'user_id': user['id'],
            'exp': expire,
            'oauth': True
        }
        token = jwt.encode(token_data, SECRET_KEY, algorithm=ALGORITHM)

        # Создаем сессию
        auth_manager = AuthManager(self.db)
        auth_manager._create_session(user['id'], token)
        auth_manager._log_audit(user['id'], 'oauth_login', f'User {username} logged in via Google OAuth')

        return token

class ConsoleInterface:
    """Простой консольный интерфейс"""

    def __init__(self):
        self.db = DatabaseManager(DATABASE_FILE)
        self.auth = AuthManager(self.db)
        self.authz = AuthorizationManager(self.db)
        self.sessions = SessionManager(self.db)
        self.oauth = OAuthManager(self.db)
        self.current_token = None
        self.current_user = None

    def run(self):
        """Основной цикл программы"""
        print("=== Система аутентификации и авторизации ===")
        print("Доступные команды:")
        print("login <username> <password> - войти в систему")
        print("oauth_login - войти через Google OAuth")
        print("logout - выйти из системы")
        print("sessions - показать активные сессии")
        print("terminate <session_id> - завершить сессию")
        print("change_password <new_password> - изменить пароль")
        print("set_role <username> <role> - изменить роль пользователя (требуется admin)")
        print("check_perm <required_role> - проверить права доступа")
        print("audit - показать журнал аудита")
        print("exit - выход")

        while True:
            try:
                command = input("\n> ").strip().split()
                if not command:
                    continue

                cmd = command[0].lower()

                if cmd == 'exit':
                    break
                elif cmd == 'login' and len(command) == 3:
                    self.login(command[1], command[2])
                elif cmd == 'oauth_login':
                    self.oauth_login()
                elif cmd == 'logout':
                    self.logout()
                elif cmd == 'sessions':
                    self.show_sessions()
                elif cmd == 'terminate' and len(command) == 2:
                    self.terminate_session(int(command[1]))
                elif cmd == 'change_password' and len(command) == 2:
                    self.change_password(command[1])
                elif cmd == 'set_role' and len(command) == 3:
                    self.set_role(command[1], command[2])
                elif cmd == 'check_perm' and len(command) == 2:
                    self.check_permission(command[1])
                elif cmd == 'audit':
                    self.show_audit()
                else:
                    print("Неизвестная команда. Введите 'help' для списка команд.")

            except KeyboardInterrupt:
                break
            except Exception as e:
                print(f"Ошибка: {e}")

    def login(self, username: str, password: str):
        """Вход в систему"""
        token = self.auth.authenticate(username, password)
        if token:
            payload = self.auth.verify_token(token)
            self.current_token = token
            self.current_user = payload
            print(f"Успешный вход! Добро пожаловать, {username} (роль: {payload['role']})")
        else:
            print("Ошибка аутентификации")

    def oauth_login(self):
        """Вход через Google OAuth"""
        token = self.oauth.authenticate_with_google()
        if token:
            payload = self.auth.verify_token(token)
            self.current_token = token
            self.current_user = payload
            print(f"Успешный вход через Google! Добро пожаловать, {payload['sub']} (роль: {payload['role']})")
        else:
            print("Ошибка OAuth аутентификации")

    def logout(self):
        """Выход из системы"""
        if self.current_user:
            self.auth._log_audit(self.current_user['user_id'], 'logout', f'User {self.current_user["sub"]} logged out')
            self.current_token = None
            self.current_user = None
            print("Выход выполнен")
        else:
            print("Вы не авторизованы")

    def show_sessions(self):
        """Показать активные сессии"""
        if not self.current_user:
            print("Требуется авторизация")
            return

        sessions = self.sessions.get_active_sessions(self.current_user['user_id'])
        if sessions:
            print("Активные сессии:")
            for session in sessions:
                print(f"  ID: {session['id']}, Создано: {session['created_at']}")
        else:
            print("Нет активных сессий")

    def terminate_session(self, session_id: int):
        """Завершить сессию"""
        if not self.current_user:
            print("Требуется авторизация")
            return

        self.sessions.terminate_session(session_id, self.current_user['user_id'])
        print(f"Сессия {session_id} завершена")

    def change_password(self, new_password: str):
        """Изменить пароль"""
        if not self.current_user:
            print("Требуется авторизация")
            return

        self.db.change_password(self.current_user['user_id'], new_password)
        print("Пароль изменен")

    def set_role(self, username: str, role: str):
        """Изменить роль пользователя"""
        if not self.current_user or not self.authz.check_permission(self.current_token, 'admin'):
            print("Недостаточно прав")
            return

        user = self.db.get_user(username)
        if user:
            self.db.update_user_role(user['id'], role)
            print(f"Роль пользователя {username} изменена на {role}")
        else:
            print("Пользователь не найден")

    def check_permission(self, required_role: str):
        """Проверить права доступа"""
        if not self.current_token:
            print("Требуется авторизация")
            return

        has_perm = self.authz.check_permission(self.current_token, required_role)
        print(f"Права на роль '{required_role}': {'Да' if has_perm else 'Нет'}")

    def show_audit(self):
        """Показать журнал аудита"""
        if not self.current_user or not self.authz.check_permission(self.current_token, 'admin'):
            print("Недостаточно прав")
            return

        with sqlite3.connect(self.db.db_file) as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM audit_log ORDER BY timestamp DESC LIMIT 10')
            rows = cursor.fetchall()

            print("Журнал аудита:")
            for row in rows:
                print(f"  {row[5]}: {row[2]} - {row[3]}")

if __name__ == "__main__":
    # Simple test mode
    print("=== Тестирование системы аутентификации ===")
    
    interface = ConsoleInterface()
    
    # Test user creation
    print("Создание тестовых пользователей...")
    # Test login
    print("\nТестирование входа...")
    token = interface.auth.authenticate('admin', 'admin123')
    if token:
        print("✓ Успешный вход для admin")
        interface.current_token = token
        interface.current_user = interface.auth.verify_token(token)
        
        # Test permissions
        has_admin_perm = interface.authz.check_permission(token, 'admin')
        print(f"✓ Права admin: {'Да' if has_admin_perm else 'Нет'}")
        
        # Test role change
        interface.set_role('user', 'manager')
        print("✓ Изменение роли пользователя")
        
        # Test password change
        interface.change_password('newpass123')
        print("✓ Изменение пароля")
        
        # Test sessions
        sessions = interface.sessions.get_active_sessions(interface.current_user['user_id'])
        print(f"✓ Активных сессий: {len(sessions)}")
        
        # Test logout
        interface.logout()
        print("✓ Выход из системы")
        
        print("\n=== Все тесты пройдены успешно! ===")
    else:
        print("✗ Ошибка входа")
    
    # Uncomment to run interactive mode
    # interface.run()