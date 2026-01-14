from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from .user import Base


class HostelAuditLog(Base):
    __tablename__ = "hostel_audit_log"

    id = Column(Integer, primary_key=True, index=True)
    event_time = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    username = Column(String(255), nullable=False, default="system")
    action = Column(String(50), nullable=False)
    table_name = Column(String(255), nullable=True)  # Made nullable for auth logs
    record_id = Column(Integer, nullable=True)  # Made nullable for auth logs
    details = Column(Text)
    ip_address = Column(String(45))  # Added for auth logging (IPv4/IPv6)

