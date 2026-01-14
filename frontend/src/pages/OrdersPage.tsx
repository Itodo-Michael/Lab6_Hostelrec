import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { api } from "../services/api";

type StaffOrder = {
  id: number;
  item_name: string;
  category: string;
  quantity: number;
  status: string;
  created_at: string;
  customer_email: string;
};

const OrdersPage = () => {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<StaffOrder[]>([]);

  const loadOrders = async () => {
    try {
      const res = await api.get<StaffOrder[]>("/orders");
      setOrders(res.data);
    } catch (err) {
      console.error("Failed to load orders", err);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const updateStatus = async (id: number, status: string) => {
    try {
      await api.post(`/orders/${id}/status?new_status=${status}`);
      loadOrders();
    } catch (err) {
      console.error("Failed to update order status", err);
      alert("Failed to update order status");
    }
  };

  const cancelOrder = async (id: number) => {
    if (!confirm("Are you sure you want to cancel this order?")) return;
    try {
      await api.post(`/orders/${id}/cancel`);
      loadOrders();
    } catch (err) {
      console.error("Failed to cancel order", err);
      alert("Failed to cancel order");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary">
          {t("orders_title") || "Customer Orders"}
        </h1>
        <button
          onClick={loadOrders}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
        >
          {t("orders_refresh") || "Refresh"}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-primary text-white">
            <tr>
              <th className="px-4 py-2 text-left">{t("orders_customer") || "Customer"}</th>
              <th className="px-4 py-2 text-left">{t("orders_item") || "Item"}</th>
              <th className="px-4 py-2 text-left">{t("orders_category") || "Category"}</th>
              <th className="px-4 py-2 text-left">{t("orders_quantity") || "Qty"}</th>
              <th className="px-4 py-2 text-left">{t("orders_status") || "Status"}</th>
              <th className="px-4 py-2 text-left">{t("orders_created") || "Created"}</th>
              <th className="px-4 py-2 text-right">{t("operations")}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b hover:bg-slate-50">
                <td className="px-4 py-2">{o.customer_email}</td>
                <td className="px-4 py-2">{o.item_name}</td>
                <td className="px-4 py-2 capitalize">{o.category}</td>
                <td className="px-4 py-2">{o.quantity}</td>
                <td className="px-4 py-2 capitalize">{o.status}</td>
                <td className="px-4 py-2">
                  {new Date(o.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-2 text-right space-x-2">
                  {o.status !== "cancelled" && o.status !== "served" && (
                    <>
                      <button
                        onClick={() => updateStatus(o.id, "in_progress")}
                        className="text-accent text-xs hover:underline px-2 py-1 rounded hover:bg-accent/10"
                      >
                        {t("orders_mark_in_progress") || "In progress"}
                      </button>
                      <button
                        onClick={() => updateStatus(o.id, "served")}
                        className="text-success text-xs hover:underline px-2 py-1 rounded hover:bg-success/10"
                      >
                        {t("orders_mark_served") || "Served"}
                      </button>
                      <button
                        onClick={() => cancelOrder(o.id)}
                        className="text-danger text-xs hover:underline px-2 py-1 rounded hover:bg-danger/10 font-semibold"
                      >
                        {t("orders_cancel") || "Cancel"}
                      </button>
                    </>
                  )}
                  {o.status === "cancelled" && (
                    <span className="text-xs text-red-600 font-semibold">Cancelled</span>
                  )}
                  {o.status === "served" && (
                    <span className="text-xs text-green-600 font-semibold">Served</span>
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-6 text-center text-slate-500 text-sm"
                >
                  {t("orders_empty") || "No customer orders yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default OrdersPage;


