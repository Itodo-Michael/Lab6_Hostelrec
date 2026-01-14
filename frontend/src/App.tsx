import { Navigate, Route, Routes } from "react-router-dom";
import { useTranslation } from "react-i18next";

import AdminDashboard from "./pages/AdminDashboard";
import AuditLogPage from "./pages/AuditLogPage";
import CleanerPage from "./pages/CleanerPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import CustomerPage from "./pages/CustomerPage";
import OrdersPage from "./pages/OrdersPage";
import PublicHome from "./pages/PublicHome";
import SecurityPage from "./pages/SecurityPage";
import StaffManagementPage from "./pages/StaffManagementPage";
import ContentManagementPage from "./pages/ContentManagementPage";
import MenuPage from "./pages/MenuPage";
import CheckInOutPage from "./pages/CheckInOutPage";
import RoomDetailPage from "./pages/RoomDetailPage";
import PasswordChangePage from "./pages/PasswordChangePage";
import MFAPage from "./pages/MFAPage";
import SessionsPage from "./pages/SessionsPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import GoogleAuthCallback from "./pages/GoogleAuthCallback";
import AdminLayout from "./layouts/AdminLayout";
import ChatWidget from "./components/ChatWidget";
import { useAuthStore } from "./hooks/useAuthStore";

const App = () => {
  const { t } = useTranslation();
  const role = useAuthStore((state) => state.role);

  return (
    <>
      <Routes>
      <Route path="/" element={<PublicHome />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/auth/google/callback" element={<GoogleAuthCallback />} />
      <Route path="/customer" element={<CustomerPage />} />
      <Route path="/menu" element={<MenuPage />} />
      <Route path="/room/:roomId" element={<RoomDetailPage />} />
      <Route
        path="/password-change"
        element={
          role ? (
            <PasswordChangePage />
          ) : (
            <Navigate to="/login" replace state={{ message: t("login_required") }} />
          )
        }
      />
      <Route
        path="/mfa"
        element={
          role ? (
            <MFAPage />
          ) : (
            <Navigate to="/login" replace state={{ message: t("login_required") }} />
          )
        }
      />
      <Route
        path="/sessions"
        element={
          role ? (
            <SessionsPage />
          ) : (
            <Navigate to="/login" replace state={{ message: t("login_required") }} />
          )
        }
      />
      <Route
        path="/admin/*"
        element={
          role && (role === "manager" || role === "receptionist") ? (
            <AdminLayout />
          ) : (
            <Navigate to="/login" replace state={{ message: t("login_required") }} />
          )
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="staff" element={<StaffManagementPage />} />
        <Route path="logs" element={<AuditLogPage />} />
        <Route path="orders" element={<OrdersPage />} />
        <Route path="guests" element={<CheckInOutPage />} />
        <Route path="security" element={<SecurityPage />} />
        <Route path="content" element={<ContentManagementPage />} />
      </Route>
      <Route
        path="/cleaner"
        element={
          role === "cleaner" ? (
            <CleanerPage />
          ) : (
            <Navigate to="/login" replace state={{ message: t("login_required") }} />
          )
        }
      />
    </Routes>
    <ChatWidget />
    </>
  );
};

export default App;

