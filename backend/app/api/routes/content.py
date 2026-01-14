from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import os
import uuid
import aiofiles
from pathlib import Path

from app.core.security import require_role, get_current_user, TokenPayload
from app.core.audit import set_audit_user
from app.db.session import get_db

router = APIRouter()

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
UPLOAD_DIR.joinpath("rooms").mkdir(exist_ok=True)
UPLOAD_DIR.joinpath("foods").mkdir(exist_ok=True)
UPLOAD_DIR.joinpath("drinks").mkdir(exist_ok=True)
UPLOAD_DIR.joinpath("events").mkdir(exist_ok=True)
UPLOAD_DIR.joinpath("promos").mkdir(exist_ok=True)


async def save_upload_file(file: UploadFile, category: str) -> str:
    """Save uploaded file and return the URL path"""
    file_ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
    filename = f"{uuid.uuid4()}.{file_ext}"
    filepath = UPLOAD_DIR / category / filename
    
    async with aiofiles.open(filepath, "wb") as f:
        content = await file.read()
        await f.write(content)
    
    return f"/uploads/{category}/{filename}"


# Room Images
@router.post("/rooms/images")
async def upload_room_image(
    room_number: str = Form(...),
    description: Optional[str] = Form(None),
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
    _staff=Depends(require_role("receptionist", "manager")),
):
    """Upload a room image (receptionist/manager only)"""
    await set_audit_user(session, current.sub)
    image_url = await save_upload_file(file, "rooms")
    
    await session.execute(
        text(
            """
            INSERT INTO room_images (room_number, image_url, description)
            VALUES (:room_number, :image_url, :description)
            """
        ),
        {"room_number": room_number, "image_url": image_url, "description": description},
    )
    await session.commit()
    return {"room_number": room_number, "image_url": image_url, "description": description}


@router.post("/rooms/{room_id}/images")
async def upload_multiple_room_images(
    room_id: int,
    files: List[UploadFile] = File(...),
    session: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
    _staff=Depends(require_role("receptionist", "manager")),
):
    """Upload multiple room images (up to 5) for a room (receptionist/manager only)"""
    await set_audit_user(session, current.sub)
    
    # Get room_number from room_id
    result = await session.execute(
        text("SELECT room_number FROM rooms WHERE id = :room_id"),
        {"room_id": room_id},
    )
    room = result.mappings().first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    room_number = room["room_number"]
    
    # Limit to 5 images
    if len(files) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 images allowed per room")
    
    uploaded_images = []
    for file in files:
        image_url = await save_upload_file(file, "rooms")
        await session.execute(
            text(
                """
                INSERT INTO room_images (room_number, image_url, description)
                VALUES (:room_number, :image_url, :description)
                """
            ),
            {"room_number": room_number, "image_url": image_url, "description": None},
        )
        uploaded_images.append({"room_number": room_number, "image_url": image_url})
    
    await session.commit()
    return {"room_id": room_id, "room_number": room_number, "images": uploaded_images}


@router.get("/rooms/images")
async def get_room_images(
    room_number: Optional[str] = None,
    session: AsyncSession = Depends(get_db),
):
    """Get room images (public)"""
    if room_number:
        result = await session.execute(
            text("SELECT * FROM room_images WHERE room_number = :room_number ORDER BY created_at DESC"),
            {"room_number": room_number},
        )
    else:
        result = await session.execute(
            text("SELECT * FROM room_images ORDER BY created_at DESC")
        )
    rows = result.mappings().all()
    return [dict(row) for row in rows]


@router.delete("/rooms/images/{image_id}")
async def delete_room_image(
    image_id: int,
    session: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
    _staff=Depends(require_role("receptionist", "manager")),
):
    """Delete a room image (receptionist/manager only)"""
    await set_audit_user(session, current.sub)
    
    # Get the image record to find the file path
    result = await session.execute(
        text("SELECT image_url FROM room_images WHERE id = :image_id"),
        {"image_id": image_id},
    )
    image = result.mappings().first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")
    
    # Delete the database record
    await session.execute(
        text("DELETE FROM room_images WHERE id = :image_id"),
        {"image_id": image_id},
    )
    await session.commit()
    
    # Try to delete the physical file
    try:
        image_path = image["image_url"]
        if image_path and image_path.startswith("/uploads/"):
            file_path = UPLOAD_DIR / image_path.replace("/uploads/", "")
            if file_path.exists():
                file_path.unlink()
    except Exception as e:
        # Log but don't fail if file deletion fails
        print(f"Warning: Failed to delete image file: {e}")
    
    return {"id": image_id, "deleted": True}


# Rooms Management
@router.post("/rooms")
async def create_room(
    room_number: str = Form(...),
    title: str = Form(...),
    description: Optional[str] = Form(None),
    price: float = Form(...),
    location: Optional[str] = Form(None),
    wifi: bool = Form(True),
    features: Optional[str] = Form(None),  # Comma-separated string
    status: str = Form("available"),
    file: Optional[UploadFile] = File(None),
    session: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
    _staff=Depends(require_role("receptionist", "manager")),
):
    """Create a room (receptionist/manager only)"""
    # Ensure we start with a clean transaction state
    try:
        await session.rollback()
    except Exception:
        pass  # Ignore if there's nothing to rollback
    
    # Check if room number already exists
    result = await session.execute(
        text("SELECT id FROM rooms WHERE room_number = :room_number"),
        {"room_number": room_number}
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Room number '{room_number}' already exists. Please use a different room number."
        )
    
    await set_audit_user(session, current.sub)
    image_url = None
    if file:
        image_url = await save_upload_file(file, "rooms")
    
    # Convert features string to array
    features_array = []
    if features:
        features_array = [f.strip() for f in features.split(",") if f.strip()]
    
    try:
        await session.execute(
            text(
                """
                INSERT INTO rooms (room_number, title, description, price, location, wifi, features, image_url, status)
                VALUES (:room_number, :title, :description, :price, :location, :wifi, :features, :image_url, :status)
                """
            ),
            {
                "room_number": room_number,
                "title": title,
                "description": description,
                "price": price,
                "location": location,
                "wifi": wifi,
                "features": features_array,
                "image_url": image_url,
                "status": status,
            },
        )
        await session.commit()
    except Exception as e:
        await session.rollback()
        # Check if it's a duplicate key error
        error_str = str(e)
        if "duplicate key" in error_str.lower() or "unique constraint" in error_str.lower() or "already exists" in error_str.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Room number '{room_number}' already exists. Please use a different room number."
            )
        # Re-raise other errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create room: {str(e)}"
        )
    
    return {"room_number": room_number, "title": title, "price": price, "image_url": image_url, "status": status}


@router.get("/rooms")
async def get_rooms(
    available_only: bool = False,
    session: AsyncSession = Depends(get_db),
):
    """Get rooms (public)"""
    query = "SELECT * FROM rooms"
    if available_only:
        query += " WHERE status = 'available'"
    query += " ORDER BY room_number ASC"
    
    result = await session.execute(text(query))
    rows = result.mappings().all()
    return [dict(row) for row in rows]


@router.get("/rooms/{room_id}")
async def get_room_detail(
    room_id: int,
    session: AsyncSession = Depends(get_db),
):
    """Get room details with all images"""
    # Get room info
    result = await session.execute(
        text("SELECT * FROM rooms WHERE id = :room_id"),
        {"room_id": room_id},
    )
    room = result.mappings().first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    
    # Get all images for this room
    images_result = await session.execute(
        text(
            """
            SELECT id, image_url, description, created_at
            FROM room_images
            WHERE room_number = :room_number
            ORDER BY created_at DESC
            LIMIT 5
            """
        ),
        {"room_number": room["room_number"]},
    )
    images = [dict(row) for row in images_result.mappings().all()]
    
    room_dict = dict(room)
    room_dict["images"] = images
    return room_dict


@router.put("/rooms/{room_id}")
async def update_room(
    room_id: int,
    room_number: Optional[str] = Form(None),
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    location: Optional[str] = Form(None),
    wifi: Optional[bool] = Form(None),
    features: Optional[str] = Form(None),
    status: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    session: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
    _staff=Depends(require_role("receptionist", "manager")),
):
    """Update a room (receptionist/manager only) - supports file upload"""
    await set_audit_user(session, current.sub)
    updates = []
    params = {"room_id": room_id}
    
    # Handle file upload if provided
    if file:
        image_url = await save_upload_file(file, "rooms")
        updates.append("image_url = :image_url")
        params["image_url"] = image_url
    
    if room_number:
        updates.append("room_number = :room_number")
        params["room_number"] = room_number
    if title:
        updates.append("title = :title")
        params["title"] = title
    if description is not None:
        updates.append("description = :description")
        params["description"] = description
    if price is not None:
        updates.append("price = :price")
        params["price"] = price
    if location is not None:
        updates.append("location = :location")
        params["location"] = location
    if wifi is not None:
        updates.append("wifi = :wifi")
        params["wifi"] = wifi
    if features is not None:
        features_array = [f.strip() for f in features.split(",") if f.strip()]
        updates.append("features = :features")
        params["features"] = features_array
    if status:
        updates.append("status = :status")
        params["status"] = status
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    updates.append("updated_at = NOW()")
    
    await session.execute(
        text(f"UPDATE rooms SET {', '.join(updates)} WHERE id = :room_id"),
        params,
    )
    await session.commit()
    return {"id": room_id, "updated": True}


@router.post("/rooms/{room_id}/mark-cleaned")
async def mark_room_cleaned(
    room_id: int,
    session: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
    _staff=Depends(require_role("cleaner", "receptionist", "manager")),
):
    """Mark a room as cleaned (cleaner/receptionist/manager only)"""
    await set_audit_user(session, current.sub)
    
    # Update room's updated_at timestamp to indicate it was cleaned
    await session.execute(
        text("UPDATE rooms SET updated_at = NOW() WHERE id = :room_id"),
        {"room_id": room_id}
    )
    await session.commit()
    return {"room_id": room_id, "cleaned_at": "now", "status": "success"}


@router.delete("/rooms/{room_id}")
async def delete_room(
    room_id: int,
    session: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
    _staff=Depends(require_role("receptionist", "manager")),
):
    """Delete a room (receptionist/manager only)"""
    await set_audit_user(session, current.sub)
    await session.execute(text("DELETE FROM rooms WHERE id = :room_id"), {"room_id": room_id})
    await session.commit()
    return {"id": room_id, "deleted": True}


# Food Items
@router.post("/foods")
async def create_food_item(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    price: float = Form(0.0),
    category: str = Form("food"),
    available: bool = Form(True),
    is_tea: bool = Form(False),
    contains_alcohol: bool = Form(False),
    file: Optional[UploadFile] = File(None),
    session: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
    _staff=Depends(require_role("receptionist", "manager")),
):
    """Create a food item (receptionist/manager only)"""
    await set_audit_user(session, current.sub)
    image_url = None
    if file:
        image_url = await save_upload_file(file, "foods")
    
    await session.execute(
        text(
            """
            INSERT INTO food_items (name, description, price, image_url, category, available, is_tea, contains_alcohol)
            VALUES (:name, :description, :price, :image_url, :category, :available, :is_tea, :contains_alcohol)
            """
        ),
        {
            "name": name,
            "description": description,
            "price": price,
            "image_url": image_url,
            "category": category,
            "available": available,
            "is_tea": is_tea,
            "contains_alcohol": contains_alcohol,
        },
    )
    await session.commit()
    return {"name": name, "description": description, "price": price, "image_url": image_url, "category": category, "available": available, "is_tea": is_tea, "contains_alcohol": contains_alcohol}


@router.get("/foods")
async def get_food_items(
    available_only: bool = False,
    session: AsyncSession = Depends(get_db),
):
    """Get food items (public)"""
    query = "SELECT * FROM food_items"
    if available_only:
        query += " WHERE available = true"
    query += " ORDER BY created_at DESC"
    
    result = await session.execute(text(query))
    rows = result.mappings().all()
    return [dict(row) for row in rows]


@router.put("/foods/{item_id}")
async def update_food_item(
    item_id: int,
    name: Optional[str] = None,
    description: Optional[str] = None,
    price: Optional[float] = None,
    available: Optional[bool] = None,
    is_tea: Optional[bool] = None,
    contains_alcohol: Optional[bool] = None,
    session: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
    _staff=Depends(require_role("receptionist", "manager")),
):
    """Update a food item (receptionist/manager only)"""
    await set_audit_user(session, current.sub)
    updates = []
    params = {"item_id": item_id}
    
    if name:
        updates.append("name = :name")
        params["name"] = name
    if description is not None:
        updates.append("description = :description")
        params["description"] = description
    if price is not None:
        updates.append("price = :price")
        params["price"] = price
    if available is not None:
        updates.append("available = :available")
        params["available"] = available
    if is_tea is not None:
        updates.append("is_tea = :is_tea")
        params["is_tea"] = is_tea
    if contains_alcohol is not None:
        updates.append("contains_alcohol = :contains_alcohol")
        params["contains_alcohol"] = contains_alcohol
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    await session.execute(
        text(f"UPDATE food_items SET {', '.join(updates)} WHERE id = :item_id"),
        params,
    )
    await session.commit()
    return {"id": item_id, "updated": True}


@router.delete("/foods/{item_id}")
async def delete_food_item(
    item_id: int,
    session: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
    _staff=Depends(require_role("receptionist", "manager")),
):
    """Delete a food item (receptionist/manager only)"""
    await set_audit_user(session, current.sub)
    await session.execute(text("DELETE FROM food_items WHERE id = :item_id"), {"item_id": item_id})
    await session.commit()
    return {"id": item_id, "deleted": True}


# Drink Items (similar to foods)
@router.post("/drinks")
async def create_drink_item(
    name: str = Form(...),
    description: Optional[str] = Form(None),
    price: float = Form(0.0),
    category: str = Form("drink"),
    available: bool = Form(True),
    is_tea: bool = Form(False),
    contains_alcohol: bool = Form(False),
    file: Optional[UploadFile] = File(None),
    session: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
    _staff=Depends(require_role("receptionist", "manager")),
):
    """Create a drink item (receptionist/manager only)"""
    await set_audit_user(session, current.sub)
    image_url = None
    if file:
        image_url = await save_upload_file(file, "drinks")
    
    await session.execute(
        text(
            """
            INSERT INTO drink_items (name, description, price, image_url, category, available, is_tea, contains_alcohol)
            VALUES (:name, :description, :price, :image_url, :category, :available, :is_tea, :contains_alcohol)
            """
        ),
        {
            "name": name,
            "description": description,
            "price": price,
            "image_url": image_url,
            "category": category,
            "available": available,
            "is_tea": is_tea,
            "contains_alcohol": contains_alcohol,
        },
    )
    await session.commit()
    return {"name": name, "description": description, "price": price, "image_url": image_url, "category": category, "available": available, "is_tea": is_tea, "contains_alcohol": contains_alcohol}


@router.get("/drinks")
async def get_drink_items(
    available_only: bool = False,
    session: AsyncSession = Depends(get_db),
):
    """Get drink items (public)"""
    query = "SELECT * FROM drink_items"
    if available_only:
        query += " WHERE available = true"
    query += " ORDER BY created_at DESC"
    
    result = await session.execute(text(query))
    rows = result.mappings().all()
    return [dict(row) for row in rows]


@router.put("/drinks/{item_id}")
async def update_drink_item(
    item_id: int,
    name: Optional[str] = None,
    description: Optional[str] = None,
    price: Optional[float] = None,
    available: Optional[bool] = None,
    is_tea: Optional[bool] = None,
    contains_alcohol: Optional[bool] = None,
    session: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
    _staff=Depends(require_role("receptionist", "manager")),
):
    """Update a drink item (receptionist/manager only)"""
    await set_audit_user(session, current.sub)
    updates = []
    params = {"item_id": item_id}
    
    if name:
        updates.append("name = :name")
        params["name"] = name
    if description is not None:
        updates.append("description = :description")
        params["description"] = description
    if price is not None:
        updates.append("price = :price")
        params["price"] = price
    if available is not None:
        updates.append("available = :available")
        params["available"] = available
    if is_tea is not None:
        updates.append("is_tea = :is_tea")
        params["is_tea"] = is_tea
    if contains_alcohol is not None:
        updates.append("contains_alcohol = :contains_alcohol")
        params["contains_alcohol"] = contains_alcohol
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    await session.execute(
        text(f"UPDATE drink_items SET {', '.join(updates)} WHERE id = :item_id"),
        params,
    )
    await session.commit()
    return {"id": item_id, "updated": True}


@router.delete("/drinks/{item_id}")
async def delete_drink_item(
    item_id: int,
    session: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
    _staff=Depends(require_role("receptionist", "manager")),
):
    """Delete a drink item (receptionist/manager only)"""
    await set_audit_user(session, current.sub)
    await session.execute(text("DELETE FROM drink_items WHERE id = :item_id"), {"item_id": item_id})
    await session.commit()
    return {"id": item_id, "deleted": True}


# Events
@router.post("/events")
async def create_event(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    event_date: str = Form(...),
    location: Optional[str] = Form(None),
    active: bool = Form(True),
    file: Optional[UploadFile] = File(None),
    session: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
    _staff=Depends(require_role("receptionist", "manager")),
):
    """Create an event (receptionist/manager only)"""
    await set_audit_user(session, current.sub)
    image_url = None
    if file:
        image_url = await save_upload_file(file, "events")
    
    await session.execute(
        text(
            """
            INSERT INTO events (title, description, event_date, location, image_url, active)
            VALUES (:title, :description, :event_date::timestamptz, :location, :image_url, :active)
            """
        ),
        {
            "title": title,
            "description": description,
            "event_date": event_date,
            "location": location,
            "image_url": image_url,
            "active": active,
        },
    )
    await session.commit()
    return {"title": title, "description": description, "event_date": event_date, "location": location, "image_url": image_url, "active": active}


@router.get("/events")
async def get_events(
    active_only: bool = False,
    session: AsyncSession = Depends(get_db),
):
    """Get events (public)"""
    query = "SELECT * FROM events"
    if active_only:
        query += " WHERE active = true AND event_date >= NOW()"
    query += " ORDER BY event_date ASC"
    
    result = await session.execute(text(query))
    rows = result.mappings().all()
    return [dict(row) for row in rows]


@router.put("/events/{event_id}")
async def update_event(
    event_id: int,
    title: Optional[str] = None,
    description: Optional[str] = None,
    event_date: Optional[str] = None,
    location: Optional[str] = None,
    active: Optional[bool] = None,
    session: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
    _staff=Depends(require_role("receptionist", "manager")),
):
    """Update an event (receptionist/manager only)"""
    await set_audit_user(session, current.sub)
    updates = []
    params = {"event_id": event_id}
    
    if title:
        updates.append("title = :title")
        params["title"] = title
    if description is not None:
        updates.append("description = :description")
        params["description"] = description
    if event_date:
        updates.append("event_date = :event_date::timestamptz")
        params["event_date"] = event_date
    if location is not None:
        updates.append("location = :location")
        params["location"] = location
    if active is not None:
        updates.append("active = :active")
        params["active"] = active
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    await session.execute(
        text(f"UPDATE events SET {', '.join(updates)} WHERE id = :event_id"),
        params,
    )
    await session.commit()
    return {"id": event_id, "updated": True}


@router.delete("/events/{event_id}")
async def delete_event(
    event_id: int,
    session: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
    _staff=Depends(require_role("receptionist", "manager")),
):
    """Delete an event (receptionist/manager only)"""
    await set_audit_user(session, current.sub)
    await session.execute(text("DELETE FROM events WHERE id = :event_id"), {"event_id": event_id})
    await session.commit()
    return {"id": event_id, "deleted": True}


# Promos
@router.post("/promos")
async def create_promo(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    discount_percent: Optional[int] = Form(None),
    discount_amount: Optional[float] = Form(None),
    code: Optional[str] = Form(None),
    valid_from: str = Form(...),
    valid_until: str = Form(...),
    active: bool = Form(True),
    file: Optional[UploadFile] = File(None),
    session: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
    _staff=Depends(require_role("receptionist", "manager")),
):
    """Create a promo (receptionist/manager only)"""
    await set_audit_user(session, current.sub)
    image_url = None
    if file:
        image_url = await save_upload_file(file, "promos")
    
    await session.execute(
        text(
            """
            INSERT INTO promos (title, description, discount_percent, discount_amount, code, valid_from, valid_until, image_url, active)
            VALUES (:title, :description, :discount_percent, :discount_amount, :code, :valid_from::timestamptz, :valid_until::timestamptz, :image_url, :active)
            """
        ),
        {
            "title": title,
            "description": description,
            "discount_percent": discount_percent,
            "discount_amount": discount_amount,
            "code": code,
            "valid_from": valid_from,
            "valid_until": valid_until,
            "image_url": image_url,
            "active": active,
        },
    )
    await session.commit()
    return {"title": title, "description": description, "code": code, "image_url": image_url, "active": active}


@router.get("/promos")
async def get_promos(
    active_only: bool = False,
    session: AsyncSession = Depends(get_db),
):
    """Get promos (public)"""
    query = "SELECT * FROM promos"
    if active_only:
        query += " WHERE active = true AND valid_from <= NOW() AND valid_until >= NOW()"
    query += " ORDER BY created_at DESC"
    
    result = await session.execute(text(query))
    rows = result.mappings().all()
    return [dict(row) for row in rows]


@router.put("/promos/{promo_id}")
async def update_promo(
    promo_id: int,
    title: Optional[str] = None,
    description: Optional[str] = None,
    discount_percent: Optional[int] = None,
    discount_amount: Optional[float] = None,
    code: Optional[str] = None,
    valid_from: Optional[str] = None,
    valid_until: Optional[str] = None,
    active: Optional[bool] = None,
    session: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
    _staff=Depends(require_role("receptionist", "manager")),
):
    """Update a promo (receptionist/manager only)"""
    await set_audit_user(session, current.sub)
    updates = []
    params = {"promo_id": promo_id}
    
    if title:
        updates.append("title = :title")
        params["title"] = title
    if description is not None:
        updates.append("description = :description")
        params["description"] = description
    if discount_percent is not None:
        updates.append("discount_percent = :discount_percent")
        params["discount_percent"] = discount_percent
    if discount_amount is not None:
        updates.append("discount_amount = :discount_amount")
        params["discount_amount"] = discount_amount
    if code:
        updates.append("code = :code")
        params["code"] = code
    if valid_from:
        updates.append("valid_from = :valid_from::timestamptz")
        params["valid_from"] = valid_from
    if valid_until:
        updates.append("valid_until = :valid_until::timestamptz")
        params["valid_until"] = valid_until
    if active is not None:
        updates.append("active = :active")
        params["active"] = active
    
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    await session.execute(
        text(f"UPDATE promos SET {', '.join(updates)} WHERE id = :promo_id"),
        params,
    )
    await session.commit()
    return {"id": promo_id, "updated": True}


@router.delete("/promos/{promo_id}")
async def delete_promo(
    promo_id: int,
    session: AsyncSession = Depends(get_db),
    current: TokenPayload = Depends(get_current_user),
    _staff=Depends(require_role("receptionist", "manager")),
):
    """Delete a promo (receptionist/manager only)"""
    await set_audit_user(session, current.sub)
    await session.execute(text("DELETE FROM promos WHERE id = :promo_id"), {"promo_id": promo_id})
    await session.commit()
    return {"id": promo_id, "deleted": True}

