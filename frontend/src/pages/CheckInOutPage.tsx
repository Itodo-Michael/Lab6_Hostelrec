// @ts-nocheck
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { api } from "../services/api";

type GuestCheckIn = {
  id: number;
  guest_name: string;
  guest_email: string;
  guest_passport: string;
  room_number: string;
  check_in_date: string;
  check_out_date: string | null;
  status: string;
  notes: string;
  checked_in_by_name: string;
  checked_out_by_name: string | null;
};

const CheckInOutPage = () => {
  const { t } = useTranslation();
  const [guests, setGuests] = useState<GuestCheckIn[]>([]);
  const [filter, setFilter] = useState<"all" | "checked_in" | "checked_out">("all");
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCheckOutModal, setShowCheckOutModal] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<GuestCheckIn | null>(null);
  const [checkInForm, setCheckInForm] = useState({
    guest_name: "",
    guest_email: "",
    guest_passport: "",
    room_number: "",
    notes: "",
  });
  const [checkOutNotes, setCheckOutNotes] = useState("");

  useEffect(() => {
    loadGuests();
  }, [filter]);

  const loadGuests = async () => {
    try {
      const params = filter === "all" ? {} : { status_filter: filter };
      const res = await api.get("/guests/", { params });
      setGuests(res.data);
    } catch (err) {
      console.error("Failed to load guests", err);
    }
  };

  const handleCheckIn = async (e: any) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("guest_name", checkInForm.guest_name);
      if (checkInForm.guest_email) formData.append("guest_email", checkInForm.guest_email);
      if (checkInForm.guest_passport) formData.append("guest_passport", checkInForm.guest_passport);
      if (checkInForm.room_number) formData.append("room_number", checkInForm.room_number);
      if (checkInForm.notes) formData.append("notes", checkInForm.notes);
      
      await api.post("/guests/check-in", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setShowCheckInModal(false);
      setCheckInForm({
        guest_name: "",
        guest_email: "",
        guest_passport: "",
        room_number: "",
        notes: "",
      });
      loadGuests();
    } catch (err) {
      console.error("Failed to check in guest", err);
      alert("Failed to check in guest");
    }
  };

  const handleCheckOut = async (e: any) => {
    e.preventDefault();
    if (!selectedGuest) return;
    try {
      const formData = new FormData();
      if (checkOutNotes) {
        formData.append("notes", checkOutNotes);
      }
      await api.post(`/guests/${selectedGuest.id}/check-out`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setShowCheckOutModal(false);
      setSelectedGuest(null);
      setCheckOutNotes("");
      loadGuests();
    } catch (err) {
      console.error("Failed to check out guest", err);
      alert("Failed to check out guest");
    }
  };

  const openCheckOut = (guest: GuestCheckIn) => {
    setSelectedGuest(guest);
    setShowCheckOutModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary">
          {t("guest_checkin_checkout") || "Guest Check-In / Check-Out"}
        </h1>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCheckInModal(true)}
          className="rounded-lg bg-primary px-4 py-2 text-white font-semibold"
        >
          {t("check_in_guest") || "Check-In Guest"}
        </motion.button>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        {(["all", "checked_in", "checked_out"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
              filter === f
                ? "border-primary text-primary"
                : "border-transparent text-slate-600 hover:text-primary"
            }`}
          >
            {t(`filter_${f}`) || f.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Guests Table */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-primary text-white">
            <tr>
              <th className="px-4 py-3 text-left">{t("guest_name") || "Guest Name"}</th>
              <th className="px-4 py-3 text-left">{t("email")}</th>
              <th className="px-4 py-3 text-left">{t("room_number")}</th>
              <th className="px-4 py-3 text-left">{t("check_in")}</th>
              <th className="px-4 py-3 text-left">{t("check_out")}</th>
              <th className="px-4 py-3 text-left">{t("status")}</th>
              <th className="px-4 py-3 text-right">{t("operations")}</th>
            </tr>
          </thead>
          <tbody>
            {guests.map((guest) => (
              <tr key={guest.id} className="border-b hover:bg-slate-50">
                <td className="px-4 py-3 font-semibold">{guest.guest_name}</td>
                <td className="px-4 py-3">{guest.guest_email || "-"}</td>
                <td className="px-4 py-3">{guest.room_number}</td>
                <td className="px-4 py-3">
                  {new Date(guest.check_in_date).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  {guest.check_out_date
                    ? new Date(guest.check_out_date).toLocaleString()
                    : "-"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      guest.status === "checked_in"
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {guest.status === "checked_in"
                      ? t("checked_in") || "Checked In"
                      : t("checked_out") || "Checked Out"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {guest.status === "checked_in" && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => openCheckOut(guest)}
                      className="text-accent hover:underline font-semibold"
                    >
                      {t("check_out") || "Check-Out"}
                    </motion.button>
                  )}
                </td>
              </tr>
            ))}
            {guests.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-slate-500 text-sm"
                >
                  {t("no_guests") || "No guests found."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Check-In Modal */}
      {showCheckInModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full"
          >
            <h3 className="text-xl font-bold mb-4">
              {t("check_in_guest") || "Check-In Guest"}
            </h3>
            <form onSubmit={handleCheckIn} className="space-y-4">
              <input
                type="text"
                placeholder={t("guest_name") || "Guest Name"}
                value={checkInForm.guest_name}
                onChange={(e) =>
                  setCheckInForm({ ...checkInForm, guest_name: e.target.value })
                }
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-2"
              />
              <input
                type="email"
                placeholder={t("email")}
                value={checkInForm.guest_email}
                onChange={(e) =>
                  setCheckInForm({ ...checkInForm, guest_email: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-2"
              />
              <input
                type="text"
                placeholder={t("passport") || "Passport Number"}
                value={checkInForm.guest_passport}
                onChange={(e) =>
                  setCheckInForm({ ...checkInForm, guest_passport: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-2"
              />
              <input
                type="text"
                placeholder={t("room_number")}
                value={checkInForm.room_number}
                onChange={(e) =>
                  setCheckInForm({ ...checkInForm, room_number: e.target.value })
                }
                required
                className="w-full rounded-xl border border-slate-200 px-4 py-2"
              />
              <textarea
                placeholder={t("notes") || "Notes (optional)"}
                value={checkInForm.notes}
                onChange={(e) =>
                  setCheckInForm({ ...checkInForm, notes: e.target.value })
                }
                className="w-full rounded-xl border border-slate-200 px-4 py-2"
                rows={3}
              />
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="flex-1 rounded-xl bg-primary px-4 py-2 text-white font-semibold"
                >
                  {t("check_in") || "Check-In"}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => setShowCheckInModal(false)}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2 font-semibold"
                >
                  {t("cancel")}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Check-Out Modal */}
      {showCheckOutModal && selectedGuest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl p-6 max-w-md w-full"
          >
            <h3 className="text-xl font-bold mb-4">
              {t("check_out_guest") || "Check-Out Guest"}
            </h3>
            <div className="mb-4 space-y-2">
              <p>
                <span className="font-semibold">{t("guest_name") || "Guest"}:</span>{" "}
                {selectedGuest.guest_name}
              </p>
              <p>
                <span className="font-semibold">{t("room_number")}:</span>{" "}
                {selectedGuest.room_number}
              </p>
            </div>
            <form onSubmit={handleCheckOut} className="space-y-4">
              <textarea
                placeholder={t("checkout_notes") || "Check-out notes (optional)"}
                value={checkOutNotes}
                onChange={(e) => setCheckOutNotes(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-4 py-2"
                rows={3}
              />
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  className="flex-1 rounded-xl bg-accent px-4 py-2 text-white font-semibold"
                >
                  {t("check_out") || "Check-Out"}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => {
                    setShowCheckOutModal(false);
                    setSelectedGuest(null);
                  }}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2 font-semibold"
                >
                  {t("cancel")}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default CheckInOutPage;

