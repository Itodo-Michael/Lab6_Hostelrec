from sqlalchemy import text
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession


async def fetch_audit_logs(session: AsyncSession) -> list[dict]:
    """
    Fetch recent audit logs.
    If the underlying table doesn't exist yet (lab DB not initialized),
    return an empty list instead of crashing the API.
    """
    try:
        result = await session.execute(
            text("select * from hostel_audit_log order by event_time desc limit 200")
        )
        return [dict(row) for row in result.mappings().all()]
    except ProgrammingError as exc:
        # Gracefully handle missing audit table in lab environments
        if "hostel_audit_log" in str(exc.orig):
            return []
        raise


async def fetch_api_keys(session: AsyncSession, *, super_secret: str) -> list[dict]:
    result = await session.execute(
        text(
            """
            select integration_name,
                   pgp_sym_decrypt(api_key::bytea, :super_secret) as api_key
            from api_integration_keys
            order by integration_name
            """
        ),
        {"super_secret": super_secret},
    )
    return [dict(row) for row in result.mappings().all()]


