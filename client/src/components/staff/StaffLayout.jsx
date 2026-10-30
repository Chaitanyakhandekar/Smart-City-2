import React, { useState } from "react";
import StaffSidebar from "./StaffSidebar";
import StaffHeader from "./StaffHeader";
import MobileNavBottom from "../MobileNavBottom";

export const StaffLayout = ({
  children,
  title = "Field Operations",
  subtitle = "Manage your assigned tasks, inspect issues, and submit completion proof",
  actions = null
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans antialiased text-[#0F172A] selection:bg-teal-500 selection:text-white">
      {/* Fixed Staff Sidebar */}
      <StaffSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Canvas Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-[230px]">
        <StaffHeader
          title={title}
          subtitle={subtitle}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          actions={actions}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-7 pb-24 sm:pb-28 lg:pb-7 min-w-0 space-y-6 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Responsive Bottom Navigation Bar */}
      <MobileNavBottom />
    </div>
  );
};

export default StaffLayout;
