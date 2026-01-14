from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user, require_role
from app.db.session import get_db
from app.schemas.stats import OccupancyStats, RevenueSlice
from app.services.stats_service import get_occupancy, get_revenue

router = APIRouter()


@router.get("/occupancy", response_model=OccupancyStats)
async def occupancy(session: AsyncSession = Depends(get_db)):
    return await get_occupancy(session)


@router.get("/revenue", response_model=list[RevenueSlice])
async def revenue(
    session: AsyncSession = Depends(get_db),
    _manager=Depends(require_role("manager")),
):
    return await get_revenue(session)

