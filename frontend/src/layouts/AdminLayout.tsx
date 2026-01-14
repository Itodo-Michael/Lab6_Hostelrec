import { NavLink, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuthStore, type AuthState, type Role } from "../hooks/useAuthStore";

const AdminLayout = () => {
  const role = useAuthStore((state: AuthState) => state.role);

  const { t } = useTranslation();

  type AdminLink = { to: string; label: string; restricted?: Role };

  const links: AdminLink[] = [
    { to: "/admin", label: t("dashboard") },
    { to: "/admin/guests", label: t("guest_checkin_checkout") || "Check-In/Out" },
    { to: "/admin/orders", label: t("orders_title") || "Orders" },
    { to: "/admin/content", label: t("content_management") || "Content Management" },
    { to: "/admin/staff", label: t("staff_management"), restricted: "manager" },
    { to: "/admin/logs", label: t("audit_logs"), restricted: "manager" },
    { to: "/admin/security", label: t("security"), restricted: "manager" }
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="w-64 bg-primary text-white">
        <div className="p-6 text-2xl font-bold">HostelRec</div>
        <nav className="flex flex-col gap-2 p-4">
          {links.map((link) => {
            const restricted = link.restricted && link.restricted !== role;
            return (
              <NavLink
                end
                key={link.to}
                to={link.to}
                className={({ isActive }: { isActive: boolean }) =>
                  `rounded-lg px-3 py-2 text-sm font-semibold ${
                    isActive ? "bg-white/20" : "hover:bg-white/10"
                  } ${restricted ? "pointer-events-none opacity-40" : ""}`
                }
              >
                {link.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;

