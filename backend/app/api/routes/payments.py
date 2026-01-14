from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import List, Optional
from pydantic import BaseModel

from app.core.security import get_current_user, require_role, TokenPayload
from app.core.audit import set_audit_user
from app.db.session import get_db

router = APIRouter()


class PaymentCreate(BaseModel):
    booking_id: Optional[int] = None
    order_id: Optional[int] = None
    amount: float
    payment_method: str
    transaction_id: Optional[str] = None
    notes: Optional[str] = None


class PaymentResponse(BaseModel):
    id: int
    booking_id: Optional[int]
    order_id: Optional[int]
    amount: float
    payment_method: str
    payment_status: str
    transaction_id: Optional[str]
    created_at: str


@router.post("/", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(
    payload: PaymentCreate,
    session: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
) -> PaymentResponse:
    """
    Create a payment record for a booking or order.
    """
    await set_audit_user(session, current.sub)
    
    if not payload.booking_id and not payload.order_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either booking_id or order_id must be provided"
        )
    
    result = await session.execute(
        text(
            """
            INSERT INTO payments (booking_id, order_id, amount, payment_method, payment_status, transaction_id, notes)
            VALUES (:booking_id, :order_id, :amount, :payment_method, 'completed', :transaction_id, :notes)
            RETURNING id, booking_id, order_id, amount, payment_method, payment_status, transaction_id, created_at
            """
        ),
        {
            "booking_id": payload.booking_id,
            "order_id": payload.order_id,
            "amount": payload.amount,
            "payment_method": payload.payment_method,
            "transaction_id": payload.transaction_id,
            "notes": payload.notes,
        },
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create payment")
    
    # Update booking payment status if booking_id provided
    if payload.booking_id:
        await session.execute(
            text(
                """
                UPDATE bookings
                SET payment_status = 'completed'
                WHERE id = :booking_id
                """
            ),
            {"booking_id": payload.booking_id},
        )
    
    await session.commit()
    return PaymentResponse(**row)


@router.get("/", response_model=List[dict])
async def list_payments(
    booking_id: Optional[int] = None,
    order_id: Optional[int] = None,
    session: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
    _staff=Depends(require_role("receptionist", "manager")),
) -> List[dict]:
    """
    List payments. Receptionist and manager can view all payments.
    """
    query = "SELECT * FROM payments WHERE 1=1"
    params = {}
    
    if booking_id:
        query += " AND booking_id = :booking_id"
        params["booking_id"] = booking_id
    
    if order_id:
        query += " AND order_id = :order_id"
        params["order_id"] = order_id
    
    query += " ORDER BY created_at DESC"
    
    result = await session.execute(text(query), params)
    rows = result.mappings().all()
    return [dict(row) for row in rows]


@router.get("/methods", response_model=List[str])
async def get_payment_methods() -> List[str]:
    """
    Get available payment methods.
    """
    return ["cash", "card", "bank_transfer", "online"]

