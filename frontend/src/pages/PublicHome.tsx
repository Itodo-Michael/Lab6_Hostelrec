// @ts-nocheck
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import Navbar from "../components/Navbar";
import HeroSection from "../components/HeroSection";
import RoomCard from "../components/RoomCard";
import BookingWizard from "../components/BookingWizard";
import FloorPlan from "../components/FloorPlan";
import { api } from "../services/api";

type Occupancy = {
  occupancy_rate: number;
  available_rooms: number;
  occupied_rooms: number;
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

const PublicHome = () => {
  const { t } = useTranslation();
  const [occupancy, setOccupancy] = useState<Occupancy | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    // Fetch real occupancy data from API
    api
      .get("/stats/occupancy")
      .then((res: { data: Occupancy }) => setOccupancy(res.data))
      .catch((err) => {
        console.error("Failed to load occupancy", err);
        setOccupancy(null);
      });
    
    // Fetch real rooms from API
    api
      .get("/content/rooms", { params: { available_only: true } })
      .then((res: { data: Room[] }) => {
        setRooms(res.data);
      })
      .catch((err) => {
        console.error("Failed to load rooms", err);
        setRooms([]);
      });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <Navbar />
      <main className="mx-auto flex max-w-6xl flex-col gap-6 sm:gap-10 px-4 sm:px-6 pb-10 sm:pb-20 pt-6 sm:pt-10">
        <HeroSection occupancyHigh={(occupancy?.occupancy_rate ?? 0) > 0.8} />

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        >
          {rooms.length > 0 ? (
            rooms.map((room) => (
              <RoomCard
                key={room.id}
                id={room.id}
                title={room.title}
                price={room.price}
                amenities={room.features || []}
                status={room.status === "available" ? "available" : "occupied"}
                image_url={room.image_url}
                location={room.location}
                wifi={room.wifi}
              />
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-slate-600">
              <p className="text-lg">{t("no_rooms_available") || "No rooms available at the moment."}</p>
              <p className="text-sm mt-2">{t("check_back_later") || "Please check back later."}</p>
            </div>
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="grid gap-8 grid-cols-1 lg:grid-cols-2"
        >
          <BookingWizard />
          <div className="space-y-4">
            <motion.div
              whileHover={{ scale: 1.02, y: -5 }}
              className="rounded-3xl bg-white/90 backdrop-blur-md p-6 shadow-xl border border-white/20"
            >
              <h3 className="text-xl font-semibold text-primary">{t("todays occupancy")}</h3>
              <p className="text-5xl font-bold text-primary">
                {occupancy ? Math.round(occupancy.occupancy_rate * 100) : "--"}%
              </p>
              <p className="text-sm text-slate-500">
                {occupancy?.available_rooms} {t("rooms available")} · {occupancy?.occupied_rooms} {t("rooms occupied")}
              </p>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 }}
            >
              <FloorPlan rooms={rooms} />
            </motion.div>
          </div>
        </motion.section>
      </main>
    </div>
  );
};

export default PublicHome;

