import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

type Props = {
  id?: number;
  title: string;
  price: number | string;
  amenities: string[];
  status: "available" | "occupied";
  image_url?: string | null;
  location?: string | null;
  wifi?: boolean;
  key?: string;
};

const RoomCard = ({ id, title, price, amenities, status, image_url, location, wifi }: Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
  const defaultImage = "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=800&q=60";
  const imageSrc = image_url ? `${apiUrl}${image_url}` : defaultImage;
  const priceDisplay = typeof price === "number" ? `₽${price.toFixed(2)}` : price;
  
  const handleClick = () => {
    if (id) {
      navigate(`/room/${id}`);
    }
  };
  
  return (
    <div onClick={id ? handleClick : undefined} className={id ? "cursor-pointer" : ""}>
    <motion.div
      whileHover={{ scale: 1.05 }}
      className="flex flex-col rounded-2xl bg-white shadow-lg"
    >
        <div className="h-40 rounded-t-2xl bg-cover bg-center" style={{ backgroundImage: `url('${imageSrc}')` }} />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-primary">{title}</h3>
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              status === "available" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
            }`}
          >
            {t(status)}
          </span>
        </div>
          <p className="text-2xl font-bold text-accent">{priceDisplay}</p>
          {location && <p className="text-sm text-slate-500">📍 {location}</p>}
          {wifi !== undefined && (
            <p className="text-sm text-slate-500">{wifi ? "📶 WiFi Available" : "📶 No WiFi"}</p>
          )}
        <ul className="text-sm text-slate-600">
          {amenities.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </div>
    </motion.div>
    </div>
  );
};

export default RoomCard;

