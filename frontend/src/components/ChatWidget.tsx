// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { useAuthStore } from "../hooks/useAuthStore";
import { api } from "../services/api";

type ChatMessage = {
  id?: number;
  user_id?: number;
  username: string;
  message: string;
  timestamp?: string;
  created_at?: string;
};

type Customer = {
  id: number;
  username: string;
  full_name?: string;
  room_number?: string;
  profile_picture_url?: string;
};

const ChatWidget = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const token = useAuthStore((state) => state.token);
  const role = useAuthStore((state) => state.role);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showCustomerSelect, setShowCustomerSelect] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  
  // Extract username from token (JWT payload) or use default
  const getUsername = () => {
    if (!token) return "Guest";
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.sub || "Guest";
    } catch {
      return "Guest";
    }
  };
  const username = getUsername();

  // Get current user ID
  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        // You might need to fetch user ID from API if not in token
        setCurrentUserId(payload.user_id || null);
      } catch {
        setCurrentUserId(null);
      }
    }
  }, [token]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load customers list for staff
  useEffect(() => {
    if ((role === "receptionist" || role === "manager") && isOpen) {
      api.get<Customer[]>("/customer/list")
        .then((res) => setCustomers(res.data))
        .catch((err) => console.error("Failed to load customers", err));
    }
  }, [isOpen, role]);

  useEffect(() => {
    if (!isOpen) return;

    // Load recent messages
    const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";
    fetch(`${apiUrl}/chat/messages`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    })
      .then((res) => res.json())
      .then((data) => {
        setMessages(data || []);
      })
      .catch((err) => console.error("Failed to load messages", err));

    // Connect WebSocket
    const wsUrl = apiUrl.replace("http", "ws");
    const websocket = new WebSocket(`${wsUrl}/chat/ws`);

    websocket.onopen = () => {
      setConnected(true);
      setWs(websocket);
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "message") {
        setMessages((prev) => [...prev, data]);
      } else if (data.type === "message_deleted") {
        setMessages((prev) => prev.filter((msg) => msg.id !== data.message_id));
      }
    };

    websocket.onerror = (error) => {
      console.error("WebSocket error:", error);
      setConnected(false);
    };

    websocket.onclose = () => {
      setConnected(false);
    };

    return () => {
      websocket.close();
    };
  }, [isOpen]);

  const sendMessage = (e: any) => {
    e.preventDefault();
    if (!inputMessage.trim() || !ws || !connected) return;

    const messageData = {
      user_id: currentUserId || 0,
      username: username,
      message: inputMessage,
      timestamp: new Date().toISOString(),
    };

    ws.send(JSON.stringify(messageData));
    setInputMessage("");
  };

  const deleteMessage = async (messageId: number) => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    try {
      await api.delete(`/chat/messages/${messageId}`);
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
    } catch (err) {
      console.error("Failed to delete message", err);
      alert("Failed to delete message");
    }
  };

  const canDeleteMessage = (msg: ChatMessage) => {
    // Staff can delete any message, users can delete their own
    return role === "manager" || role === "receptionist" || (msg.user_id && msg.user_id === currentUserId);
  };

  return (
    <>
      {/* Chat Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-primary to-accent text-white shadow-2xl transition-all hover:shadow-3xl"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.svg
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </motion.svg>
          ) : (
            <motion.svg
              key="chat"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </motion.svg>
          )}
        </AnimatePresence>
        {!connected && isOpen && (
          <motion.span
            className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1 }}
          />
        )}
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="fixed bottom-24 right-6 z-40 flex h-[500px] w-96 flex-col rounded-2xl bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between rounded-t-2xl bg-gradient-to-r from-primary to-accent p-4 text-white relative">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-white"></div>
                <h3 className="font-semibold text-sm">
                  {selectedCustomer ? `Chat with ${selectedCustomer.full_name || selectedCustomer.username}` : (t("chat_title") || "Live Chat")}
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {(role === "receptionist" || role === "manager") && (
                  <button
                    onClick={() => setShowCustomerSelect(!showCustomerSelect)}
                    className="p-1 hover:bg-white/20 rounded"
                    title="Select customer"
                  >
                    👤
                  </button>
                )}
                <span
                  className={`h-2 w-2 rounded-full ${
                    connected ? "bg-green-300" : "bg-red-300"
                  }`}
                />
              </div>

              {/* Customer Selection Dropdown (Staff Only) */}
              {showCustomerSelect && (role === "receptionist" || role === "manager") && (
                <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto mt-2">
                  {customers.length === 0 ? (
                    <div className="p-4 text-center text-slate-500">No customers found</div>
                  ) : (
                    customers.map((customer) => (
                      <button
                        key={customer.id}
                        onClick={() => {
                          setSelectedCustomer(customer);
                          setShowCustomerSelect(false);
                        }}
                        className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 text-left"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center text-white font-semibold">
                          {customer.profile_picture_url ? (
                            <img src={customer.profile_picture_url} alt={customer.full_name || customer.username} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            (customer.full_name || customer.username).charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800">{customer.full_name || customer.username}</p>
                          {customer.room_number && (
                            <p className="text-xs text-slate-500">Room {customer.room_number}</p>
                          )}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <AnimatePresence>
                {messages.map((msg, idx) => {
                  const isOwn = msg.username === username;
                  const canDelete = canDeleteMessage(msg);
                  return (
                    <motion.div
                      key={msg.id || idx}
                      initial={{ opacity: 0, x: isOwn ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: isOwn ? 20 : -20 }}
                      className={`flex ${isOwn ? "justify-end" : "justify-start"} group`}
                    >
                      <div className="relative">
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-2 ${
                            isOwn
                              ? "bg-gradient-to-r from-primary to-accent text-white"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          {!isOwn && (
                            <p className="text-xs font-semibold mb-1 opacity-80">
                              {msg.username}
                            </p>
                          )}
                          <p className="text-sm">{msg.message}</p>
                          <p className="text-xs mt-1 opacity-60">
                            {new Date(msg.timestamp || msg.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                        {canDelete && msg.id && (
                          <motion.button
                            initial={{ opacity: 0 }}
                            whileHover={{ opacity: 1 }}
                            className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => deleteMessage(msg.id!)}
                            title="Delete message"
                          >
                            ×
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={sendMessage} className="border-t border-slate-200 p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder={t("chat_placeholder") || "Type a message..."}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={!connected}
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={!connected || !inputMessage.trim()}
                  className="rounded-xl bg-primary px-4 py-2 text-white disabled:opacity-50"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatWidget;

