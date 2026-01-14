// @ts-nocheck
import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";

import Navbar from "../components/Navbar";
import { api } from "../services/api";

type RoomDetail = {
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
  images: Array<{
    id: number;
    image_url: string;
    description: string | null;
    created_at: string;
  }>;
};

const RoomDetailPage = () => {
  const { t } = useTranslation();
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();
  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [bookingForm, setBookingForm] = useState({
    guest_name: "",
    guest_passport: "",
    phone_number: "",
    check_in: "",
    check_out: "",
    payment_method: "cash",
  });
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

  useEffect(() => {
    if (roomId) {
      loadRoomDetail();
    }
  }, [roomId]);

  const loadRoomDetail = async () => {
    try {
      const res = await api.get<RoomDetail>(`/content/rooms/${roomId}`);
      setRoom(res.data);
      // Set selected image to main image or first gallery image
      if (res.data.image_url) {
        setSelectedImageIndex(-1); // -1 means main image
      } else if (res.data.images && res.data.images.length > 0) {
        setSelectedImageIndex(0);
      }
    } catch (err) {
      console.error("Failed to load room details", err);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleBooking = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setBookingError(null);
    setBookingSuccess(false);

    if (!room) return;

    // Validate form
    if (!bookingForm.guest_name || !bookingForm.guest_passport || !bookingForm.phone_number) {
      setBookingError("Please fill in all required fields (name, passport, and phone number).");
      return;
    }

    if (!bookingForm.check_in || !bookingForm.check_out) {
      setBookingError("Please select both check-in and check-out dates.");
      return;
    }

    if (new Date(bookingForm.check_out) <= new Date(bookingForm.check_in)) {
      setBookingError("Check-out date must be after check-in date.");
      return;
    }

    if (!bookingForm.payment_method) {
      setBookingError("Please select a payment method.");
      return;
    }

    try {
      const response = await api.post("/bookings", {
        guest_name: bookingForm.guest_name,
        guest_passport: bookingForm.guest_passport,
        phone_number: bookingForm.phone_number,
        room_id: room.id,
        check_in: bookingForm.check_in, // HTML date input returns YYYY-MM-DD format
        check_out: bookingForm.check_out,
        payment_method: bookingForm.payment_method,
      });
      setBookingSuccess(true);
      setBookingForm({
        guest_name: "",
        guest_passport: "",
        phone_number: "",
        check_in: "",
        check_out: "",
        payment_method: "cash",
      });
      setTimeout(() => setBookingSuccess(false), 5000);
    } catch (err: any) {
      console.error("Failed to book room", err);
      const errorDetail = err.response?.data?.detail;
      if (Array.isArray(errorDetail)) {
        // Pydantic validation errors
        setBookingError(errorDetail.map((e: any) => `${e.loc?.join('.')}: ${e.msg}`).join(', '));
      } else {
        setBookingError(errorDetail || "Failed to book room. Please try again.");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-primary mb-4">Room not found</h2>
            <Link to="/" className="text-accent hover:underline">
              Return to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Combine main image and gallery images
  const allImages = [];
  if (room.image_url) {
    allImages.push({ url: room.image_url, isMain: true });
  }
  room.images.forEach((img) => {
    allImages.push({ url: img.image_url, isMain: false });
  });

  const currentImage = selectedImageIndex === -1 
    ? (room.image_url ? { url: room.image_url, isMain: true } : allImages[0])
    : allImages[selectedImageIndex] || allImages[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 sm:px-6 pb-10 sm:pb-20 pt-6 sm:pt-10">
        {/* Back Button */}
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-slate-600 hover:text-primary transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t("back") || "Back"}
        </motion.button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Image Gallery */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            {/* Main Image */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-white">
              <AnimatePresence mode="wait">
                <motion.img
                  key={currentImage?.url}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  src={`${apiUrl}${currentImage?.url}`}
                  alt={room.title}
                  className="w-full h-[500px] object-cover"
                />
              </AnimatePresence>
              {room.status === "available" && (
                <div className="absolute top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-full font-semibold shadow-lg">
                  {t("available") || "Available"}
                </div>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {allImages.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
                {room.image_url && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedImageIndex(-1)}
                    className={`relative rounded-xl overflow-hidden border-2 ${
                      selectedImageIndex === -1 ? "border-primary" : "border-transparent"
                    }`}
                  >
                    <img
                      src={`${apiUrl}${room.image_url}`}
                      alt="Main"
                      className="w-full h-20 object-cover"
                    />
                    {selectedImageIndex === -1 && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <div className="w-3 h-3 bg-primary rounded-full" />
                      </div>
                    )}
                  </motion.button>
                )}
                {room.images.slice(0, 5 - (room.image_url ? 1 : 0)).map((img, idx) => {
                  const actualIndex = room.image_url ? idx : idx;
                  return (
                    <motion.button
                      key={img.id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedImageIndex(actualIndex)}
                      className={`relative rounded-xl overflow-hidden border-2 ${
                        selectedImageIndex === actualIndex ? "border-primary" : "border-transparent"
                      }`}
                    >
                      <img
                        src={`${apiUrl}${img.image_url}`}
                        alt={img.description || `Image ${idx + 1}`}
                        className="w-full h-20 object-cover"
                      />
                      {selectedImageIndex === actualIndex && (
                        <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                          <div className="w-3 h-3 bg-primary rounded-full" />
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Room Details & Booking */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="space-y-6"
          >
            {/* Room Info */}
            <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-xl border border-white/20">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-primary mb-2">{room.title}</h1>
                  <p className="text-lg text-slate-600">Room {room.room_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold text-accent">₽{room.price.toFixed(2)}</p>
                  <p className="text-sm text-slate-500">per night</p>
                </div>
              </div>

              {room.description && (
                <p className="text-slate-700 mb-6 leading-relaxed">{room.description}</p>
              )}

              <div className="space-y-4">
                {room.location && (
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📍</span>
                    <div>
                      <p className="font-semibold text-slate-700">Location</p>
                      <p className="text-slate-600">{room.location}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <span className="text-2xl">{room.wifi ? "📶" : "📵"}</span>
                  <div>
                    <p className="font-semibold text-slate-700">WiFi</p>
                    <p className="text-slate-600">{room.wifi ? "Available" : "Not Available"}</p>
                  </div>
                </div>

                {room.features && room.features.length > 0 && (
                  <div>
                    <p className="font-semibold text-slate-700 mb-2">Features</p>
                    <div className="flex flex-wrap gap-2">
                      {room.features.map((feature, idx) => (
                        <span
                          key={idx}
                          className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Booking Form */}
            {room.status === "available" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="bg-white/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 shadow-xl border border-white/20"
              >
                <h2 className="text-2xl font-bold text-primary mb-6">Book This Room</h2>
                
                {bookingSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-4 bg-green-100 border border-green-300 rounded-xl text-green-700"
                  >
                    ✅ Booking successful! We'll contact you soon.
                  </motion.div>
                )}

                {bookingError && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-4 p-4 bg-red-100 border border-red-300 rounded-xl text-red-700"
                  >
                    {bookingError}
                  </motion.div>
                )}

                <form onSubmit={handleBooking} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Guest Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={bookingForm.guest_name}
                      onChange={(e) => setBookingForm({ ...bookingForm, guest_name: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter your full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Passport Number *
                    </label>
                    <input
                      type="text"
                      required
                      minLength={6}
                      value={bookingForm.guest_passport}
                      onChange={(e) => setBookingForm({ ...bookingForm, guest_passport: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter passport number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      required
                      minLength={10}
                      value={bookingForm.phone_number}
                      onChange={(e) => setBookingForm({ ...bookingForm, phone_number: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Enter phone number (e.g., +1234567890)"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Check-in Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={bookingForm.check_in}
                        onChange={(e) => setBookingForm({ ...bookingForm, check_in: e.target.value })}
                        min={new Date().toISOString().split("T")[0]}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Check-out Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={bookingForm.check_out}
                        onChange={(e) => setBookingForm({ ...bookingForm, check_out: e.target.value })}
                        min={bookingForm.check_in || new Date().toISOString().split("T")[0]}
                        className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Payment Method *
                    </label>
                    <select
                      required
                      value={bookingForm.payment_method}
                      onChange={(e) => setBookingForm({ ...bookingForm, payment_method: e.target.value })}
                      className="w-full rounded-xl border border-slate-200 px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="cash">💵 Cash (Pay on arrival)</option>
                      <option value="card">💳 Card (Pay on arrival)</option>
                      <option value="bank_transfer">🏦 Bank Transfer</option>
                      <option value="online">🌐 Online Payment</option>
                    </select>
                  </div>

                  {room && bookingForm.check_in && bookingForm.check_out && (
                    <div className="bg-primary/10 rounded-xl p-4">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-700">Total Amount:</span>
                        <span className="text-2xl font-bold text-primary">
                          ₽{(() => {
                            const checkIn = new Date(bookingForm.check_in);
                            const checkOut = new Date(bookingForm.check_out);
                            const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                            return (nights > 0 ? nights : 1) * room.price;
                          })().toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        {(() => {
                          const checkIn = new Date(bookingForm.check_in);
                          const checkOut = new Date(bookingForm.check_out);
                          const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
                          return `${nights > 0 ? nights : 1} night(s) × ₽${room.price.toFixed(2)}`;
                        })()}
                      </p>
                    </div>
                  )}

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="w-full rounded-xl bg-gradient-to-r from-primary to-accent px-6 py-4 text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all"
                  >
                    {t("book_now") || "Book Now"}
                  </motion.button>
                </form>
              </motion.div>
            )}

            {room.status !== "available" && (
              <div className="bg-slate-100 rounded-3xl p-6 sm:p-8 text-center">
                <p className="text-lg font-semibold text-slate-600">
                  This room is currently {room.status}
                </p>
                <Link to="/" className="text-primary hover:underline mt-2 inline-block">
                  View other available rooms
                </Link>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default RoomDetailPage;

