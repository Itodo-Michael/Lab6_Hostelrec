import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import { api } from "../services/api";
import { useAuthStore } from "../hooks/useAuthStore";

const GoogleAuthCallback = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(window.location.search || "");
  const setCredentials = useAuthStore((state: any) => state.setCredentials);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      const error = searchParams.get("error");

      if (error) {
        // Send error message to parent window if in popup
        if (window.opener) {
          window.opener.postMessage(
            { type: "GOOGLE_AUTH_ERROR", error },
            window.location.origin
          );
        }
        navigate("/login");
        return;
      }

      if (!code) {
        navigate("/login");
        return;
      }

      try {
        // Exchange code for token
        const response = await api.post("/auth/google/callback", { code });
        const { access_token, role } = response.data;

        // Send success message to parent window if in popup
        if (window.opener) {
          window.opener.postMessage(
            { type: "GOOGLE_AUTH_SUCCESS", access_token, role },
            window.location.origin
          );
          window.close();
          return;
        }

        // If not in popup, set credentials and navigate
        setCredentials(access_token, role);
        
        if (role === "manager" || role === "receptionist") {
          navigate("/admin");
        } else if (role === "cleaner") {
          navigate("/cleaner");
        } else {
          navigate("/customer");
        }
      } catch (err) {
        console.error("Google auth callback error:", err);
        // Send error message to parent window if in popup
        if (window.opener) {
          window.opener.postMessage(
            { type: "GOOGLE_AUTH_ERROR", error: "auth_failed" },
            window.location.origin
          );
          window.close();
          return;
        }
        navigate("/login");
      }
    };

    handleCallback();
  }, [searchParams, navigate, setCredentials]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 to-accent/10">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-8 shadow-xl text-center max-w-md mx-4"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"
        />
        <h2 className="text-xl font-bold text-primary mb-2">
          {t("authenticating") || "Authenticating..."}
        </h2>
        <p className="text-slate-600">
          {t("please_wait_google_auth") || "Please wait while we authenticate you with Google."}
        </p>
      </motion.div>
    </div>
  );
};

export default GoogleAuthCallback;