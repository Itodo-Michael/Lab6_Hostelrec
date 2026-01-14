import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { api } from "../services/api";

type StaffMember = {
  id: number;
  username: string;
  role: string;
  total_shifts?: number;
};

const StaffManagementPage = () => {
  const { t } = useTranslation();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState({ username: "", password: "", role: "receptionist" });

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      // Load staff plus attendance summary (how many days they've worked)
      const [staffRes, attendanceRes] = await Promise.all([
        api.get<StaffMember[]>("/staff/"),
        api.get<{ id: number; total_shifts: number }[]>("/staff/attendance/summary")
      ]);
      const attendanceMap = new Map(
        attendanceRes.data.map((a) => [a.id, a.total_shifts])
      );
      setStaff(
        staffRes.data.map((member) => ({
          ...member,
          total_shifts: attendanceMap.get(member.id) ?? 0
        }))
      );
    } catch (err) {
      console.error("Failed to load staff", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await api.put(`/staff/${editing.id}`, { role: formData.role, password: formData.password || undefined });
      } else {
        await api.post("/staff/", formData);
      }
      setShowModal(false);
      setEditing(null);
      setFormData({ username: "", password: "", role: "receptionist" });
      loadStaff();
    } catch (err) {
      console.error("Failed to save staff", err);
      alert("Failed to save staff member");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("delete_confirm"))) return;
    try {
      await api.delete(`/staff/${id}`);
      loadStaff();
    } catch (err) {
      console.error("Failed to delete staff", err);
      alert("Failed to delete staff member");
    }
  };

  const openEdit = (member: StaffMember) => {
    setEditing(member);
    setFormData({ username: member.username, password: "", role: member.role });
    setShowModal(true);
  };

  const openAdd = () => {
    setEditing(null);
    setFormData({ username: "", password: "", role: "receptionist" });
    setShowModal(true);
  };

  if (loading) {
    return <div className="text-center py-10">{t("loading") || "Loading..."}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary">{t("staff_management")}</h1>
        <button
          onClick={openAdd}
          className="rounded-lg bg-accent px-4 py-2 text-white font-semibold hover:bg-amber-600 transition-colors"
        >
          {t("add_staff")}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-primary text-white">
            <tr>
              <th className="px-6 py-3 text-left">{t("staff_name")}</th>
              <th className="px-6 py-3 text-left">{t("staff_role")}</th>
              <th className="px-6 py-3 text-left">{t("total_shifts") || "Days worked"}</th>
              <th className="px-6 py-3 text-right">{t("operations")}</th>
            </tr>
          </thead>
          <tbody>
            {staff.map((member) => (
              <tr key={member.id} className="border-b hover:bg-slate-50">
                <td className="px-6 py-4">{member.username}</td>
                <td className="px-6 py-4">
                  <span className="px-3 py-1 rounded-full text-sm bg-slate-200 text-slate-700">
                    {t(member.role) || member.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-semibold">
                    {member.total_shifts ?? 0}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <button
                    onClick={() => openEdit(member)}
                    className="text-accent hover:underline"
                  >
                    {t("edit_staff")}
                  </button>
                  <button
                    onClick={() => handleDelete(member.id)}
                    className="text-danger hover:underline"
                  >
                    {t("delete_staff")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">
              {editing ? t("edit_staff") : t("add_staff")}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1">{t("username")}</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  disabled={!!editing}
                  required={!editing}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">
                  {t("password")} {editing && "(leave blank to keep current)"}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!editing}
                  className="w-full rounded-lg border px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1">{t("staff_role")}</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full rounded-lg border px-3 py-2"
                >
                  <option value="receptionist">{t("receptionist")}</option>
                  <option value="manager">{t("manager")}</option>
                  <option value="cleaner">{t("cleaner_role")}</option>
                </select>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditing(null);
                  }}
                  className="px-4 py-2 rounded-lg border hover:bg-slate-50"
                >
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-accent text-white hover:bg-amber-600"
                >
                  {t("save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffManagementPage;

