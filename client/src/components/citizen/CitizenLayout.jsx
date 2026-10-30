import React, { useState } from "react";
import CitizenSidebar from "./CitizenSidebar";
import CitizenHeader from "./CitizenHeader";
import ChatbotWidget from "../ChatbotWidget";
import MobileNavBottom from "../MobileNavBottom";

export const CitizenLayout = ({
  children,
  title = "Dashboard",
  subtitle = "Track your civic complaints and help build a better city",
  searchQuery,
  onSearchChange,
  actions = null
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans antialiased text-[#0F172A] selection:bg-teal-500 selection:text-white">
      {/* Fixed Citizen Sidebar */}
      <CitizenSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-[230px]">
        <CitizenHeader
          title={title}
          subtitle={subtitle}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          actions={actions}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-7 pb-24 sm:pb-28 lg:pb-7 min-w-0 space-y-6 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Smart Assistant Chatbot Widget */}
      <ChatbotWidget />

      {/* Mobile Responsive Bottom Navigation Bar */}
      <MobileNavBottom />
    </div>
  );
};

export default CitizenLayout;
