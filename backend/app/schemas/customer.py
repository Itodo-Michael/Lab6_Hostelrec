from pydantic import BaseModel


class CustomerProfile(BaseModel):
  email: str
  full_name: str | None = None
  room_number: str | None = None
  floor: int | None = None
  likes_food: bool | None = None
  likes_water: bool | None = None
  notes: str | None = None


