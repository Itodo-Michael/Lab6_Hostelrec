from collections.abc import Sequence
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.stats import OccupancyStats, RevenueSlice


async def get_occupancy(session: AsyncSession) -> OccupancyStats:
    # Try to use the view if it exists, otherwise calculate from rooms table
    try:
        result = await session.execute(text("select * from v_room_occupancy_today limit 1"))
        row = result.mappings().first()
        if row:
            return OccupancyStats(**row)
    except Exception:
        # View doesn't exist, rollback and calculate from rooms table
        await session.rollback()
    
    # Fallback: Calculate occupancy from rooms table
    try:
        result = await session.execute(
            text("""
                SELECT 
                    COUNT(*) FILTER (WHERE status = 'available') as available_rooms,
                    COUNT(*) FILTER (WHERE status = 'occupied') as occupied_rooms,
                    COUNT(*) as total_rooms
                FROM rooms
            """)
        )
        row = result.mappings().first()
        if not row:
            # Return default values if no rooms exist
            return OccupancyStats(
                occupancy_rate=0.0,
                available_rooms=0,
                occupied_rooms=0
            )
        
        total = row["total_rooms"] or 0
        occupied = row["occupied_rooms"] or 0
        available = row["available_rooms"] or 0
        
        occupancy_rate = (occupied / total) if total > 0 else 0.0
        
        return OccupancyStats(
            occupancy_rate=occupancy_rate,
            available_rooms=available,
            occupied_rooms=occupied
        )
    except Exception:
        # If fallback also fails, rollback and return defaults
        await session.rollback()
        return OccupancyStats(
            occupancy_rate=0.0,
            available_rooms=0,
            occupied_rooms=0
        )


async def get_revenue(session: AsyncSession) -> Sequence[RevenueSlice]:
    # Try to use the view if it exists, otherwise return empty list
    try:
        result = await session.execute(text("select * from v_revenue_by_room_type"))
        rows = result.mappings().all()
        if rows:
            return [RevenueSlice(**row) for row in rows]
    except Exception:
        # View doesn't exist, rollback and return empty list
        await session.rollback()
    
    # Fallback: Return empty list if view doesn't exist
    return []


