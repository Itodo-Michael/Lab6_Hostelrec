// @ts-nocheck
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { api } from "../services/api";

type FoodItem = {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  available: boolean;
  is_tea: boolean;
  contains_alcohol: boolean;
};

type DrinkItem = {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  available: boolean;
  is_tea: boolean;
  contains_alcohol: boolean;
};

type Event = {
  id: number;
  title: string;
  description: string;
  event_date: string;
  location: string;
  image_url: string;
  active: boolean;
};

type Promo = {
  id: number;
  title: string;
  description: string;
  discount_percent: number;
  discount_amount: number;
  code: string;
  valid_from: string;
  valid_until: string;
  image_url: string;
  active: boolean;
};

type RoomImage = {
  id: number;
  room_number: string;
  image_url: string;
  description: string;
};

type Room = {
  id: number;
  room_number: string;
  title: string;
  description: string | null;
  price: number;
  location: string | null;
  wifi: boolean;
  features: string[] | null;
  image_url: string | null;
  status: string;
};

const ContentManagementPage = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"rooms" | "foods" | "drinks" | "events" | "promos">("rooms");
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [drinks, setDrinks] = useState<DrinkItem[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [roomImages, setRoomImages] = useState<RoomImage[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      if (activeTab === "foods") {
        const res = await api.get("/content/foods");
        setFoods(res.data);
      } else if (activeTab === "drinks") {
        const res = await api.get("/content/drinks");
        setDrinks(res.data);
      } else if (activeTab === "events") {
        const res = await api.get("/content/events");
        setEvents(res.data);
      } else if (activeTab === "promos") {
        const res = await api.get("/content/promos");
        setPromos(res.data);
      } else if (activeTab === "rooms") {
        const res = await api.get("/content/rooms");
        setRooms(res.data);
        const imgRes = await api.get("/content/rooms/images");
        setRoomImages(imgRes.data);
      }
    } catch (err) {
      console.error("Failed to load data", err);
    }
  };

  const handleSubmit = async (file: File | null, category: string, data: any, isEditing: boolean) => {
    try {
      if (isEditing && data.id) {
        // For updates
        if (category === "rooms" && file) {
          // Rooms can handle file uploads in PUT
          const formData = new FormData();
          formData.append("file", file);
          Object.keys(data).forEach((key) => {
            if (key !== "id" && key !== "file" && key !== "image_url" && data[key] !== null && data[key] !== undefined) {
              // Convert boolean to string properly for FastAPI Form fields
              if (typeof data[key] === "boolean") {
                formData.append(key, data[key] ? "true" : "false");
              } else {
                formData.append(key, data[key].toString());
              }
            }
          });
          await api.put(`/content/rooms/${data.id}`, formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } else {
          // Other categories or rooms without file - use regular PUT
          const updateData: any = {};
          Object.keys(data).forEach((key) => {
            if (key !== "id" && key !== "file" && key !== "image_url" && data[key] !== null && data[key] !== undefined) {
              updateData[key] = data[key];
            }
          });

          if (category === "foods") {
            await api.put(`/content/foods/${data.id}`, updateData);
          } else if (category === "drinks") {
            await api.put(`/content/drinks/${data.id}`, updateData);
          } else if (category === "events") {
            await api.put(`/content/events/${data.id}`, updateData);
          } else if (category === "promos") {
            await api.put(`/content/promos/${data.id}`, updateData);
          } else if (category === "rooms") {
            await api.put(`/content/rooms/${data.id}`, updateData);
          }

          // Note: For foods/drinks/events/promos, image updates would require recreation
          if (file && category !== "rooms") {
            alert("Note: Image updates for this item type require deleting and recreating the item.");
          }
        }
      } else {
        // For new items, use POST with file upload
        const formData = new FormData();
        if (file) {
          formData.append("file", file);
        }
        Object.keys(data).forEach((key) => {
          if (key !== "id" && key !== "file" && key !== "image_url" && data[key] !== null && data[key] !== undefined) {
            // Convert boolean to string properly for FastAPI Form fields
            if (typeof data[key] === "boolean") {
              formData.append(key, data[key] ? "true" : "false");
            } else if (key === "price" && typeof data[key] === "number") {
              // Ensure price is sent as a proper number string
              formData.append(key, data[key].toString());
            } else {
              formData.append(key, data[key].toString());
            }
          }
        });

        if (category === "foods") {
          await api.post("/content/foods", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } else if (category === "drinks") {
          await api.post("/content/drinks", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } else if (category === "events") {
          await api.post("/content/events", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } else if (category === "promos") {
          await api.post("/content/promos", formData, {
            headers: { "Content-Type": "multipart/form-data" },
          });
        } else if (category === "rooms") {
          if (data.room_number && data.title && data.price) {
            await api.post("/content/rooms", formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });
          } else {
            await api.post("/content/rooms/images", formData, {
              headers: { "Content-Type": "multipart/form-data" },
            });
          }
        }
      }
      loadData();
      setShowModal(false);
      setEditing(null);
    } catch (err: any) {
      console.error("Failed to save", err);
      const errorMessage = err?.response?.data?.detail || err?.message || "Unknown error";
      // Handle array of validation errors
      if (Array.isArray(errorMessage)) {
        const validationErrors = errorMessage.map((e: any) => `${e.loc?.join('.')}: ${e.msg}`).join(', ');
        alert("Save failed: " + validationErrors);
      } else {
        alert("Save failed: " + errorMessage);
      }
    }
  };

  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary">{t("content_management") || "Content Management"}</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
        {(["rooms", "foods", "drinks", "events", "promos"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 sm:px-4 py-2 font-semibold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-slate-600 hover:text-primary"
            }`}
          >
            {t(`content_tab_${tab}`) || tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-xl font-semibold">
            {t(`content_tab_${activeTab}`) || activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          </h2>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              setEditing(null);
              setShowModal(true);
            }}
            className="rounded-lg bg-primary px-4 py-2 text-white font-semibold w-full sm:w-auto"
          >
            {t("add") || "Add New"}
          </motion.button>
        </div>

        {/* Rooms */}
        {activeTab === "rooms" && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Rooms</h3>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {rooms.map((room) => (
                  <motion.div
                    key={room.id}
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="rounded-xl bg-white p-4 shadow-lg border border-slate-200"
                  >
                    {room.image_url && (
                      <img
                        src={`${apiUrl}${room.image_url}`}
                        alt={room.title}
                        className="w-full h-48 object-cover rounded-lg mb-2"
                      />
                    )}
                    <p className="font-semibold text-lg">{room.title}</p>
                    <p className="text-sm text-slate-600">Room {room.room_number}</p>
                    {room.location && <p className="text-sm text-slate-500">📍 {room.location}</p>}
                    <p className="text-sm text-slate-500">{room.wifi ? "📶 WiFi" : "📶 No WiFi"}</p>
                    <p className="text-lg font-bold text-primary mt-2">₽{room.price.toFixed(2)}</p>
                    {room.features && room.features.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-slate-500">Features:</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {room.features.map((feature, idx) => (
                            <span key={idx} className="text-xs bg-slate-100 px-2 py-1 rounded">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <span className={`text-xs px-2 py-1 rounded mt-2 inline-block ${
                      room.status === "available" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {room.status}
                    </span>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => {
                          setEditing(room);
                          setShowModal(true);
                        }}
                        className="flex-1 rounded-lg bg-accent px-3 py-2 text-white text-sm font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm("Are you sure you want to delete this room?")) {
                            try {
                              await api.delete(`/content/rooms/${room.id}`);
                              loadData();
                            } catch (err) {
                              console.error("Failed to delete room", err);
                              alert("Failed to delete room");
                            }
                          }
                        }}
                        className="flex-1 rounded-lg bg-danger px-3 py-2 text-white text-sm font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Room Images</h3>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                {roomImages.map((img) => (
                  <motion.div
                    key={img.id}
                    whileHover={{ scale: 1.02, y: -5 }}
                    className="rounded-xl bg-white p-4 shadow-lg border border-slate-200 relative"
                  >
                    <img
                      src={`${apiUrl}${img.image_url}`}
                      alt={img.description}
                      className="w-full h-48 object-cover rounded-lg mb-2"
                    />
                    <p className="font-semibold">Room {img.room_number}</p>
                    <p className="text-sm text-slate-600">{img.description}</p>
                    <button
                      onClick={async () => {
                        if (confirm("Are you sure you want to delete this image?")) {
                          try {
                            await api.delete(`/content/rooms/images/${img.id}`);
                            loadData();
                          } catch (err) {
                            console.error("Failed to delete image", err);
                            alert("Failed to delete image");
                          }
                        }
                      }}
                      className="mt-2 w-full rounded-lg bg-danger px-3 py-2 text-white text-sm font-semibold"
                    >
                      Delete
                    </button>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Foods */}
        {activeTab === "foods" && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {foods.map((food) => (
              <motion.div
                key={food.id}
                whileHover={{ scale: 1.02, y: -5 }}
                className="rounded-xl bg-white p-4 shadow-lg border border-slate-200"
              >
                {food.image_url && (
                  <img
                    src={`${apiUrl}${food.image_url}`}
                    alt={food.name}
                    className="w-full h-48 object-cover rounded-lg mb-2"
                  />
                )}
                <p className="font-semibold">{food.name}</p>
                <p className="text-sm text-slate-600">{food.description}</p>
                <p className="text-lg font-bold text-primary mt-2">₽{food.price}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {food.is_tea && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">🍵 Tea</span>}
                  {food.contains_alcohol && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">🍷 Alcohol</span>}
                  <span className={`text-xs px-2 py-1 rounded ${food.available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {food.available ? "Available" : "Unavailable"}
                  </span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => {
                      setEditing(food);
                      setShowModal(true);
                    }}
                    className="flex-1 rounded-lg bg-accent px-3 py-2 text-white text-sm font-semibold"
                  >
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm("Are you sure you want to delete this item?")) {
                        try {
                          await api.delete(`/content/foods/${food.id}`);
                          loadData();
                        } catch (err) {
                          console.error("Failed to delete food", err);
                          alert("Failed to delete food");
                        }
                      }
                    }}
                    className="flex-1 rounded-lg bg-danger px-3 py-2 text-white text-sm font-semibold"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Drinks */}
        {activeTab === "drinks" && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {drinks.map((drink) => (
              <motion.div
                key={drink.id}
                whileHover={{ scale: 1.02, y: -5 }}
                className="rounded-xl bg-white p-4 shadow-lg border border-slate-200"
              >
                {drink.image_url && (
                  <img
                    src={`${apiUrl}${drink.image_url}`}
                    alt={drink.name}
                    className="w-full h-48 object-cover rounded-lg mb-2"
                  />
                )}
                <p className="font-semibold">{drink.name}</p>
                <p className="text-sm text-slate-600">{drink.description}</p>
                <p className="text-lg font-bold text-primary mt-2">₽{drink.price}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {drink.is_tea && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">🍵 Tea</span>}
                  {drink.contains_alcohol && <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">🍷 Alcohol</span>}
                  <span className={`text-xs px-2 py-1 rounded ${drink.available ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {drink.available ? "Available" : "Unavailable"}
                  </span>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => {
                      setEditing(drink);
                      setShowModal(true);
                    }}
                    className="flex-1 rounded-lg bg-accent px-3 py-2 text-white text-sm font-semibold"
                  >
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (confirm("Are you sure you want to delete this item?")) {
                        try {
                          await api.delete(`/content/drinks/${drink.id}`);
                          loadData();
                        } catch (err) {
                          console.error("Failed to delete drink", err);
                          alert("Failed to delete drink");
                        }
                      }
                    }}
                    className="flex-1 rounded-lg bg-danger px-3 py-2 text-white text-sm font-semibold"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Events */}
        {activeTab === "events" && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {events.map((event) => (
              <motion.div
                key={event.id}
                whileHover={{ scale: 1.02, y: -5 }}
                className="rounded-xl bg-white p-4 shadow-lg border border-slate-200"
              >
                {event.image_url && (
                  <img
                    src={`${apiUrl}${event.image_url}`}
                    alt={event.title}
                    className="w-full h-48 object-cover rounded-lg mb-2"
                  />
                )}
                <p className="font-semibold text-lg">{event.title}</p>
                <p className="text-sm text-slate-600">{event.description}</p>
                <p className="text-xs text-slate-500 mt-2">
                  {new Date(event.event_date).toLocaleString()} · {event.location}
                </p>
              </motion.div>
            ))}
          </div>
        )}

        {/* Promos */}
        {activeTab === "promos" && (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            {promos.map((promo) => (
              <motion.div
                key={promo.id}
                whileHover={{ scale: 1.02, y: -5 }}
                className="rounded-xl bg-white p-4 shadow-lg border border-slate-200"
              >
                {promo.image_url && (
                  <img
                    src={`${apiUrl}${promo.image_url}`}
                    alt={promo.title}
                    className="w-full h-48 object-cover rounded-lg mb-2"
                  />
                )}
                <p className="font-semibold text-lg">{promo.title}</p>
                <p className="text-sm text-slate-600">{promo.description}</p>
                {promo.code && <p className="text-sm font-semibold text-accent mt-2">Code: {promo.code}</p>}
                {(promo.discount_percent || promo.discount_amount) && (
                  <p className="text-lg font-bold text-primary mt-2">
                    {promo.discount_percent ? `${promo.discount_percent}% OFF` : `₽${promo.discount_amount} OFF`}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for adding/editing */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-xl font-bold mb-4">
              {editing ? t("edit") || "Edit" : t("add") || "Add New"}
            </h3>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const form = e.target as HTMLFormElement;
                const formData = new FormData(form);
                const fileInput = form.querySelector('input[type="file"]') as HTMLInputElement;
                const file = fileInput?.files?.[0];
                const data: any = {};
                
                // Get all form values including checkboxes
                const wifiCheckbox = form.querySelector<HTMLInputElement>('[name="wifi"]');
                const isTeaCheckbox = form.querySelector<HTMLInputElement>('[name="is_tea"]');
                const containsAlcoholCheckbox = form.querySelector<HTMLInputElement>('[name="contains_alcohol"]');
                
                formData.forEach((value, key) => {
                  if (key !== "file") {
                    data[key] = value;
                  }
                });
                
                // Set checkbox values explicitly
                if (wifiCheckbox) data.wifi = wifiCheckbox.checked;
                if (isTeaCheckbox) data.is_tea = isTeaCheckbox.checked;
                if (containsAlcoholCheckbox) data.contains_alcohol = containsAlcoholCheckbox.checked;
                
                // Handle submission
                const isEditing = !!editing;
                handleSubmit(file || null, activeTab, data, isEditing);
              }}
              className="space-y-4"
            >
              {activeTab === "rooms" && (
                <>
                  <input
                    type="text"
                    name="room_number"
                    placeholder={t("room_number") || "Room Number"}
                    required
                    defaultValue={editing?.room_number || ""}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  />
                  <input
                    type="text"
                    name="title"
                    placeholder={t("title") || "Room Title"}
                    required
                    defaultValue={editing?.title || ""}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  />
                  <textarea
                    name="description"
                    placeholder={t("description") || "Description"}
                    defaultValue={editing?.description || ""}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  />
                  <input
                    type="number"
                    name="price"
                    placeholder={t("price") || "Price"}
                    step="0.01"
                    required
                    defaultValue={editing?.price || ""}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  />
                  <input
                    type="text"
                    name="location"
                    placeholder={t("location") || "Location (e.g., Floor 2, Building A)"}
                    defaultValue={editing?.location || ""}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="wifi"
                      id="wifi"
                      defaultChecked={editing?.wifi !== false}
                      className="w-4 h-4"
                    />
                    <label htmlFor="wifi" className="text-sm">WiFi Available</label>
                  </div>
                  <input
                    type="text"
                    name="features"
                    placeholder={t("features") || "Features (comma-separated, e.g., TV, AC, Balcony)"}
                    defaultValue={editing?.features ? editing.features.join(", ") : ""}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  />
                  <select
                    name="status"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    defaultValue={editing?.status || "available"}
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                  {editing?.image_url && (
                    <div className="text-sm text-slate-600">
                      Current image: <img src={`${apiUrl}${editing.image_url}`} alt="Current" className="w-20 h-20 object-cover rounded mt-1" />
                    </div>
                  )}
                  <input
                    type="file"
                    name="file"
                    accept="image/*"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  />
                  {editing && (
                    <>
                      <input type="hidden" name="id" value={editing.id} />
                      <div className="mt-4 p-4 bg-slate-50 rounded-xl">
                        <p className="text-sm font-semibold mb-2">Upload Additional Images (up to 5 total)</p>
                        <input
                          type="file"
                          id="additional-images"
                          accept="image/*"
                          multiple
                          className="w-full rounded-xl border border-slate-200 px-4 py-2"
                          onChange={async (e) => {
                            const files = Array.from(e.target.files || []);
                            if (files.length > 5) {
                              alert("Maximum 5 images allowed");
                              return;
                            }
                            if (editing?.id) {
                              try {
                                const formData = new FormData();
                                files.forEach((file) => {
                                  formData.append("files", file);
                                });
                                await api.post(`/content/rooms/${editing.id}/images`, formData, {
                                  headers: { "Content-Type": "multipart/form-data" },
                                });
                                alert("Images uploaded successfully!");
                                loadData();
                                e.target.value = ""; // Reset input
                              } catch (err) {
                                console.error("Failed to upload images", err);
                                alert("Failed to upload images");
                              }
                            }
                          }}
                        />
                        <p className="text-xs text-slate-500 mt-1">You can upload up to 5 images per room</p>
                      </div>
                    </>
                  )}
                </>
              )}
              {(activeTab === "foods" || activeTab === "drinks") && (
                <>
                  <input
                    type="text"
                    name="name"
                    placeholder={t("name") || "Name"}
                    required
                    defaultValue={editing?.name || ""}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  />
                  <textarea
                    name="description"
                    placeholder={t("description") || "Description"}
                    defaultValue={editing?.description || ""}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  />
                  <input
                    type="number"
                    name="price"
                    placeholder={t("price")}
                    step="0.01"
                    required
                    defaultValue={editing?.price || ""}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="is_tea"
                      id="is_tea"
                      defaultChecked={editing?.is_tea || false}
                      className="w-4 h-4"
                    />
                    <label htmlFor="is_tea" className="text-sm">Is Tea</label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="contains_alcohol"
                      id="contains_alcohol"
                      defaultChecked={editing?.contains_alcohol || false}
                      className="w-4 h-4"
                    />
                    <label htmlFor="contains_alcohol" className="text-sm">Contains Alcohol</label>
                  </div>
                  {editing?.image_url && (
                    <div className="text-sm text-slate-600">
                      Current image: <img src={`${apiUrl}${editing.image_url}`} alt="Current" className="w-20 h-20 object-cover rounded mt-1" />
                    </div>
                  )}
                  <input
                    type="file"
                    name="file"
                    accept="image/*"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  />
                  {editing && <input type="hidden" name="id" value={editing.id} />}
                </>
              )}
              {activeTab === "events" && (
                <>
                  <input
                    type="text"
                    name="title"
                    placeholder={t("title") || "Title"}
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  />
                  <textarea
                    name="description"
                    placeholder={t("description") || "Description"}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  />
                  <input
                    type="datetime-local"
                    name="event_date"
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  />
                  <input
                    type="text"
                    name="location"
                    placeholder={t("location") || "Location"}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  />
                  <input
                    type="file"
                    name="file"
                    accept="image/*"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  />
                </>
              )}
              {activeTab === "promos" && (
                <>
                  <input
                    type="text"
                    name="title"
                    placeholder={t("title") || "Title"}
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  />
                  <textarea
                    name="description"
                    placeholder={t("description") || "Description"}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  />
                  <input
                    type="text"
                    name="code"
                    placeholder={t("promo_code") || "Promo Code"}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  />
                  <input
                    type="number"
                    name="discount_percent"
                    placeholder={t("discount_percent") || "Discount %"}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  />
                  <input
                    type="datetime-local"
                    name="valid_from"
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  />
                  <input
                    type="datetime-local"
                    name="valid_until"
                    required
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  />
                  <input
                    type="file"
                    name="file"
                    accept="image/*"
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                  />
                </>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="flex-1 rounded-xl bg-primary px-4 py-2 text-white font-semibold"
                >
                  {t("save") || "Save"}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditing(null);
                  }}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2 font-semibold"
                >
                  {t("cancel") || "Cancel"}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default ContentManagementPage;

