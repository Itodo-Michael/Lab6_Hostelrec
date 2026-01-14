// @ts-nocheck
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import Navbar from "../components/Navbar";
import RoomCard from "../components/RoomCard";
import { api } from "../services/api";

type CustomerProfile = {
  email: string;
  room_number: string;
  floor: number;
  preferences: {
    food: string[];
    drinks: string[];
  };
};

type CustomerOrder = {
  id: number;
  item_name: string;
  category: string;
  quantity: number;
  status: string;
  created_at: string;
  customer_email: string;
};

type Booking = {
  booking_id: number;
  room_id: number;
  check_in: string;
  check_out: string;
  booking_status: string;
  payment_method: string;
  payment_status: string;
  total_amount: number;
  booking_created_at: string;
  guest_name: string;
  guest_passport: string;
  guest_phone: string;
  room_number: string;
  room_title: string;
  room_price: number;
  room_location: string | null;
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

type Notification = {
  order_id: number;
  item_name: string;
  status: string;
  message: string;
  created_at: string;
};

const CustomerPage = () => {
  const { t } = useTranslation();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [promos, setPromos] = useState<Promo[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingLookup, setBookingLookup] = useState({
    passport_number: "",
    phone_number: "",
  });
  const [showBookingLookup, setShowBookingLookup] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileRes, ordersRes, eventsRes, promosRes, notificationsRes] = await Promise.all([
        api.get<CustomerProfile>("/customer/profile").then((r) => r).catch(() => null),
        api.get<CustomerOrder[]>("/orders/my").then((r) => r).catch(() => ({ data: [] })),
        api.get<Event[]>("/content/events?active_only=true").then((r) => r).catch(() => ({ data: [] })),
        api.get<Promo[]>("/content/promos?active_only=true").then((r) => r).catch(() => ({ data: [] })),
        api.get<Notification[]>("/orders/my/notifications").then((r) => r).catch(() => ({ data: [] })),
      ]);

      if (profileRes) setProfile(profileRes.data);
      if (ordersRes) setOrders(ordersRes.data);
      if (eventsRes) setEvents(eventsRes.data);
      if (promosRes) setPromos(promosRes.data);
      if (notificationsRes) setNotifications(notificationsRes.data);
    } catch (err) {
      console.error("Failed to load data", err);
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async () => {
    if (!bookingLookup.passport_number && !bookingLookup.phone_number) {
      alert("Please enter either passport number or phone number");
      return;
    }
    try {
      const params: any = {};
      if (bookingLookup.passport_number) {
        params.passport_number = bookingLookup.passport_number;
      }
      if (bookingLookup.phone_number) {
        params.phone_number = bookingLookup.phone_number;
      }
      const res = await api.get<Booking[]>("/bookings/my", { params });
      setBookings(res.data);
      setShowBookingLookup(false);
    } catch (err: any) {
      console.error("Failed to load bookings", err);
      const errorMsg = err.response?.data?.detail || "Failed to load bookings";
      alert(errorMsg);
    }
  };


  const cancelOrder = async (orderId: number) => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    try {
      await api.post(`/orders/${orderId}/cancel`);
      setOrders((prev) => prev.map(o => o.id === orderId ? { ...o, status: "cancelled" } : o));
    } catch (err) {
      console.error("Failed to cancel order", err);
      alert("Failed to cancel order");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "pending": return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "in_progress": return "bg-blue-100 text-blue-700 border-blue-300";
      case "served": return "bg-green-100 text-green-700 border-green-300";
      case "cancelled": return "bg-red-100 text-red-700 border-red-300";
      default: return "bg-slate-100 text-slate-700 border-slate-300";
    }
  };

  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <Navbar />
      <main className="mx-auto flex max-w-7xl flex-col gap-6 sm:gap-10 px-4 sm:px-6 pb-10 sm:pb-20 pt-6 sm:pt-10">
        {/* Hero Section */}
        <motion.section
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary via-blue-700 to-accent text-white p-6 sm:p-10 shadow-2xl"
        >
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}
          ></div>
          <div className="relative z-10">
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3"
            >
              {t("customer_portal_title") || "Welcome to Your Portal"}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="text-white/90 text-sm sm:text-base max-w-2xl mb-6"
            >
              {t("customer_portal_subtitle") || "Manage your stay, orders, and more"}
            </motion.p>
            {profile && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="flex flex-wrap gap-4 text-sm sm:text-base"
              >
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                  <span className="font-semibold">📧 {t("email")}:</span> {profile.email}
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                  <span className="font-semibold">🚪 {t("room_number")}:</span> {profile.room_number}
                </div>
                <div className="bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2">
                  <span className="font-semibold">🏢 {t("customer_floor_label") || "Floor"}:</span> {profile.floor}
                </div>
              </motion.div>
            )}
          </div>
        </motion.section>

        {/* Notifications Section */}
        {notifications.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="rounded-3xl bg-white/90 backdrop-blur-md p-6 sm:p-8 shadow-xl border border-white/20"
          >
            <h2 className="text-2xl font-bold text-primary mb-6 flex items-center gap-2">
              🔔 {t("notifications") || "Notifications"}
            </h2>
            <div className="space-y-4">
              {notifications.map((notification) => (
                <motion.div
                  key={`${notification.order_id}-${notification.created_at}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl"
                >
                  <div className="text-2xl">📋</div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800">{notification.message}</p>
                    <p className="text-sm text-slate-600">{notification.item_name}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Quick Actions Grid */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
        >
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.location.href = "/"}
            className="rounded-2xl bg-white/90 backdrop-blur-md p-6 shadow-xl border border-white/20 cursor-pointer"
          >
            <div className="text-4xl mb-3">🏨</div>
            <h3 className="text-lg font-semibold text-primary mb-2">Book a Room</h3>
            <p className="text-sm text-slate-600">Browse available rooms</p>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowBookingLookup(true)}
            className="rounded-2xl bg-white/90 backdrop-blur-md p-6 shadow-xl border border-white/20 cursor-pointer"
          >
            <div className="text-4xl mb-3">📋</div>
            <h3 className="text-lg font-semibold text-primary mb-2">My Bookings</h3>
            <p className="text-sm text-slate-600">View your reservations</p>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
            className="rounded-2xl bg-white/90 backdrop-blur-md p-6 shadow-xl border border-white/20"
          >
            <div className="text-4xl mb-3">🍽️</div>
            <h3 className="text-lg font-semibold text-primary mb-2">Order Food & Drinks</h3>
            <p className="text-sm text-slate-600">Place your order quickly</p>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
            className="rounded-2xl bg-white/90 backdrop-blur-md p-6 shadow-xl border border-white/20"
          >
            <div className="text-4xl mb-3">🎁</div>
            <h3 className="text-lg font-semibold text-primary mb-2">Promotions</h3>
            <p className="text-sm text-slate-600">{promos.length} active promos</p>
          </motion.div>
        </motion.section>

        {/* Security Settings Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="mt-8"
        >
          <h2 className="text-2xl font-bold text-primary mb-4">{t("security")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link to="/password-change">
              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-2xl bg-white/90 backdrop-blur-md p-6 shadow-xl border border-white/20 cursor-pointer"
              >
                <div className="text-3xl mb-3">🔐</div>
                <h3 className="text-lg font-semibold text-primary mb-2">{t("change_password")}</h3>
                <p className="text-sm text-slate-600">{t("change_password_description")}</p>
              </motion.div>
            </Link>
            <Link to="/mfa">
              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-2xl bg-white/90 backdrop-blur-md p-6 shadow-xl border border-white/20 cursor-pointer"
              >
                <div className="text-3xl mb-3">🛡️</div>
                <h3 className="text-lg font-semibold text-primary mb-2">{t("mfa_settings")}</h3>
                <p className="text-sm text-slate-600">{t("mfa_description")}</p>
              </motion.div>
            </Link>
            <Link to="/sessions">
              <motion.div
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="rounded-2xl bg-white/90 backdrop-blur-md p-6 shadow-xl border border-white/20 cursor-pointer"
              >
                <div className="text-3xl mb-3">🔐</div>
                <h3 className="text-lg font-semibold text-primary mb-2">{t("active_sessions")}</h3>
                <p className="text-sm text-slate-600">{t("manage_active_sessions")}</p>
              </motion.div>
            </Link>
          </div>
        </motion.section>

        {/* Booking Lookup Modal */}
        {showBookingLookup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowBookingLookup(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl p-6 max-w-md w-full"
            >
              <h3 className="text-xl font-bold text-primary mb-4">View My Bookings</h3>
              <p className="text-sm text-slate-600 mb-4">
                Enter your passport number or phone number to view your bookings
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Passport Number
                  </label>
                  <input
                    type="text"
                    value={bookingLookup.passport_number}
                    onChange={(e) => setBookingLookup({ ...bookingLookup, passport_number: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    placeholder="Enter passport number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={bookingLookup.phone_number}
                    onChange={(e) => setBookingLookup({ ...bookingLookup, phone_number: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2"
                    placeholder="Enter phone number"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={loadBookings}
                    className="flex-1 rounded-xl bg-primary px-4 py-2 text-white font-semibold"
                  >
                    View Bookings
                  </button>
                  <button
                    onClick={() => setShowBookingLookup(false)}
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2 font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Bookings Section */}
        {bookings.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="rounded-3xl bg-white/90 backdrop-blur-md p-6 sm:p-8 shadow-xl border border-white/20"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-primary flex items-center gap-2">
                <span className="text-3xl">🏨</span>
                {t("my_bookings") || "My Bookings"}
              </h2>
              <button
                onClick={() => {
                  setBookingLookup({ passport_number: "", phone_number: "" });
                  setShowBookingLookup(true);
                }}
                className="text-sm text-primary hover:underline"
              >
                Lookup Another
              </button>
            </div>
            <div className="space-y-4">
              {bookings.map((booking) => (
                <motion.div
                  key={booking.booking_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="rounded-xl border-2 p-4 bg-gradient-to-r from-white to-slate-50"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-bold text-lg text-slate-800">{booking.room_title}</h3>
                        <span className="text-sm text-slate-500">Room {booking.room_number}</span>
                      </div>
                      <div className="space-y-1 text-sm text-slate-600 mb-2">
                        <p>📅 Check-in: {new Date(booking.check_in).toLocaleDateString()}</p>
                        <p>📅 Check-out: {new Date(booking.check_out).toLocaleDateString()}</p>
                        <p>💳 Payment: {booking.payment_method} ({booking.payment_status})</p>
                        <p>💰 Total: ₽{booking.total_amount.toFixed(2)}</p>
                        {booking.room_location && <p>📍 {booking.room_location}</p>}
                      </div>
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${
                        booking.booking_status === "confirmed" ? "bg-green-100 text-green-700 border-green-300" :
                        booking.booking_status === "pending" ? "bg-yellow-100 text-yellow-700 border-yellow-300" :
                        "bg-slate-100 text-slate-700 border-slate-300"
                      }`}>
                        {booking.booking_status}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Order History Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="rounded-3xl bg-white/90 backdrop-blur-md p-6 sm:p-8 shadow-xl border border-white/20"
        >
          <h2 className="text-2xl font-bold text-primary mb-6 flex items-center gap-2">
            <span className="text-3xl">📋</span>
            {t("customer_order_history") || "Your Orders"}
          </h2>
            {orders.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-slate-500">{t("customer_order_empty") || "You have no orders yet."}</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                <AnimatePresence>
                  {orders.map((order, index) => (
                    <motion.div
                      key={order.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.05 }}
                      className="rounded-xl border-2 p-4 bg-gradient-to-r from-white to-slate-50"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-lg text-slate-800">
                              {order.item_name}
                            </h3>
                            <span className="text-sm text-slate-500">× {order.quantity}</span>
                          </div>
                          <p className="text-xs text-slate-500 mb-2">
                            {order.category} · {new Date(order.created_at).toLocaleString()}
                          </p>
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(order.status)}`}>
                            {order.status}
                          </span>
                        </div>
                        {order.status !== "cancelled" && order.status !== "served" && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => cancelOrder(order.id)}
                            className="text-red-500 hover:text-red-700 text-xl font-bold px-2"
                            title="Cancel order"
                          >
                            ×
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
        </motion.section>

        {/* Events Section */}
        {events.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="space-y-6"
          >
            <h2 className="text-3xl font-bold text-primary flex items-center gap-3">
              <span className="text-4xl">🎉</span>
              {t("upcoming_events") || "Upcoming Events"}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -10 }}
                  className="rounded-3xl bg-white/90 backdrop-blur-md overflow-hidden shadow-xl border border-white/20"
                >
                  {event.image_url && (
                    <div className="h-48 overflow-hidden">
                      <img
                        src={`${apiUrl}${event.image_url}`}
                        alt={event.title}
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-primary mb-2">{event.title}</h3>
                    <p className="text-sm text-slate-600 mb-4 line-clamp-2">{event.description}</p>
                    <div className="space-y-2 text-xs text-slate-500">
                      <p className="flex items-center gap-2">
                        <span>📅</span>
                        {new Date(event.event_date).toLocaleString()}
                      </p>
                      {event.location && (
                        <p className="flex items-center gap-2">
                          <span>📍</span>
                          {event.location}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Promos Section */}
        {promos.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.5 }}
            className="space-y-6"
          >
            <h2 className="text-3xl font-bold text-primary flex items-center gap-3">
              <span className="text-4xl">🎁</span>
              {t("current_promos") || "Current Promotions"}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {promos.map((promo, index) => (
                <motion.div
                  key={promo.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  whileHover={{ scale: 1.03, y: -5 }}
                  className="rounded-3xl bg-gradient-to-br from-accent/20 via-primary/20 to-blue-500/20 p-6 sm:p-8 shadow-xl border-2 border-accent/30 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 rounded-full -mr-16 -mt-16"></div>
                  {promo.image_url && (
                    <div className="h-48 overflow-hidden rounded-xl mb-4">
                      <img
                        src={`${apiUrl}${promo.image_url}`}
                        alt={promo.title}
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  )}
                  <h3 className="text-2xl font-bold text-primary mb-2 relative z-10">{promo.title}</h3>
                  <p className="text-sm text-slate-700 mb-4 relative z-10">{promo.description}</p>
                  {(promo.discount_percent || promo.discount_amount) && (
                    <p className="text-3xl font-bold text-accent mb-4 relative z-10">
                      {promo.discount_percent ? `${promo.discount_percent}% OFF` : `₽${promo.discount_amount} OFF`}
                    </p>
                  )}
                  {promo.code && (
                    <div className="bg-white/80 backdrop-blur-sm rounded-xl px-4 py-2 mb-4 relative z-10">
                      <p className="text-sm font-semibold text-primary">
                        {t("promo_code") || "Code"}: <span className="text-accent text-lg">{promo.code}</span>
                      </p>
                    </div>
                  )}
                  <p className="text-xs text-slate-600 relative z-10">
                    Valid until: {new Date(promo.valid_until).toLocaleDateString()}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </main>
    </div>
  );
};

export default CustomerPage;

