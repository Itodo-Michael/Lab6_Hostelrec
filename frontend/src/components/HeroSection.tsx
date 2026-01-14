// @ts-nocheck
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const HeroSection = ({ occupancyHigh }: { occupancyHigh: boolean }) => {
  const { t } = useTranslation();

  return (
    <section className="relative overflow-hidden rounded-3xl bg-primary text-white">
      <div className="absolute inset-0">
        <video
          className="h-full w-full object-cover opacity-40"
          autoPlay
          loop
          muted
          playsInline
          src="https://storage.googleapis.com/coverr-main/mp4/Mt_Baker.mp4"
        />
      </div>
      <div className="relative z-10 p-12">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-accent font-semibold uppercase tracking-wide"
        >
          {t("welcome")}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          className="mt-4 text-4xl font-extrabold md:text-6xl"
        >
          {t("best_hostel")}
        </motion.h1>
        <motion.p
          className="mt-6 max-w-2xl text-lg text-white/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          {t("hero_subtitle")}
        </motion.p>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 flex items-center gap-4"
        >
          <button className="rounded-full bg-accent px-6 py-3 text-lg font-semibold text-primary shadow-lg hover:shadow-xl transition">
            {t("book_btn")}
          </button>
          {occupancyHigh ? (
            <span className="flex items-center gap-2 rounded-full bg-danger/90 px-4 py-2 text-sm font-semibold text-white animate-pulse">
              {t("availability_high")}
            </span>
          ) : (
            <span className="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold">
              {t("availability_normal")}
            </span>
          )}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;

