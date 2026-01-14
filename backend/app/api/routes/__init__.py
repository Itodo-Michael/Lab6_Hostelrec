from fastapi import APIRouter

from . import admin, auth, bookings, customer, orders, stats, staff, chat, content, guests, payments

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(bookings.router, prefix="/bookings", tags=["bookings"])
api_router.include_router(customer.router, prefix="/customer", tags=["customer"])
api_router.include_router(orders.router, prefix="/orders", tags=["orders"])
api_router.include_router(stats.router, prefix="/stats", tags=["stats"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(staff.router, prefix="/staff", tags=["staff"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(content.router, prefix="/content", tags=["content"])
api_router.include_router(guests.router, prefix="/guests", tags=["guests"])
api_router.include_router(payments.router, prefix="/payments", tags=["payments"])

