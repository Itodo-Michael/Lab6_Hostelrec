import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../services/api";

type RoomCleaning = {
  room_number: string;
  status: "pending" | "in_progress" | "completed";
  last_cleaned: string | null;
  next_cleaning: string | null;
  guest_name: string | null;
};

const CleanerPage = () => {
  const { t } = useTranslation();
  const [rooms, setRooms] = useState<RoomCleaning[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    try {
      // Fetch real rooms from API
      const roomsRes = await api.get("/content/rooms");
      const rooms: RoomCleaning[] = roomsRes.data.map((room: any) => ({
        room_number: room.room_number,
        status: room.status === "occupied" ? "pending" : "completed",
        last_cleaned: room.updated_at ? new Date(room.updated_at).toISOString().split('T')[0] : null,
        next_cleaning: null, // Can be calculated based on check-out dates
        guest_name: room.status === "occupied" ? "Guest" : null
      }));
      
      // Try to get guest check-ins to populate guest names
      try {
        const checkinsRes = await api.get("/guests/", { params: { status_filter: "checked_in" } });
        const checkins = checkinsRes.data;
        const checkinsMap = new Map(checkins.map((c: any) => [c.room_number, c.guest_name]));
        
        rooms.forEach(room => {
          if (room.status === "pending" && checkinsMap.has(room.room_number)) {
            const guestName = checkinsMap.get(room.room_number);
            room.guest_name = guestName ? String(guestName) : null;
          }
        });
      } catch (err) {
        console.error("Failed to load guest check-ins", err);
      }
      
      setRooms(rooms);
    } catch (err) {
      console.error("Failed to load rooms", err);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkCleaned = async (roomNumber: string) => {
    try {
      // Find room ID from room number
      const room = rooms.find(r => r.room_number === roomNumber);
      if (!room) {
        alert("Room not found");
        return;
      }
      
      // Get room ID from API
      const roomsRes = await api.get("/content/rooms");
      const allRooms = roomsRes.data;
      const roomData = allRooms.find((r: any) => r.room_number === roomNumber);
      
      if (roomData && roomData.id) {
        await api.post(`/content/rooms/${roomData.id}/mark-cleaned`);
        // Reload rooms to get updated data
        loadRooms();
        alert("Room marked as cleaned successfully!");
      } else {
        // Fallback: just update local state if API doesn't return ID
        setRooms(rooms.map(r => 
          r.room_number === roomNumber 
            ? { ...r, status: "completed", last_cleaned: new Date().toISOString().split('T')[0] }
            : r
        ));
      }
    } catch (err) {
      console.error("Failed to mark room as cleaned", err);
      alert("Failed to mark room as cleaned");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-danger/20 text-danger";
      case "in_progress": return "bg-accent/20 text-accent";
      case "completed": return "bg-success/20 text-success";
      default: return "bg-slate-200 text-slate-700";
    }
  };

  const pendingRooms = rooms.filter(r => r.status === "pending" || r.status === "in_progress");

  if (loading) {
    return <div className="text-center py-10">{t("loading") || "Loading..."}</div>;
  }

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-primary">{t("cleaner")}</h1>
          <div className="text-sm text-slate-600">
            {pendingRooms.length} {t("rooms_to_clean")}
          </div>
        </div>

        {pendingRooms.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <p className="text-xl text-slate-600">{t("all_rooms_clean")}</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {pendingRooms.map((room) => (
              <div key={room.room_number} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-bold text-primary">
                    {t("room_number")} {room.room_number}
                  </h3>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(room.status)}`}>
                    {t(room.status)}
                  </span>
                </div>

                {room.guest_name && (
                  <p className="text-sm text-slate-600 mb-2">
                    {t("guest_name")}: {room.guest_name}
                  </p>
                )}

                <div className="space-y-2 text-sm mb-4">
                  {room.last_cleaned && (
                    <p className="text-slate-600">
                      {t("last_cleaned")}: {room.last_cleaned}
                    </p>
                  )}
                  {room.next_cleaning && (
                    <p className="text-slate-600">
                      {t("next_cleaning")}: {room.next_cleaning}
                    </p>
                  )}
                </div>

                {room.status !== "completed" && (
                  <button
                    onClick={() => handleMarkCleaned(room.room_number)}
                    className="w-full rounded-lg bg-success px-4 py-2 text-white font-semibold hover:bg-emerald-600 transition-colors"
                  >
                    {t("mark_cleaned")}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">{t("all_rooms") || "All Rooms"}</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-primary text-white">
                <tr>
                  <th className="px-4 py-2 text-left">{t("room_number")}</th>
                  <th className="px-4 py-2 text-left">{t("cleaning_status")}</th>
                  <th className="px-4 py-2 text-left">{t("last_cleaned")}</th>
                  <th className="px-4 py-2 text-left">{t("next_cleaning")}</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room) => (
                  <tr key={room.room_number} className="border-b hover:bg-slate-50">
                    <td className="px-4 py-2 font-semibold">{room.room_number}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(room.status)}`}>
                        {t(room.status)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600">{room.last_cleaned || "-"}</td>
                    <td className="px-4 py-2 text-slate-600">{room.next_cleaning || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CleanerPage;

