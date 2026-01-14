from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Optional

from app.core.security import get_current_user, require_role, TokenPayload
from app.core.audit import set_audit_user
from app.db.session import get_db
from app.schemas.booking import BookingCreate, BookingResponse
from app.services.booking_service import create_booking

router = APIRouter()


@router.post("/", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking_endpoint(
    payload: BookingCreate,
    session: AsyncSession = Depends(get_db),
) -> BookingResponse:
    """
    Create a booking. Public endpoint - anyone can book a room without authentication.
    """
    try:
        # Set audit user - use guest name for tracking
        username = f"guest_{payload.guest_name.replace(' ', '_').lower()}"
        if hasattr(payload, 'guest_email') and payload.guest_email:
            username = payload.guest_email
        
        await set_audit_user(session, username)
        return await create_booking(session, payload, username)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/my", response_model=List[dict])
async def get_my_bookings(
    passport_number: Optional[str] = None,
    phone_number: Optional[str] = None,
    session: AsyncSession = Depends(get_db),
) -> List[dict]:
    """
    Get bookings for a guest by passport number or phone number.
    Public endpoint - guests can view their own bookings without authentication.
    """
    if not passport_number and not phone_number:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either passport_number or phone_number must be provided"
        )
    
    query = """
        SELECT 
            b.id AS booking_id,
            b.room_id,
            b.check_in,
            b.check_out,
            b.status AS booking_status,
            b.payment_method,
            b.payment_status,
            b.total_amount,
            b.created_at AS booking_created_at,
            b.updated_at AS booking_updated_at,
            g.id AS guest_id,
            g.name AS guest_name,
            g.passport_number AS guest_passport,
            g.phone_number AS guest_phone,
            g.email AS guest_email,
            r.room_number,
            r.title AS room_title,
            r.price AS room_price,
            r.location AS room_location
        FROM bookings AS b
        JOIN guests AS g ON b.guest_id = g.id
        LEFT JOIN rooms AS r ON b.room_id = r.id
        WHERE 1=1
    """
    params = {}
    
    if passport_number:
        query += " AND g.passport_number = :passport_number"
        params["passport_number"] = passport_number
    
    if phone_number:
        query += " AND g.phone_number = :phone_number"
        params["phone_number"] = phone_number
    
    query += " ORDER BY b.created_at DESC"
    
    result = await session.execute(text(query), params)
    rows = result.mappings().all()
    return [dict(row) for row in rows]


@router.get("/", response_model=List[dict])
async def list_bookings(
    status_filter: Optional[str] = None,
    session: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
    _staff=Depends(require_role("receptionist", "manager")),
) -> List[dict]:
    """
    List all bookings. Receptionist and manager can view all bookings.
    Shows guest information, room details, and booking status.
    """
    query = """
        SELECT 
            b.id AS booking_id,
            b.room_id,
            b.check_in,
            b.check_out,
            b.status AS booking_status,
            b.payment_method,
            b.payment_status,
            b.total_amount,
            b.created_at AS booking_created_at,
            b.updated_at AS booking_updated_at,
            g.id AS guest_id,
            g.name AS guest_name,
            g.passport_number AS guest_passport,
            g.phone_number AS guest_phone,
            g.email AS guest_email,
            r.room_number,
            r.title AS room_title,
            r.price AS room_price,
            r.location AS room_location
        FROM bookings AS b
        JOIN guests AS g ON b.guest_id = g.id
        LEFT JOIN rooms AS r ON b.room_id = r.id
    """
    params = {}
    
    if status_filter:
        query += " WHERE b.status = :status_filter"
        params["status_filter"] = status_filter
    
    query += " ORDER BY b.created_at DESC"
    
    result = await session.execute(text(query), params)
    rows = result.mappings().all()
    return [dict(row) for row in rows]

