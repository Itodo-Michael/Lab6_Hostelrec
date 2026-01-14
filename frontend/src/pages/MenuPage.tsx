// @ts-nocheck
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import Navbar from "../components/Navbar";
import { api } from "../services/api";

type FoodItem = {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  available: boolean;
};

type DrinkItem = {
  id: number;
  name: string;
  description: string;
  price: number;
  image_url: string;
  category: string;
  available: boolean;
};

const MenuPage = () => {
  const { t } = useTranslation();
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [drinks, setDrinks] = useState<DrinkItem[]>([]);
  const [activeTab, setActiveTab] = useState<"food" | "drinks">("food");

  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    try {
      const [foodsRes, drinksRes] = await Promise.all([
        api.get("/content/foods?available_only=true"),
        api.get("/content/drinks?available_only=true"),
      ]);
      setFoods(foodsRes.data);
      setDrinks(drinksRes.data);
    } catch (err) {
      console.error("Failed to load menu", err);
    }
  };

  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
      <Navbar />
      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 pb-20 pt-10">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {t("menu_title") || "Food & Drinks Menu"}
          </h1>
          <p className="mt-3 text-slate-600">
            {t("menu_subtitle") || "Delicious meals and refreshing beverages"}
          </p>
        </motion.section>

        {/* Tabs */}
        <div className="flex gap-2 justify-center border-b border-slate-200">
          <button
            onClick={() => setActiveTab("food")}
            className={`px-6 py-2 font-semibold border-b-2 transition-colors ${
              activeTab === "food"
                ? "border-primary text-primary"
                : "border-transparent text-slate-600 hover:text-primary"
            }`}
          >
            {t("food") || "Food"}
          </button>
          <button
            onClick={() => setActiveTab("drinks")}
            className={`px-6 py-2 font-semibold border-b-2 transition-colors ${
              activeTab === "drinks"
                ? "border-primary text-primary"
                : "border-transparent text-slate-600 hover:text-primary"
            }`}
          >
            {t("drinks") || "Drinks"}
          </button>
        </div>

        {/* Food Items */}
        {activeTab === "food" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-6 md:grid-cols-3"
          >
            {foods.map((food, idx) => (
              <motion.div
                key={food.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="rounded-2xl bg-white/90 backdrop-blur-md p-6 shadow-xl border border-white/20"
              >
                {food.image_url && (
                  <img
                    src={`${apiUrl}${food.image_url}`}
                    alt={food.name}
                    className="w-full h-48 object-cover rounded-xl mb-4"
                  />
                )}
                <h3 className="text-xl font-bold text-primary">{food.name}</h3>
                <p className="text-sm text-slate-600 mt-2">{food.description}</p>
                <p className="text-2xl font-bold text-accent mt-4">₽{food.price}</p>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Drink Items */}
        {activeTab === "drinks" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid gap-6 md:grid-cols-3"
          >
            {drinks.map((drink, idx) => (
              <motion.div
                key={drink.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                whileHover={{ scale: 1.05, y: -5 }}
                className="rounded-2xl bg-white/90 backdrop-blur-md p-6 shadow-xl border border-white/20"
              >
                {drink.image_url && (
                  <img
                    src={`${apiUrl}${drink.image_url}`}
                    alt={drink.name}
                    className="w-full h-48 object-cover rounded-xl mb-4"
                  />
                )}
                <h3 className="text-xl font-bold text-primary">{drink.name}</h3>
                <p className="text-sm text-slate-600 mt-2">{drink.description}</p>
                <p className="text-2xl font-bold text-accent mt-4">₽{drink.price}</p>
              </motion.div>
            ))}
          </motion.div>
        )}

        {((activeTab === "food" && foods.length === 0) || (activeTab === "drinks" && drinks.length === 0)) && (
          <p className="text-center text-slate-500 py-10">
            {t("menu_empty") || "No items available at the moment."}
          </p>
        )}
      </main>
    </div>
  );
};

export default MenuPage;

