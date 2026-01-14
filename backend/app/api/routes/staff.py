from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text

from app.core.security import require_role, get_current_user, TokenPayload
from app.core.audit import set_audit_user
from app.db.session import get_db
from app.models import User
from app.schemas.auth import UserCreate, UserResponse, UserUpdate

router = APIRouter()


@router.get("/", response_model=list[UserResponse])
async def list_staff(
    session: AsyncSession = Depends(get_db),
    _manager=Depends(require_role("manager")),
):
    """List all staff members (manager only)"""
    result = await session.execute(
        select(User).where(User.role.in_(["receptionist", "manager", "cleaner"]))
    )
    users = result.scalars().all()
    return [UserResponse(id=u.id, username=u.username, role=u.role) for u in users]


@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_staff(
    payload: UserCreate,
    session: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
    _manager=Depends(require_role("manager")),
):
    """Create a new staff member (manager only)"""
    from app.core.security import get_password_hash

    # Set audit user for logging
    await set_audit_user(session, current.sub)

    # Check if username exists
    result = await session.execute(select(User).where(User.username == payload.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already exists")

    # For PostgreSQL crypt(), we need to use the crypt function directly
    # But for now, we'll store the bcrypt hash and update auth to handle both
    hashed = get_password_hash(payload.password)
    new_user = User(
        username=payload.username,
        password=hashed,  # Store bcrypt hash
        role=payload.role or "receptionist",
    )
    session.add(new_user)
    await session.commit()
    await session.refresh(new_user)
    return UserResponse(id=new_user.id, username=new_user.username, role=new_user.role)


@router.put("/{user_id}", response_model=UserResponse)
async def update_staff(
    user_id: int,
    payload: UserUpdate,
    session: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
    _manager=Depends(require_role("manager")),
):
    """Update staff member role (manager only)"""
    await set_audit_user(session, current.sub)
    
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if payload.role:
        user.role = payload.role
    if payload.password:
        from app.core.security import get_password_hash
        user.password = get_password_hash(payload.password)

    await session.commit()
    await session.refresh(user)
    return UserResponse(id=user.id, username=user.username, role=user.role)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_staff(
    user_id: int,
    session: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
    _manager=Depends(require_role("manager")),
):
    """Delete a staff member (manager only)"""
    await set_audit_user(session, current.sub)
    
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await session.delete(user)
    await session.commit()
    return None


@router.post("/attendance/check-in")
async def check_in_for_today(
    current: TokenPayload = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """
    Allow the currently logged-in staff member to check in for today.
    Creates one attendance record per day per user.
    """
    # Find the User record for this token subject
    result = await session.execute(select(User).where(User.username == current.sub))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Insert attendance row if not already present today
    await session.execute(
        text(
            """
            INSERT INTO staff_attendance (user_id, work_date)
            VALUES (:user_id, CURRENT_DATE)
            ON CONFLICT (user_id, work_date) DO NOTHING
            """
        ),
        {"user_id": user.id},
    )

    # Return total shifts worked
    total_result = await session.execute(
        text(
            "SELECT COUNT(*) AS total_shifts FROM staff_attendance WHERE user_id = :user_id"
        ),
        {"user_id": user.id},
    )
    total_shifts = int(total_result.scalar() or 0)

    await session.commit()
    return {"username": user.username, "total_shifts": total_shifts}


@router.get("/attendance/summary")
async def attendance_summary(
    session: AsyncSession = Depends(get_db),
    _manager=Depends(require_role("manager")),
):
    """
    Manager view: show how many days each staff member has worked.
    """
    result = await session.execute(
        text(
            """
            SELECT u.id, u.username, u.role, COALESCE(COUNT(a.id), 0) AS total_shifts
            FROM hostel_users AS u
            LEFT JOIN staff_attendance AS a ON u.id = a.user_id
            WHERE u.role IN ('receptionist', 'manager', 'cleaner')
            GROUP BY u.id, u.username, u.role
            ORDER BY u.username
            """
        )
    )
    rows = [
        {
            "id": r.id,
            "username": r.username,
            "role": r.role,
            "total_shifts": int(r.total_shifts or 0),
        }
        for r in result
    ]
    return rows

