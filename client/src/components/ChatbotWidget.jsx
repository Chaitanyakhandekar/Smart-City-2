import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../context/authContex";
import { chatApi } from "../api/client";
import {
  MessageSquare,
  X,
  Send,
  Bot,
  User,
  Sparkles,
  ClipboardList,
  FolderOpen,
  PlusCircle,
  RotateCcw,
  Bell,
  Info,
  BarChart3,
  AlertTriangle,
  ListChecks,
  Layers
} from "lucide-react";
import ReactMarkdown from "react-markdown";

// ─────────────────────────────────────────────────────────
// Quick action definitions per role
// ─────────────────────────────────────────────────────────

const CITIZEN_QUICK_ACTIONS = [
  { label: "📋 Complaint Status", message: "What is my complaint status?", icon: ClipboardList },
  { label: "📂 My Complaints", message: "Show my complaints", icon: FolderOpen },
  { label: "➕ How to Report", message: "How do I submit a complaint?", icon: PlusCircle },
  { label: "🔄 How to Reopen", message: "How do I reopen my complaint?", icon: RotateCcw },
  { label: "📑 Categories", message: "What categories are available?", icon: Layers },
  { label: "🔔 Notifications", message: "Do I have notifications?", icon: Bell },
  { label: "ℹ️ About SmartCity", message: "What is SmartCity?", icon: Info }
];

const STAFF_QUICK_ACTIONS = [
  { label: "📋 My Tasks", message: "Show my assigned tasks", icon: ListChecks },
  { label: "📊 Task Summary", message: "How many tasks are pending?", icon: BarChart3 },
  { label: "📑 Categories", message: "What categories are available?", icon: Layers },
  { label: "ℹ️ About SmartCity", message: "What is SmartCity?", icon: Info }
];

const ADMIN_QUICK_ACTIONS = [
  { label: "📊 Complaint Stats", message: "How many complaints are pending?", icon: BarChart3 },
  { label: "⚠️ High Priority", message: "How many high priority complaints?", icon: AlertTriangle },
  { label: "📑 Categories", message: "What categories are available?", icon: Layers },
  { label: "ℹ️ About SmartCity", message: "What is SmartCity?", icon: Info }
];

function getQuickActions(role) {
  switch (role) {
    case "STAFF": return STAFF_QUICK_ACTIONS;
    case "ADMIN": return ADMIN_QUICK_ACTIONS;
    default: return CITIZEN_QUICK_ACTIONS;
  }
}

// ─────────────────────────────────────────────────────────
// Typing indicator component
// ─────────────────────────────────────────────────────────

const TypingIndicator = () => (
  <div className="flex items-center gap-2 pl-2">
    <div className="w-7 h-7 rounded-xl bg-teal-50 text-[#0D9488] border border-teal-200 flex items-center justify-center flex-shrink-0">
      <Bot className="w-4 h-4" />
    </div>
    <div className="bg-white border border-[#E2E8F0] rounded-2xl rounded-bl-xs px-4 py-2.5 shadow-xs">
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 bg-[#0D9488] rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
        <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
      </div>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────
// ChatbotWidget Component
// ─────────────────────────────────────────────────────────

export const ChatbotWidget = () => {
  const { user, isLoggedIn } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // Build personalized welcome message
  const firstName = user?.name ? user.name.split(" ")[0] : "";
  const welcomeText = firstName
    ? `Hello, ${firstName}! 👋 I'm your **SmartCity Civic Assistant**.\n\nI can check your active complaints, provide live status updates, guide you through filing reports, or explain municipal categories. How can I assist you today?`
    : "Hello! 👋 I'm your **SmartCity Civic Assistant**.\n\nI can check your active complaints, provide live status updates, guide you through filing reports, or explain municipal categories. How can I assist you today?";

  const [messages, setMessages] = useState([
    {
      sender: "bot",
      text: welcomeText,
      time: new Date()
    }
  ]);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [messages, isOpen]);

  if (!isLoggedIn) return null;

  const quickActions = getQuickActions(user?.role);

  const handleSend = async (messageToSend) => {
    const text = (messageToSend || inputMessage).trim();
    if (!text || loading) return;

    // Add user message
    const userMsg = { sender: "user", text, time: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setLoading(true);

    try {
      const res = await chatApi.sendMessage(text);
      const botResponse = res.data?.data?.message || "I could not process your request at this moment.";
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: botResponse,
          intent: res.data?.data?.intent,
          time: new Date()
        }
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "Sorry, I couldn't process that request right now. Please try again.",
          time: new Date()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 right-3 sm:right-6 z-50">
      {/* Chat Window */}
      {isOpen ? (
        <div className="w-[calc(100vw-24px)] sm:w-[400px] max-w-[400px] h-[min(540px,calc(100dvh-110px))] bg-white rounded-3xl shadow-2xl border border-[#E2E8F0] flex flex-col overflow-hidden transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-6 text-[#0F172A]">
          {/* Header */}
          <div className="bg-[#F8FAFC] p-4 flex items-center justify-between border-b border-[#E2E8F0]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#0D9488] border border-teal-200 flex items-center justify-center font-bold shadow-2xs">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold flex items-center gap-1.5 text-[#0F172A]" id="chatbot-header-title">
                  SmartCity Assistant <Sparkles className="w-3.5 h-3.5 text-[#0D9488]" />
                </h3>
                <span className="text-[10px] text-[#64748B] flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  Connected to Municipal DB
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg hover:bg-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] transition-colors"
              aria-label="Close chat"
              id="chatbot-close-btn"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#F8FAFC] text-xs sm:text-sm" id="chatbot-messages">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.sender === "bot" && (
                  <div className="w-7 h-7 rounded-xl bg-white text-[#0D9488] border border-[#E2E8F0] flex items-center justify-center flex-shrink-0 mt-1 shadow-2xs">
                    <Bot className="w-4 h-4" />
                  </div>
                )}
                <div
                  className={`p-3.5 rounded-2xl max-w-[85%] leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-[#0D9488] text-white rounded-br-xs shadow-xs"
                      : "bg-white text-[#0F172A] border border-[#E2E8F0] rounded-bl-xs shadow-xs"
                  }`}
                >
                  <div className={`prose prose-xs max-w-none text-current ${msg.sender === "user" ? "prose-invert [&_strong]:text-white" : "[&_strong]:text-[#0D9488] [&_a]:text-[#0D9488]"}`}>
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                </div>
                {msg.sender === "user" && (
                  <div className="w-7 h-7 rounded-xl bg-[#0F172A] text-white flex items-center justify-center flex-shrink-0 mt-1 shadow-2xs">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {loading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Chips */}
          <div className="px-3 py-2 bg-white border-t border-[#E2E8F0] flex items-center gap-1.5 overflow-x-auto no-scrollbar" id="chatbot-quick-actions">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(action.message)}
                disabled={loading}
                className="whitespace-nowrap px-2.5 py-1 rounded-lg bg-[#F8FAFC] hover:bg-teal-50 text-[#475569] hover:text-[#0D9488] hover:border-teal-200 text-[11px] font-medium transition-colors border border-[#E2E8F0] disabled:opacity-40"
                id={`chatbot-quick-${idx}`}
              >
                {action.label}
              </button>
            ))}
          </div>

          {/* Input Field */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-3 bg-white border-t border-[#E2E8F0] flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your complaints, status..."
              disabled={loading}
              className="flex-1 text-xs sm:text-sm px-3.5 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] text-[#0F172A] placeholder-[#94A3B8] rounded-xl focus:outline-none focus:border-[#0D9488] focus:bg-white disabled:opacity-60 transition-colors"
              id="chatbot-input"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || loading}
              className="p-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white disabled:opacity-40 transition-all shadow-xs font-bold"
              aria-label="Send message"
              id="chatbot-send-btn"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      ) : (
        /* Floating Button */
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3.5 sm:px-4 py-2.5 sm:py-3 bg-white hover:bg-[#F8FAFC] text-[#0F172A] font-semibold text-xs sm:text-sm rounded-full shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 border border-[#E2E8F0] group"
          aria-label="Open Smart City Assistant"
          id="chatbot-open-btn"
        >
          <div className="relative">
            <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 text-[#0D9488]" />
            <span className="absolute -top-1 -right-1 w-2 sm:w-2.5 h-2 sm:h-2.5 bg-[#0D9488] rounded-full animate-ping"></span>
          </div>
          <span className="tracking-tight whitespace-nowrap text-[#0F172A]">Smart Assistant</span>
        </button>
      )}
    </div>
  );
};

export default ChatbotWidget;
