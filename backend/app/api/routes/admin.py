from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.core.security import require_role
from app.db.session import get_db
from app.services import admin_service

router = APIRouter()


@router.get("/logs")
async def audit_logs(
    session: AsyncSession = Depends(get_db),
    _manager=Depends(require_role("manager")),
):
    return await admin_service.fetch_audit_logs(session)


@router.get("/security/api-keys")
async def reveal_api_keys(
    secret_phrase: str,
    session: AsyncSession = Depends(get_db),
    _manager=Depends(require_role("manager")),
):
    settings = get_settings()
    if secret_phrase != settings.super_secret_phrase:
        raise HTTPException(status_code=403, detail="Invalid secret phrase")
    return await admin_service.fetch_api_keys(session, super_secret=secret_phrase)

