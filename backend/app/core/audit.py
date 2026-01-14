"""Helper functions for audit logging"""
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def set_audit_user(session: AsyncSession, username: str) -> None:
    """
    Set the current user for audit logging in the database session.
    Uses a temporary table to store the username for the trigger to access.
    This approach works reliably across all PostgreSQL versions.
    """
    try:
        # Create a temporary table to store the current user for this transaction
        # ON COMMIT DROP ensures it's cleaned up automatically
        await session.execute(
            text("""
                CREATE TEMP TABLE IF NOT EXISTS _audit_current_user (
                    username VARCHAR(255) PRIMARY KEY
                ) ON COMMIT DROP
            """)
        )
        # Clear any existing value and insert the new one
        await session.execute(text("DELETE FROM _audit_current_user"))
        await session.execute(
            text("INSERT INTO _audit_current_user (username) VALUES (:username)"),
            {"username": username}
        )
    except Exception:
        # If setting fails, the trigger will default to 'system'
        # Don't block the request - audit logging is important but not critical
        pass



