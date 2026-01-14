from sqlalchemy import Column, Integer, String, Text, Numeric, Boolean, ARRAY, DateTime
from sqlalchemy.sql import func
from .user import Base


class RoomImage(Base):
    __tablename__ = "room_images"

    id = Column(Integer, primary_key=True, index=True)
    room_number = Column(String(50), nullable=False)
    image_url = Column(Text, nullable=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    room_number = Column(String(50), unique=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    price = Column(Numeric(10, 2), nullable=False)
    location = Column(String(255))
    wifi = Column(Boolean, default=True)
    features = Column(ARRAY(String))
    image_url = Column(Text)
    status = Column(String(50), default="available")
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

