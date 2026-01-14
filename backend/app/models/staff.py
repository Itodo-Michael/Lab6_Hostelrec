from sqlalchemy import Column, Integer, Date, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .user import Base


class StaffAttendance(Base):
    __tablename__ = "staff_attendance"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("hostel_users.id", ondelete="CASCADE"), nullable=False)
    work_date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", backref="attendance_records")

    __table_args__ = (
        UniqueConstraint("user_id", "work_date", name="uq_staff_attendance_user_date"),
    )

