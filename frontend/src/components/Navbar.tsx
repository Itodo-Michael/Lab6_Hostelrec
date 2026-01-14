// @ts-nocheck
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import { useAuthStore } from "../hooks/useAuthStore";
import LanguageToggle from "./LanguageToggle";

const Navbar = () => {
  const { t } = useTranslation();
  const role = useAuthStore((state) => state.role);
  const logout = useAuthStore((state) => state.logout);

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-30 flex items-center justify-between bg-white/90 backdrop-blur-md px-6 py-4 shadow-lg border-b border-slate-200/50"
    >
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Link to="/" className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          HostelRec
        </Link>
      </motion.div>

      <nav className="flex items-center gap-4 text-sm font-semibold">
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Link to="/" className="hover:text-accent transition-colors relative group">
            {t("nav_public")}
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-accent group-hover:w-full transition-all duration-300"></span>
          </Link>
        </motion.div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Link to="/customer" className="hover:text-accent transition-colors relative group">
            {t("nav_customer")}
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-accent group-hover:w-full transition-all duration-300"></span>
          </Link>
        </motion.div>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Link to="/menu" className="hover:text-accent transition-colors relative group">
            {t("nav_menu") || "Menu"}
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-accent group-hover:w-full transition-all duration-300"></span>
          </Link>
        </motion.div>
        {(role === "manager" || role === "receptionist") && (
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to="/admin" className="hover:text-accent transition-colors relative group">
              {t("nav_admin")}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-accent group-hover:w-full transition-all duration-300"></span>
            </Link>
          </motion.div>
        )}
        {role === "cleaner" && (
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to="/cleaner" className="hover:text-accent transition-colors relative group">
              {t("cleaner")}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-accent group-hover:w-full transition-all duration-300"></span>
            </Link>
          </motion.div>
        )}
      </nav>

      <div className="flex items-center gap-3">
        <LanguageToggle />
        {role ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={logout}
            className="rounded-lg bg-gradient-to-r from-primary to-accent px-4 py-2 text-white shadow-lg hover:shadow-xl transition-all"
          >
            {t("Sign out")}
          </motion.button>
        ) : (
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link to="/login" className="rounded-lg border-2 border-primary px-4 py-2 text-primary hover:bg-primary hover:text-white transition-all">
              {t("Sign in")}
            </Link>
          </motion.div>
        )}
      </div>
    </motion.header>
  );
};

export default Navbar;

