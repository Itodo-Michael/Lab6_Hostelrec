from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user, require_role, TokenPayload
from app.db.session import get_db
from app.models import User
from app.schemas.customer import CustomerProfile

router = APIRouter()


@router.get("/profile")
async def get_customer_profile(
    current: TokenPayload = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
):
    """
    Return a simple customer-facing profile for the currently logged-in user.
    Compatible with the old endpoint format.
    """
    try:
        # Try to get full profile
        profile = await get_my_profile(current=current, session=session)
        return {
            "email": profile.email,
            "room_number": profile.room_number,
            "floor": profile.floor,
            "preferences": {
                "food": [],
                "drinks": [],
            },
        }
    except HTTPException:
        # If not a customer or profile doesn't exist, return basic info
        return {
            "email": current.sub,
            "room_number": None,
            "floor": None,
            "preferences": {
                "food": [],
                "drinks": [],
            },
        }


async def _ensure_profile_row(user_id: int, session: AsyncSession) -> None:
    """Create an empty customer profile row if it doesn't exist."""
    await session.execute(
        text(
            """
            INSERT INTO customer_profiles (user_id)
            VALUES (:user_id)
            ON CONFLICT (user_id) DO NOTHING
            """
        ),
        {"user_id": user_id},
    )


@router.get("/me", response_model=CustomerProfile)
async def get_my_profile(
    current: TokenPayload = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> CustomerProfile:
    """
    Return the logged-in customer's profile.
    If the user is not a customer, return 403.
    """
    result = await session.execute(select(User).where(User.username == current.sub))
    user: User | None = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.role != "customer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a customer account")

    # Ensure a profile row exists
    await _ensure_profile_row(user.id, session)

    prof_result = await session.execute(
        text(
            """
            SELECT c.full_name,
                   c.room_number,
                   c.floor,
                   c.likes_food,
                   c.likes_water,
                   c.notes
            FROM customer_profiles AS c
            WHERE c.user_id = :user_id
            """
        ),
        {"user_id": user.id},
    )
    row = prof_result.mappings().first()

    return CustomerProfile(
        email=user.username,
        full_name=row["full_name"] if row else None,
        room_number=row["room_number"] if row else None,
        floor=row["floor"] if row else None,
        likes_food=row["likes_food"] if row else None,
        likes_water=row["likes_water"] if row else None,
        notes=row["notes"] if row else None,
    )


@router.put("/me", response_model=CustomerProfile)
async def update_my_profile(
    payload: CustomerProfile,
    current: TokenPayload = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> CustomerProfile:
    """
    Allow a customer to update their own profile fields like room, floor and preferences.
    Email in the payload is ignored (comes from the authenticated user).
    """
    result = await session.execute(select(User).where(User.username == current.sub))
    user: User | None = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if user.role != "customer":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a customer account")

    await _ensure_profile_row(user.id, session)

    await session.execute(
        text(
            """
            UPDATE customer_profiles
            SET full_name = COALESCE(:full_name, full_name),
                room_number = COALESCE(:room_number, room_number),
                floor = COALESCE(:floor, floor),
                likes_food = COALESCE(:likes_food, likes_food),
                likes_water = COALESCE(:likes_water, likes_water),
                notes = COALESCE(:notes, notes)
            WHERE user_id = :user_id
            """
        ),
        {
            "user_id": user.id,
            "full_name": payload.full_name,
            "room_number": payload.room_number,
            "floor": payload.floor,
            "likes_food": payload.likes_food,
            "likes_water": payload.likes_water,
            "notes": payload.notes,
        },
    )
    await session.commit()

    return await get_my_profile(current=current, session=session)


