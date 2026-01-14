from fastapi import APIRouter, Depends, HTTPException, status, Form
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from datetime import datetime

from app.core.security import get_current_user, require_role, TokenPayload
from app.core.audit import set_audit_user
from app.db.session import get_db
from app.models import User

router = APIRouter()


@router.post("/check-in")
async def check_in_guest(
    guest_name: str = Form(...),
    guest_email: Optional[str] = Form(None),
    guest_passport: Optional[str] = Form(None),
    room_number: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    session: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
) -> dict:
    """
    Receptionist checks in a guest.
    """
    if current.role not in ("manager", "receptionist"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient rights"
        )

    # Get the staff user record
    result = await session.execute(select(User).where(User.username == current.sub))
    staff_user = result.scalar_one_or_none()
    if not staff_user:
        raise HTTPException(status_code=404, detail="Staff user not found")

    # Set audit user for logging
    await set_audit_user(session, current.sub)

    # Insert check-in record
    result = await session.execute(
        text(
            """
            INSERT INTO guest_checkins (guest_name, guest_email, guest_passport, room_number, notes, checked_in_by, status)
            VALUES (:guest_name, :guest_email, :guest_passport, :room_number, :notes, :checked_in_by, 'checked_in')
            RETURNING id, guest_name, guest_email, room_number, check_in_date, status
            """
        ),
        {
            "guest_name": guest_name,
            "guest_email": guest_email,
            "guest_passport": guest_passport,
            "room_number": room_number,
            "notes": notes,
            "checked_in_by": staff_user.id,
        },
    )
    row = result.mappings().first()
    await session.commit()

    return {
        "id": row["id"],
        "guest_name": row["guest_name"],
        "guest_email": row["guest_email"],
        "room_number": row["room_number"],
        "check_in_date": row["check_in_date"],
        "status": row["status"],
    }


@router.post("/{checkin_id}/check-out")
async def check_out_guest(
    checkin_id: int,
    notes: Optional[str] = Form(None),
    session: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
) -> dict:
    """
    Receptionist checks out a guest.
    """
    if current.role not in ("manager", "receptionist"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient rights"
        )

    # Get the staff user record
    result = await session.execute(select(User).where(User.username == current.sub))
    staff_user = result.scalar_one_or_none()
    if not staff_user:
        raise HTTPException(status_code=404, detail="Staff user not found")

    # Set audit user for logging
    await set_audit_user(session, current.sub)

    # Update check-in record to check-out
    result = await session.execute(
        text(
            """
            UPDATE guest_checkins
            SET check_out_date = NOW(),
                checked_out_by = :checked_out_by,
                status = 'checked_out',
                notes = COALESCE(:notes, notes)
            WHERE id = :checkin_id AND status = 'checked_in'
            RETURNING id, guest_name, guest_email, room_number, check_in_date, check_out_date, status
            """
        ),
        {
            "checkin_id": checkin_id,
            "checked_out_by": staff_user.id,
            "notes": notes,
        },
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(
            status_code=404, detail="Check-in not found or already checked out"
        )

    await session.commit()
    return {
        "id": row["id"],
        "guest_name": row["guest_name"],
        "guest_email": row["guest_email"],
        "room_number": row["room_number"],
        "check_in_date": row["check_in_date"],
        "check_out_date": row["check_out_date"],
        "status": row["status"],
    }


@router.get("/")
async def list_guests(
    status_filter: Optional[str] = None,
    session: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
) -> list[dict]:
    """
    List all guest check-ins. Receptionist and manager can view all.
    """
    if current.role not in ("manager", "receptionist"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient rights"
        )

    query = """
        SELECT g.id,
               g.guest_name,
               g.guest_email,
               g.guest_passport,
               g.room_number,
               g.check_in_date,
               g.check_out_date,
               g.status,
               g.notes,
               u1.username AS checked_in_by_name,
               u2.username AS checked_out_by_name
        FROM guest_checkins AS g
        LEFT JOIN hostel_users AS u1 ON g.checked_in_by = u1.id
        LEFT JOIN hostel_users AS u2 ON g.checked_out_by = u2.id
    """
    params = {}
    
    if status_filter:
        query += " WHERE g.status = :status_filter"
        params["status_filter"] = status_filter
    
    query += " ORDER BY g.check_in_date DESC"
    
    result = await session.execute(text(query), params)
    rows = result.mappings().all()
    return [dict(row) for row in rows]


@router.get("/{checkin_id}")
async def get_guest_details(
    checkin_id: int,
    session: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
) -> dict:
    """
    Get details of a specific guest check-in.
    """
    if current.role not in ("manager", "receptionist"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient rights"
        )

    result = await session.execute(
        text(
            """
            SELECT g.id,
                   g.guest_name,
                   g.guest_email,
                   g.guest_passport,
                   g.room_number,
                   g.check_in_date,
                   g.check_out_date,
                   g.status,
                   g.notes,
                   u1.username AS checked_in_by_name,
                   u2.username AS checked_out_by_name
            FROM guest_checkins AS g
            LEFT JOIN hostel_users AS u1 ON g.checked_in_by = u1.id
            LEFT JOIN hostel_users AS u2 ON g.checked_out_by = u2.id
            WHERE g.id = :checkin_id
            """
        ),
        {"checkin_id": checkin_id},
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Check-in not found")

    return dict(row)

