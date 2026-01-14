import { useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "../services/api";
import { useAuthStore, type AuthState } from "../hooks/useAuthStore";

type Step = 1 | 2 | 3;
type InputEvent = { target: { value: string } };

const BookingWizard = () => {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState({
    check_in: "",
    check_out: "",
    room_id: "",
    guest_name: "",
    guest_passport: "",
    phone_number: "",
    payment_method: "cash"
  });
  const [status, setStatus] = useState<string | null>(null);
  const token = useAuthStore((state: AuthState) => state.token);

  const next = () => setStep((prev: Step) => (prev === 3 ? 3 : ((prev + 1) as Step)));
  const prev = () => setStep((prev: Step) => (prev === 1 ? 1 : ((prev - 1) as Step)));

  const submit = async () => {
    try {
      if (!token) {
        setStatus("unauthorized");
        return;
      }
      await api.post("/bookings", {
        ...form,
        room_id: Number(form.room_id),
        phone_number: form.phone_number,
        payment_method: form.payment_method
      });
      setStatus("success");
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  };

  return (
    <div className="rounded-3xl bg-white p-6 shadow-xl">
      <div className="flex items-center justify-between">
        {[1, 2, 3].map((num) => (
          <div key={num} className="flex flex-col items-center text-sm font-semibold">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                num === step ? "bg-accent text-primary" : "bg-slate-100"
              }`}
            >
              {num}
            </div>
            <span className="mt-2 text-slate-500">
              {num === 1 ? t("dates") : num === 2 ? t("guest_details") : t("confirm_pay")}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-8 space-y-5">
        {step === 1 && (
          <div className="grid gap-4 md:grid-cols-3">
            <input
              type="date"
              value={form.check_in}
              onChange={(e: InputEvent) => setForm({ ...form, check_in: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-3"
            />
            <input
              type="date"
              value={form.check_out}
              onChange={(e: InputEvent) => setForm({ ...form, check_out: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-3"
            />
            <input
              type="number"
              placeholder="Room ID"
              value={form.room_id}
              onChange={(e: InputEvent) => setForm({ ...form, room_id: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-3"
            />
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-4 md:grid-cols-2">
            <input
              type="text"
              placeholder="Guest name"
              value={form.guest_name}
              onChange={(e: InputEvent) => setForm({ ...form, guest_name: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-3"
            />
            <input
              type="text"
              placeholder="Passport"
              value={form.guest_passport}
              onChange={(e: InputEvent) => setForm({ ...form, guest_passport: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-3"
            />
            <input
              type="tel"
              placeholder="Phone number"
              value={form.phone_number}
              onChange={(e: InputEvent) => setForm({ ...form, phone_number: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-3"
            />
            <select
              value={form.payment_method}
              onChange={(e: InputEvent) => setForm({ ...form, payment_method: e.target.value })}
              className="rounded-xl border border-slate-200 px-3 py-3"
            >
              <option value="cash">💵 Cash</option>
              <option value="card">💳 Card</option>
              <option value="bank_transfer">🏦 Bank Transfer</option>
              <option value="online">🌐 Online</option>
            </select>
          </div>
        )}

        {step === 3 && (
          <div className="rounded-2xl border border-slate-200 p-4">
            <h4 className="text-lg font-semibold text-primary">Summary</h4>
            <p className="text-sm text-slate-500">Room #{form.room_id}</p>
            <p className="text-sm text-slate-500">
              {form.check_in} → {form.check_out}
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button
          onClick={prev}
          disabled={step === 1}
          className="rounded-xl border border-slate-300 px-4 py-2 disabled:opacity-40"
        >
          Back
        </button>
        {step < 3 ? (
          <button onClick={next} className="rounded-xl bg-accent px-4 py-2 font-semibold text-primary">
            Next
          </button>
        ) : (
          <button
            onClick={submit}
            className={`rounded-xl px-4 py-2 font-semibold text-white ${
              token ? "bg-success" : "bg-slate-400 cursor-not-allowed"
            }`}
            disabled={!token}
          >
            Pay
          </button>
        )}
      </div>

      {status === "success" && (
        <p className="mt-4 rounded-xl bg-success/10 px-4 py-3 text-success">{t("booking_confirmed")}</p>
      )}
      {status === "error" && (
        <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-danger">{t("booking_failed")}</p>
      )}
      {status === "unauthorized" && (
        <p className="mt-4 rounded-xl bg-accent/10 px-4 py-3 text-primary">{t("login_required")}</p>
      )}
    </div>
  );
};

export default BookingWizard;

