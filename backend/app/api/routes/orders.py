from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user, TokenPayload
from app.core.audit import set_audit_user
from app.db.session import get_db
from app.models import User
from app.schemas.order import OrderCreate, OrderResponse

router = APIRouter()


async def _get_current_user_record(
    current: TokenPayload, session: AsyncSession
) -> User:
    result = await session.execute(select(User).where(User.username == current.sub))
    user: User | None = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    payload: OrderCreate,
    session: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
) -> OrderResponse:
    """
    Customer creates a new food/drink/other order.
    """
    user = await _get_current_user_record(current, session)
    await set_audit_user(session, current.sub)

    result = await session.execute(
        text(
            """
            INSERT INTO customer_orders (user_id, item_name, category, quantity)
            VALUES (:user_id, :item_name, :category, :quantity)
            RETURNING id, item_name, category, quantity, status, created_at
            """
        ),
        {
            "user_id": user.id,
            "item_name": payload.item_name,
            "category": payload.category,
            "quantity": payload.quantity,
        },
    )
    row = result.mappings().first()
    await session.commit()

    return OrderResponse(
        id=row["id"],
        item_name=row["item_name"],
        category=row["category"],
        quantity=row["quantity"],
        status=row["status"],
        created_at=row["created_at"],
        customer_email=user.username,
    )


@router.get("/my/notifications")
async def get_order_notifications(
    session: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
) -> list[dict]:
    """
    Get notifications for the logged-in customer's orders (e.g., status changes).
    """
    user = await _get_current_user_record(current, session)

    result = await session.execute(
        text(
            """
            SELECT o.id, o.item_name, o.status, o.created_at,
                   CASE 
                     WHEN o.status = 'served' THEN 'Your order has been served!'
                     WHEN o.status = 'in_progress' THEN 'Your order is being prepared.'
                     WHEN o.status = 'cancelled' THEN 'Your order has been cancelled.'
                     ELSE 'Order status updated.'
                   END as message
            FROM customer_orders AS o
            WHERE o.user_id = :user_id AND o.status IN ('in_progress', 'served', 'cancelled')
            ORDER BY o.created_at DESC
            LIMIT 10
            """
        ),
        {"user_id": user.id},
    )
    notifications = []
    for row in result.mappings().all():
        notifications.append({
            "order_id": row["id"],
            "item_name": row["item_name"],
            "status": row["status"],
            "message": row["message"],
            "created_at": row["created_at"].isoformat(),
        })
    return notifications


@router.get("/", response_model=list[OrderResponse])
async def all_orders_for_staff(
    session: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
) -> list[OrderResponse]:
    """
    Staff view of all customer orders.
    Accessible to manager and receptionist roles.
    """
    if current.role not in ("manager", "receptionist"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient rights"
        )

    result = await session.execute(
        text(
            """
            SELECT o.id,
                   o.item_name,
                   o.category,
                   o.quantity,
                   o.status,
                   o.created_at,
                   u.username AS customer_email
            FROM customer_orders AS o
            JOIN hostel_users AS u ON o.user_id = u.id
            ORDER BY o.created_at DESC
            """
        )
    )
    return [OrderResponse(**row) for row in result.mappings().all()]


@router.post("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: int,
    new_status: str,
    session: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
) -> OrderResponse:
    """
    Staff updates the status of an order (pending, in_progress, served, etc.).
    """
    if current.role not in ("manager", "receptionist"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient rights"
        )
    
    await set_audit_user(session, current.sub)

    result = await session.execute(
        text(
            """
            UPDATE customer_orders
            SET status = :status
            WHERE id = :order_id
            RETURNING id, item_name, category, quantity, status, created_at,
                      (SELECT username FROM hostel_users WHERE id = user_id) AS customer_email
            """
        ),
        {"status": new_status, "order_id": order_id},
    )
    row = result.mappings().first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    await session.commit()
    return OrderResponse(**row)


@router.post("/{order_id}/cancel", response_model=OrderResponse)
async def cancel_order(
    order_id: int,
    session: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
) -> OrderResponse:
    """
    Cancel an order. Customers can cancel their own orders, staff can cancel any order.
    """
    user = await _get_current_user_record(current, session)
    
    # Check if order exists and belongs to user (if customer) or allow staff
    result = await session.execute(
        text(
            """
            SELECT user_id FROM customer_orders WHERE id = :order_id
            """
        ),
        {"order_id": order_id},
    )
    order_row = result.mappings().first()
    if not order_row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    
    # Check permissions: customer can only cancel their own orders, staff can cancel any
    if current.role not in ("manager", "receptionist") and order_row["user_id"] != user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="You can only cancel your own orders"
        )
    
    await set_audit_user(session, current.sub)
    
    # Update order status to cancelled
    result = await session.execute(
        text(
            """
            UPDATE customer_orders
            SET status = 'cancelled'
            WHERE id = :order_id
            RETURNING id, item_name, category, quantity, status, created_at,
                      (SELECT username FROM hostel_users WHERE id = user_id) AS customer_email
            """
        ),
        {"order_id": order_id},
    )
    row = result.mappings().first()
    await session.commit()
    return OrderResponse(**row)



