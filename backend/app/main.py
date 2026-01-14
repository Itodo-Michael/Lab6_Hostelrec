from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, text
from pathlib import Path

from app.api.routes import api_router
from app.core.config import get_settings
from app.core.security import get_password_hash
from app.db.session import AsyncSessionLocal
from app.models import User

settings = get_settings()

app = FastAPI(title=settings.project_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def create_default_admin() -> None:
    """Ensure a default manager account exists for initial login."""
    async with AsyncSessionLocal() as session:
        try:
            # Commit any pending transactions first
            await session.commit()
        except Exception:
            await session.rollback()
        # Ensure core tables exist (simple bootstrap, not a full migration system).
        # asyncpg does not allow multiple SQL commands in a single prepared statement,
        # so we execute each CREATE TABLE separately.
        await session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS hostel_users (
                    id SERIAL PRIMARY KEY,
                    username VARCHAR(255) UNIQUE NOT NULL,
                    password VARCHAR(255) NOT NULL,
                    role VARCHAR(50) NOT NULL
                )
                """
            )
        )
        # Добавить колонки MFA к существующей таблице (если их еще нет)
        # Используем DO блок для проверки существования колонок
        await session.execute(
            text("""
                DO $$ 
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                   WHERE table_name='hostel_users' AND column_name='mfa_enabled') THEN
                        ALTER TABLE hostel_users ADD COLUMN mfa_enabled BOOLEAN DEFAULT false;
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                                   WHERE table_name='hostel_users' AND column_name='mfa_secret') THEN
                        ALTER TABLE hostel_users ADD COLUMN mfa_secret VARCHAR(255);
                    END IF;
                END $$;
            """)
        )
        await session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS user_sessions (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES hostel_users(id) ON DELETE CASCADE,
                    token VARCHAR(500) UNIQUE NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    last_activity TIMESTAMPTZ NOT NULL DEFAULT now(),
                    expires_at TIMESTAMPTZ NOT NULL,
                    is_active BOOLEAN DEFAULT true,
                    ip_address VARCHAR(45),
                    user_agent TEXT
                )
                """
            )
        )
        # Создать индексы отдельно (asyncpg не поддерживает несколько команд в одном запросе)
        await session.execute(
            text("CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id)")
        )
        await session.execute(
            text("CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token)")
        )
        await session.execute(
            text("CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at)")
        )
        await session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS staff_attendance (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES hostel_users(id) ON DELETE CASCADE,
                    work_date DATE NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    CONSTRAINT uq_staff_attendance_user_date UNIQUE (user_id, work_date)
                )
                """
            )
        )
        await session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS customer_profiles (
                    user_id INTEGER PRIMARY KEY REFERENCES hostel_users(id) ON DELETE CASCADE,
                    full_name VARCHAR(255),
                    room_number VARCHAR(50),
                    floor INTEGER,
                    likes_food BOOLEAN,
                    likes_water BOOLEAN,
                    notes TEXT,
                    profile_picture_url TEXT
                )
                """
            )
        )
        await session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS customer_orders (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES hostel_users(id) ON DELETE CASCADE,
                    item_name VARCHAR(255) NOT NULL,
                    category VARCHAR(50) NOT NULL,
                    quantity INTEGER NOT NULL DEFAULT 1,
                    status VARCHAR(50) NOT NULL DEFAULT 'pending',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
        )
        await session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS chat_messages (
                    id SERIAL PRIMARY KEY,
                    user_id INTEGER NOT NULL REFERENCES hostel_users(id) ON DELETE CASCADE,
                    username VARCHAR(255) NOT NULL,
                    message TEXT NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
        )
        await session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS room_images (
                    id SERIAL PRIMARY KEY,
                    room_number VARCHAR(50) NOT NULL,
                    image_url TEXT NOT NULL,
                    description TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
        )
        await session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS rooms (
                    id SERIAL PRIMARY KEY,
                    room_number VARCHAR(50) UNIQUE NOT NULL,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    price DECIMAL(10, 2) NOT NULL,
                    location VARCHAR(255),
                    wifi BOOLEAN DEFAULT true,
                    features TEXT[],  -- Array of feature strings
                    image_url TEXT,
                    status VARCHAR(50) DEFAULT 'available',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
        )
        await session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS food_items (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    price DECIMAL(10, 2) NOT NULL,
                    image_url TEXT,
                    category VARCHAR(50) DEFAULT 'food',
                    available BOOLEAN DEFAULT true,
                    is_tea BOOLEAN DEFAULT false,
                    contains_alcohol BOOLEAN DEFAULT false,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
        )
        await session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS drink_items (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    description TEXT,
                    price DECIMAL(10, 2) NOT NULL,
                    image_url TEXT,
                    category VARCHAR(50) DEFAULT 'drink',
                    available BOOLEAN DEFAULT true,
                    is_tea BOOLEAN DEFAULT false,
                    contains_alcohol BOOLEAN DEFAULT false,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
        )
        await session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS events (
                    id SERIAL PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    event_date TIMESTAMPTZ NOT NULL,
                    image_url TEXT,
                    location VARCHAR(255),
                    active BOOLEAN DEFAULT true,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
        )
        await session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS promos (
                    id SERIAL PRIMARY KEY,
                    title VARCHAR(255) NOT NULL,
                    description TEXT,
                    discount_percent INTEGER,
                    discount_amount DECIMAL(10, 2),
                    code VARCHAR(50) UNIQUE,
                    valid_from TIMESTAMPTZ NOT NULL,
                    valid_until TIMESTAMPTZ NOT NULL,
                    image_url TEXT,
                    active BOOLEAN DEFAULT true,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
        )
        await session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS guest_checkins (
                    id SERIAL PRIMARY KEY,
                    guest_name VARCHAR(255) NOT NULL,
                    guest_email VARCHAR(255),
                    guest_passport VARCHAR(255),
                    room_number VARCHAR(50) NOT NULL,
                    check_in_date TIMESTAMPTZ NOT NULL DEFAULT now(),
                    check_out_date TIMESTAMPTZ,
                    status VARCHAR(50) NOT NULL DEFAULT 'checked_in',
                    notes TEXT,
                    checked_in_by INTEGER REFERENCES hostel_users(id),
                    checked_out_by INTEGER REFERENCES hostel_users(id),
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
        )
        # Create guests table for bookings
        await session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS guests (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(255) NOT NULL,
                    passport_number VARCHAR(255) NOT NULL,
                    phone_number VARCHAR(50) NOT NULL,
                    email VARCHAR(255),
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    CONSTRAINT guests_passport_unique UNIQUE (passport_number)
                )
                """
            )
        )
        # Ensure unique constraint exists (in case table exists without constraint)
        await session.execute(
            text(
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint 
                        WHERE conname = 'guests_passport_unique'
                    ) THEN
                        ALTER TABLE guests 
                        ADD CONSTRAINT guests_passport_unique UNIQUE (passport_number);
                    END IF;
                END $$;
                """
            )
        )
        await session.commit()
        
        # Create bookings table (must be after guests table)
        await session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS bookings (
                    id SERIAL PRIMARY KEY,
                    guest_id INTEGER NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
                    room_id INTEGER NOT NULL,
                    check_in DATE NOT NULL,
                    check_out DATE NOT NULL,
                    status VARCHAR(50) NOT NULL DEFAULT 'pending',
                    payment_method VARCHAR(50),
                    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
                    total_amount DECIMAL(10, 2),
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    CONSTRAINT valid_dates CHECK (check_out > check_in)
                )
                """
            )
        )
        # Ensure constraint exists
        await session.execute(
            text(
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_constraint 
                        WHERE conname = 'valid_dates'
                    ) THEN
                        ALTER TABLE bookings 
                        ADD CONSTRAINT valid_dates CHECK (check_out > check_in);
                    END IF;
                END $$;
                """
            )
        )
        await session.commit()
        # Create payments table
        await session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS payments (
                    id SERIAL PRIMARY KEY,
                    booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
                    order_id INTEGER REFERENCES customer_orders(id) ON DELETE CASCADE,
                    amount DECIMAL(10, 2) NOT NULL,
                    payment_method VARCHAR(50) NOT NULL,
                    payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
                    transaction_id VARCHAR(255),
                    notes TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
        )
        # Create audit log table
        await session.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS hostel_audit_log (
                    id SERIAL PRIMARY KEY,
                    event_time TIMESTAMPTZ NOT NULL DEFAULT now(),
                    username VARCHAR(255) NOT NULL DEFAULT 'system',
                    action VARCHAR(50) NOT NULL,
                    table_name VARCHAR(255),
                    record_id INTEGER,
                    details TEXT,
                    ip_address VARCHAR(45)
                )
                """
            )
        )
        # Alter existing table to add ip_address column if it doesn't exist
        await session.execute(
            text(
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_name = 'hostel_audit_log' 
                        AND column_name = 'ip_address'
                    ) THEN
                        ALTER TABLE hostel_audit_log ADD COLUMN ip_address VARCHAR(45);
                    END IF;
                    -- Make table_name nullable for auth logs
                    ALTER TABLE hostel_audit_log ALTER COLUMN table_name DROP NOT NULL;
                END $$;
                """
            )
        )
        # Alter existing table to add default if it doesn't have one
        await session.execute(
            text(
                """
                DO $$
                BEGIN
                    -- Check if default doesn't exist and add it
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_attrdef 
                        WHERE adrelid = 'hostel_audit_log'::regclass 
                        AND adnum = (SELECT attnum FROM pg_attribute 
                                     WHERE attrelid = 'hostel_audit_log'::regclass 
                                     AND attname = 'username')
                    ) THEN
                        ALTER TABLE hostel_audit_log 
                        ALTER COLUMN username SET DEFAULT 'system';
                    END IF;
                END $$;
                """
            )
        )
        await session.commit()
        
        # Verify that guests and bookings tables exist
        try:
            await session.execute(text("SELECT 1 FROM guests LIMIT 1"))
            await session.execute(text("SELECT 1 FROM bookings LIMIT 1"))
            print("✓ Guests and bookings tables verified successfully")
        except Exception as e:
            print(f"⚠ Warning: Could not verify guests/bookings tables: {e}")
            # Try to create them again
            try:
                await session.execute(
                    text(
                        """
                        CREATE TABLE IF NOT EXISTS guests (
                            id SERIAL PRIMARY KEY,
                            name VARCHAR(255) NOT NULL,
                            passport_number VARCHAR(255) NOT NULL,
                            phone_number VARCHAR(50) NOT NULL,
                            email VARCHAR(255),
                            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                        )
                        """
                    )
                )
                await session.execute(
                    text(
                        """
                        DO $$
                        BEGIN
                            IF NOT EXISTS (
                                SELECT 1 FROM pg_constraint 
                                WHERE conname = 'guests_passport_unique'
                            ) THEN
                                ALTER TABLE guests 
                                ADD CONSTRAINT guests_passport_unique UNIQUE (passport_number);
                            END IF;
                        END $$;
                        """
                    )
                )
                await session.execute(
                    text(
                        """
                        CREATE TABLE IF NOT EXISTS bookings (
                            id SERIAL PRIMARY KEY,
                            guest_id INTEGER NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
                            room_id INTEGER NOT NULL,
                            check_in DATE NOT NULL,
                            check_out DATE NOT NULL,
                            status VARCHAR(50) NOT NULL DEFAULT 'pending',
                            payment_method VARCHAR(50),
                            payment_status VARCHAR(50) NOT NULL DEFAULT 'pending',
                            total_amount DECIMAL(10, 2),
                            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                        )
                        """
                    )
                )
                await session.commit()
                print("✓ Guests and bookings tables created successfully on retry")
            except Exception as retry_error:
                print(f"✗ Error creating guests/bookings tables on retry: {retry_error}")
                await session.rollback()
        
        # Create audit trigger function
        await session.execute(
            text(
                """
                CREATE OR REPLACE FUNCTION log_audit_event()
                RETURNS TRIGGER AS $$
                DECLARE
                    current_user_name VARCHAR(255);
                    action_type VARCHAR(50);
                    record_details TEXT;
                BEGIN
                    -- Get current username from temp table or use 'system'
                    -- Initialize with 'system' as default
                    current_user_name := 'system';
                    -- Try to get from temp table (set by set_audit_user function)
                    BEGIN
                        SELECT username INTO current_user_name 
                        FROM _audit_current_user 
                        LIMIT 1;
                        -- If empty string or null, use 'system'
                        IF current_user_name IS NULL OR current_user_name = '' THEN
                            current_user_name := 'system';
                        END IF;
                    EXCEPTION WHEN OTHERS THEN
                        -- If temp table doesn't exist or any error, use 'system'
                        current_user_name := 'system';
                    END;
                    
                    IF TG_OP = 'INSERT' THEN
                        action_type := 'INSERT';
                        record_details := row_to_json(NEW)::TEXT;
                    ELSIF TG_OP = 'UPDATE' THEN
                        action_type := 'UPDATE';
                        record_details := 'OLD: ' || row_to_json(OLD)::TEXT || ' | NEW: ' || row_to_json(NEW)::TEXT;
                    ELSIF TG_OP = 'DELETE' THEN
                        action_type := 'DELETE';
                        record_details := row_to_json(OLD)::TEXT;
                    END IF;
                    
                    -- Try to insert into audit log, but don't abort transaction if it fails
                    BEGIN
                        INSERT INTO hostel_audit_log (username, action, table_name, record_id, details)
                        VALUES (
                            current_user_name,
                            action_type,
                            TG_TABLE_NAME,
                            COALESCE((NEW.id), (OLD.id)),
                            record_details
                        );
                    EXCEPTION WHEN OTHERS THEN
                        -- If audit log insert fails, log the error but don't abort the transaction
                        -- This ensures the main operation can complete even if audit logging fails
                        RAISE WARNING 'Audit log insert failed: %', SQLERRM;
                        -- Continue execution - don't re-raise the exception
                    END;
                    
                    IF TG_OP = 'DELETE' THEN
                        RETURN OLD;
                    ELSE
                        RETURN NEW;
                    END IF;
                END;
                $$ LANGUAGE plpgsql;
                """
            )
        )
        await session.commit()
        
        # Create triggers for key tables
        tables_to_audit = [
            'rooms',
            'food_items',
            'drink_items',
            'events',
            'promos',
            'customer_orders',
            'guest_checkins',
            'guests',
            'bookings',
            'payments',
            'hostel_users'
        ]
        
        for table_name in tables_to_audit:
            # Drop existing trigger if it exists
            await session.execute(
                text(f"DROP TRIGGER IF EXISTS audit_trigger_{table_name} ON {table_name}")
            )
            # Create new trigger
            await session.execute(
                text(
                    f"""
                    CREATE TRIGGER audit_trigger_{table_name}
                    AFTER INSERT OR UPDATE OR DELETE ON {table_name}
                    FOR EACH ROW
                    EXECUTE FUNCTION log_audit_event()
                    """
                )
            )
        await session.commit()

        result = await session.execute(
            select(User).where(User.username == "itodomichael00@gmail.com")
        )
        user = result.scalar_one_or_none()
        if not user:
            admin = User(
                username="itodomichael00@gmail.com",
                password=get_password_hash("Mike07it"),
                role="manager",
            )
            session.add(admin)
            await session.commit()


app.include_router(api_router)

# Serve uploaded files
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/healthz")
async def health_check():
    return {"status": "ok", "environment": settings.environment}

