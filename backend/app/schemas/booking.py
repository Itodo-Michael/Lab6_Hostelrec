from datetime import date
from typing import Optional
from pydantic import BaseModel, Field


class BookingCreate(BaseModel):
    check_in: date
    check_out: date
    room_id: int
    guest_name: str
    guest_passport: str = Field(min_length=6)
    phone_number: str = Field(..., min_length=10, description="Guest phone number")
    payment_method: str = Field(..., description="Payment method: cash, card, bank_transfer, online")


class BookingResponse(BaseModel):
    booking_id: int
    room_id: int
    guest_id: int
    check_in: date
    check_out: date
    payment_method: Optional[str] = None
    payment_status: Optional[str] = None
    total_amount: Optional[float] = None


