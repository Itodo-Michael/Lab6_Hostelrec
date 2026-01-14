from pydantic import BaseModel


class OccupancyStats(BaseModel):
    occupancy_rate: float
    available_rooms: int
    occupied_rooms: int


class RevenueSlice(BaseModel):
    room_type: str
    revenue: float


