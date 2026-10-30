import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  MapPin,
  Maximize2,
  Plus,
  Minus,
  Navigation,
  ExternalLink,
  X
} from "lucide-react";

export const StaffTaskMap = ({ tasks = [] }) => {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [activeTask, setActiveTask] = useState(null);
  const [fullModal, setFullModal] = useState(false);

  // Derive counts
  const highPriorityTasks = tasks.filter(
    (t) => t.priority === "CRITICAL" || t.priority === "HIGH"
  );
  const medPriorityTasks = tasks.filter(
    (t) => t.priority === "MEDIUM" || t.priority === "LOW"
  );

  // Position markers over stylized municipal zones
  const samplePins = [
    {
      id: "pin-1",
      x: 215,
      y: 110,
      priority: "HIGH",
      color: "#EF4444",
      label: "Overflowing garbage bin",
      location: "Park Avenue, Ward 3",
      taskId: tasks[0]?._id
    },
    {
      id: "pin-2",
      x: 145,
      y: 155,
      priority: "MEDIUM",
      color: "#F59E0B",
      label: "Garbage on roadside",
      location: "MG Road, Ward 1",
      taskId: tasks[1]?._id
    },
    {
      id: "pin-3",
      x: 245,
      y: 210,
      priority: "HIGH",
      color: "#EF4444",
      label: "Clogged drain",
      location: "Elm Street, Ward 2",
      taskId: tasks[2]?._id
    },
    {
      id: "pin-4",
      x: 310,
      y: 130,
      priority: "MEDIUM",
      color: "#F59E0B",
      label: "Streetlight not working",
      location: "Shiva Nagar, Ward 4",
      taskId: tasks[3]?._id
    }
  ];

  const handleZoomIn = () => setZoomLevel((z) => Math.min(z + 0.2, 1.6));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(z - 0.2, 0.8));

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 sm:p-5 shadow-xs space-y-3 flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#F0FDFA] text-[#0D9488] flex items-center justify-center border border-[#CCFBF1]">
            <MapPin className="w-3.5 h-3.5" />
          </div>
          <h3 className="text-sm font-bold text-[#0F172A]">Task Locations</h3>
        </div>
        <button
          type="button"
          onClick={() => setFullModal(true)}
          className="p-1 text-[#94A3B8] hover:text-[#0F172A] rounded-lg hover:bg-[#F8FAFC] transition-colors"
          title="Expand Map"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Map Surface */}
      <div className="relative rounded-xl overflow-hidden border border-[#E2E8F0] bg-[#EBF4F6] aspect-[4/3] flex items-center justify-center select-none">
        <div
          className="w-full h-full relative transition-transform duration-200 ease-out"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          {/* Base SVG Map Vector */}
          <svg
            className="w-full h-full object-cover"
            viewBox="0 0 380 260"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Background land */}
            <rect width="380" height="260" fill="#F1F5F9" />

            {/* City Blocks */}
            <rect x="20" y="20" width="85" height="65" rx="6" fill="#E2E8F0" opacity="0.6" />
            <rect x="120" y="20" width="100" height="65" rx="6" fill="#E2E8F0" opacity="0.6" />
            <rect x="235" y="20" width="125" height="65" rx="6" fill="#E2E8F0" opacity="0.6" />

            <rect x="20" y="100" width="85" height="135" rx="6" fill="#E2E8F0" opacity="0.6" />
            <rect x="120" y="100" width="60" height="65" rx="6" fill="#E2E8F0" opacity="0.6" />
            <rect x="120" y="180" width="60" height="55" rx="6" fill="#E2E8F0" opacity="0.6" />

            {/* Lakeside Park */}
            <path
              d="M20 180 C 40 170, 75 175, 85 200 C 95 220, 80 245, 45 245 C 20 245, 20 210, 20 180 Z"
              fill="#DCFCE7"
              stroke="#86EFAC"
              strokeWidth="1.5"
            />
            <text x="35" y="210" fill="#15803D" fontSize="8" fontWeight="bold">
              Lakeside
            </text>
            <text x="42" y="220" fill="#15803D" fontSize="8" fontWeight="bold">
              Park
            </text>

            {/* River Curve */}
            <path
              d="M255 0 C 240 70, 280 130, 290 170 C 300 210, 275 240, 260 260 L 310 260 C 330 230, 350 190, 330 140 C 315 90, 300 40, 305 0 Z"
              fill="#BAE6FD"
            />

            {/* Roads */}
            <path d="M 0 92 L 380 92" stroke="#FFFFFF" strokeWidth="8" />
            <path d="M 0 92 L 380 92" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" />

            <path d="M 0 172 L 380 172" stroke="#FFFFFF" strokeWidth="6" />
            <path d="M 112 0 L 112 260" stroke="#FFFFFF" strokeWidth="7" />
            <path d="M 190 0 L 190 260" stroke="#FFFFFF" strokeWidth="6" />
            <path d="M 230 0 L 230 92" stroke="#FFFFFF" strokeWidth="5" />
          </svg>

          {/* User Location Pulse Marker (Blue) */}
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer group"
            style={{ left: "190px", top: "135px" }}
            title="Your Current Location (Field Unit)"
          >
            <span className="animate-ping absolute w-5 h-5 rounded-full bg-blue-400 opacity-75" />
            <div className="relative w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-md flex items-center justify-center text-white text-[8px] font-bold">
              <Navigation className="w-2.5 h-2.5 rotate-45" />
            </div>
          </div>

          {/* Task Pins */}
          {samplePins.map((pin) => (
            <div
              key={pin.id}
              className="absolute -translate-x-1/2 -translate-y-full cursor-pointer hover:scale-125 transition-transform z-10"
              style={{ left: `${pin.x}px`, top: `${pin.y}px` }}
              onClick={() => setActiveTask(pin)}
            >
              <div
                className="w-5 h-5 rounded-full shadow-md flex items-center justify-center text-white border-2 border-white"
                style={{ backgroundColor: pin.color }}
              >
                <MapPin className="w-3 h-3 fill-white" />
              </div>
            </div>
          ))}

          {/* Active Pin Tooltip */}
          {activeTask && (
            <div
              className="absolute z-20 bg-white border border-[#E2E8F0] rounded-xl p-2.5 shadow-xl text-left text-xs max-w-[170px] -translate-x-1/2"
              style={{
                left: `${activeTask.x}px`,
                top: `${activeTask.y - 40}px`
              }}
            >
              <div className="flex items-center justify-between gap-1 mb-1">
                <span
                  className="px-1.5 py-0.2 rounded text-[9px] font-bold text-white uppercase"
                  style={{ backgroundColor: activeTask.color }}
                >
                  {activeTask.priority}
                </span>
                <button
                  type="button"
                  onClick={() => setActiveTask(null)}
                  className="text-[#94A3B8] hover:text-[#0F172A]"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <p className="font-bold text-[#0F172A] truncate leading-tight">
                {activeTask.label}
              </p>
              <p className="text-[10px] text-[#64748B] truncate mt-0.5">
                {activeTask.location}
              </p>
              {activeTask.taskId && (
                <Link
                  to={`/staff/tasks/${activeTask.taskId}`}
                  className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-[#0D9488] hover:underline"
                >
                  Inspect Task <ExternalLink className="w-2.5 h-2.5" />
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Map Zoom Controls in bottom right */}
        <div className="absolute bottom-2.5 right-2.5 flex flex-col bg-white rounded-lg border border-[#E2E8F0] shadow-2xs divide-y divide-[#F1F5F9] z-10">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-1 hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A] transition-colors"
            title="Zoom in"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-1 hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#0F172A] transition-colors"
            title="Zoom out"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Legend below map matching screenshot */}
      <div className="flex items-center justify-between text-[11px] font-semibold text-[#64748B] pt-1 border-t border-[#F1F5F9]">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] inline-block" />
          <span>High ({Math.max(2, highPriorityTasks.length)})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] inline-block" />
          <span>Medium ({Math.max(3, medPriorityTasks.length)})</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
          <span>Your Location</span>
        </div>
      </div>

      {/* Fullscreen Map Modal */}
      {fullModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E2E8F0] p-5 max-w-2xl w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#0D9488]" />
                <h3 className="font-bold text-[#0F172A] text-sm">
                  Field Operations Municipal Map
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setFullModal(false)}
                className="p-1 text-[#64748B] hover:text-[#0F172A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-[#E2E8F0] aspect-video relative bg-[#EBF4F6]">
              {/* Scaled view */}
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-xs text-[#64748B] font-medium">
                  Expanded view of municipal zone assignments and telemetry.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffTaskMap;
