from sqlalchemy import Column, Integer, String, Date, Numeric, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .user import Base


class Guest(Base):
    __tablename__ = "guests"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    passport_number = Column(String(255), unique=True, nullable=False)
    phone_number = Column(String(50), nullable=False)
    email = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    bookings = relationship("Booking", back_populates="guest", cascade="all, delete-orphan")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    guest_id = Column(Integer, ForeignKey("guests.id", ondelete="CASCADE"), nullable=False)
    room_id = Column(Integer, nullable=False)
    check_in = Column(Date, nullable=False)
    check_out = Column(Date, nullable=False)
    status = Column(String(50), nullable=False, default="pending")
    payment_method = Column(String(50))
    payment_status = Column(String(50), nullable=False, default="pending")
    total_amount = Column(Numeric(10, 2))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    guest = relationship("Guest", back_populates="bookings")
    payments = relationship("Payment", back_populates="booking", cascade="all, delete-orphan")


class GuestCheckin(Base):
    __tablename__ = "guest_checkins"

    id = Column(Integer, primary_key=True, index=True)
    guest_name = Column(String(255), nullable=False)
    guest_email = Column(String(255))
    guest_passport = Column(String(255))
    room_number = Column(String(50), nullable=False)
    check_in_date = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    check_out_date = Column(DateTime(timezone=True))
    status = Column(String(50), nullable=False, default="checked_in")
    notes = Column(Text)
    checked_in_by = Column(Integer, ForeignKey("hostel_users.id"))
    checked_out_by = Column(Integer, ForeignKey("hostel_users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    checked_in_by_user = relationship("User", foreign_keys=[checked_in_by], backref="checkins_performed")
    checked_out_by_user = relationship("User", foreign_keys=[checked_out_by], backref="checkouts_performed")

