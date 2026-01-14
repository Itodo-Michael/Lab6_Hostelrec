from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.booking import BookingCreate, BookingResponse
from app.core.audit import set_audit_user


async def create_booking(session: AsyncSession, payload: BookingCreate, username: str = "system") -> BookingResponse:
    """
    Create guest + booking atomically.
    Tries stored procedure first, falls back to direct SQL if it doesn't exist.
    """
    # Set audit user for logging
    await set_audit_user(session, username)
    # Try stored procedure first
    try:
        result = await session.execute(
            text(
                """
                select * from create_guest_and_booking(
                    :guest_name,
                    :guest_passport,
                    :room_id,
                    :check_in,
                    :check_out
                )
                """
            ),
            payload.model_dump(),
        )
        row = result.mappings().first()
        if row:
            await session.commit()
            return BookingResponse(**row)
    except Exception:
        # Stored procedure doesn't exist, rollback and use fallback
        await session.rollback()
    
    # Fallback: Create booking directly (simplified version)
    # Note: This assumes you have a bookings table
    try:
        # First, get or create guest
        guest_result = await session.execute(
            text(
                """
                INSERT INTO guests (name, passport_number, phone_number, email)
                VALUES (:guest_name, :guest_passport, :phone_number, :guest_email)
                ON CONFLICT (passport_number) DO UPDATE 
                    SET name = EXCLUDED.name, 
                        phone_number = EXCLUDED.phone_number,
                        email = COALESCE(EXCLUDED.email, guests.email),
                        updated_at = now()
                RETURNING id
                """
            ),
            {
                "guest_name": payload.guest_name, 
                "guest_passport": payload.guest_passport,
                "phone_number": payload.phone_number,
                "guest_email": getattr(payload, 'guest_email', None)
            },
        )
        guest_row = guest_result.mappings().first()
        if not guest_row:
            raise ValueError("Failed to create guest")
        guest_id = guest_row["id"]
        
        # Get room price to calculate total
        room_result = await session.execute(
            text("SELECT price FROM rooms WHERE id = :room_id"),
            {"room_id": payload.room_id}
        )
        room = room_result.mappings().first()
        room_price = room["price"] if room else 0.0
        
        # Calculate total amount (price per night * number of nights)
        check_in_date = payload.check_in
        check_out_date = payload.check_out
        nights = (check_out_date - check_in_date).days
        total_amount = float(room_price) * nights if nights > 0 else float(room_price)
        
        # Create booking
        booking_result = await session.execute(
            text(
                """
                INSERT INTO bookings (guest_id, room_id, check_in, check_out, payment_method, payment_status, total_amount)
                VALUES (:guest_id, :room_id, :check_in, :check_out, :payment_method, 'pending', :total_amount)
                RETURNING id, room_id, guest_id, check_in, check_out
                """
            ),
            {
                "guest_id": guest_id,
                "room_id": payload.room_id,
                "check_in": payload.check_in,
                "check_out": payload.check_out,
                "payment_method": payload.payment_method,
                "total_amount": total_amount,
            },
        )
        booking_row = booking_result.mappings().first()
        if not booking_row:
            raise ValueError("Failed to create booking")
        
        await session.commit()
        return BookingResponse(
            booking_id=booking_row["id"],
            room_id=booking_row["room_id"],
            guest_id=booking_row["guest_id"],
            check_in=booking_row["check_in"],
            check_out=booking_row["check_out"],
        )
    except Exception as e:
        await session.rollback()
        error_msg = str(e).lower()
        # If tables don't exist, provide a helpful error
        if "does not exist" in error_msg or "relation" in error_msg or "table" in error_msg:
            # Try to verify tables exist
            try:
                await session.execute(text("SELECT 1 FROM guests LIMIT 1"))
                await session.execute(text("SELECT 1 FROM bookings LIMIT 1"))
                # Tables exist, so the error is something else
                raise ValueError(f"Failed to create booking: {str(e)}")
            except Exception as table_check_error:
                table_error_msg = str(table_check_error).lower()
                if "does not exist" in table_error_msg or "relation" in table_error_msg:
                    raise ValueError(
                        "Booking tables not set up. The guests and bookings tables do not exist. "
                        "Please restart the backend server to create them automatically. "
                        f"Error details: {str(e)}"
                    )
                # Tables exist but there's another error
                raise ValueError(f"Failed to create booking: {str(e)}")
        raise ValueError(f"Failed to create booking: {str(e)}")


