from sqlalchemy import Column, Integer, String, Boolean, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .user import Base


class CustomerProfile(Base):
    __tablename__ = "customer_profiles"

    user_id = Column(Integer, ForeignKey("hostel_users.id", ondelete="CASCADE"), primary_key=True)
    full_name = Column(String(255))
    room_number = Column(String(50))
    floor = Column(Integer)
    likes_food = Column(Boolean)
    likes_water = Column(Boolean)
    notes = Column(Text)
    profile_picture_url = Column(Text)

    user = relationship("User", backref="customer_profile")


class CustomerOrder(Base):
    __tablename__ = "customer_orders"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("hostel_users.id", ondelete="CASCADE"), nullable=False)
    item_name = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False)
    quantity = Column(Integer, nullable=False, default=1)
    status = Column(String(50), nullable=False, default="pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", backref="orders")

