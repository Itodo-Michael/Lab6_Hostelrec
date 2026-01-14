"""
SQLAlchemy ORM models live here. The real tables come from the existing labs,
so ORM classes can map to them without owning migrations.
"""

from .user import Base, User
from .staff import StaffAttendance
from .customer import CustomerProfile, CustomerOrder
from .chat import ChatMessage
from .room import RoomImage, Room
from .menu import FoodItem, DrinkItem
from .content import Event, Promo
from .booking import Guest, Booking, GuestCheckin
from .payment import Payment
from .audit import HostelAuditLog
from .session import UserSession

__all__ = [
    "Base",
    "User",
    "StaffAttendance",
    "CustomerProfile",
    "CustomerOrder",
    "ChatMessage",
    "RoomImage",
    "Room",
    "FoodItem",
    "DrinkItem",
    "Event",
    "Promo",
    "Guest",
    "Booking",
    "GuestCheckin",
    "Payment",
    "HostelAuditLog",
    "UserSession",
]
