import React, { useState } from "react";
import AdminSidebar from "./AdminSidebar";
import AdminHeader from "./AdminHeader";
import MobileNavBottom from "../MobileNavBottom";

export const AdminLayout = ({
  children,
  title = "Operations Center",
  subtitle = "Here's what's happening in your city today.",
  onRefresh,
  refreshing = false,
  actions = null
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans antialiased text-[#0F172A] selection:bg-teal-500 selection:text-white">
      {/* Fixed Sidebar */}
      <AdminSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-[230px]">
        <AdminHeader
          title={title}
          subtitle={subtitle}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onRefresh={onRefresh}
          refreshing={refreshing}
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

export default AdminLayout;
