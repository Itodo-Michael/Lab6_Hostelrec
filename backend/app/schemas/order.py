from datetime import datetime
from pydantic import BaseModel


class OrderCreate(BaseModel):
    item_name: str
    category: str
    quantity: int = 1


class OrderResponse(BaseModel):
    id: int
    item_name: str
    category: str
    quantity: int
    status: str
    created_at: datetime
    customer_email: str



