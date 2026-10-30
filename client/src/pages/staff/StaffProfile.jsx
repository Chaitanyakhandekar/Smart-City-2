import React from "react";
import StaffLayout from "../../components/staff/StaffLayout";
import { useAuth } from "../../context/authContex";
import {
  Briefcase,
  Mail,
  Phone,
  Shield,
  BadgeCheck,
  Building,
  CheckCircle,
  Calendar
} from "lucide-react";

export const StaffProfile = () => {
  const { user } = useAuth();

  return (
    <StaffLayout
      title="Staff Profile & Credentials"
      subtitle="Official municipal field personnel details and account authorization"
    >
      <div className="max-w-3xl space-y-6">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-[#E2E8F0] shadow-xs space-y-6">
          {/* Header Profile Info */}
          <div className="flex items-center gap-4">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-[#0D9488]/30 shadow-xs"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-[#0D9488] text-white flex items-center justify-center font-bold text-xl shadow-xs">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : "AP"}
              </div>
            )}
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-[#0F172A]">
                {user?.name || "Amit Patil"}
              </h3>
              <p className="text-xs text-[#64748B]">
                {user?.designation || "Municipal Field Officer"}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#F0FDFA] text-[#0D9488] border border-[#CCFBF1]">
                  <CheckCircle className="w-3.5 h-3.5" /> Verified Municipal Personnel
                </span>
                <span className="text-xs text-[#64748B] font-mono">
                  Dept: {user?.department || "Waste Management"}
                </span>
              </div>
            </div>
          </div>

          {/* Detailed Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-4 border-t border-[#F1F5F9]">
            <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center text-[#0D9488] shadow-2xs flex-shrink-0">
                <BadgeCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-[#64748B]">Employee ID</p>
                <p className="font-semibold text-sm text-[#0F172A] truncate mt-0.5">
                  {user?.employeeId || "EMP-FLD-0428"}
                </p>
              </div>
            </div>

            <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center text-[#0D9488] shadow-2xs flex-shrink-0">
                <Mail className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-[#64748B]">Official Email</p>
                <p className="font-semibold text-sm text-[#0F172A] truncate mt-0.5">
                  {user?.email || "amit.patil@smartcity.gov"}
                </p>
              </div>
            </div>

            <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center text-[#0D9488] shadow-2xs flex-shrink-0">
                <Phone className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-[#64748B]">Official Contact</p>
                <p className="font-semibold text-sm text-[#0F172A] truncate mt-0.5">
                  {user?.phone || "+91 98220 12345"}
                </p>
              </div>
            </div>

            <div className="p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-lg bg-white border border-[#E2E8F0] flex items-center justify-center text-[#0D9488] shadow-2xs flex-shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-[#64748B]">System Role</p>
                <p className="font-semibold text-sm text-[#0F172A] truncate mt-0.5">
                  FIELD OPERATIONS OFFICER
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Operational Scope & Protocol */}
        <div className="bg-white rounded-2xl p-6 border border-[#E2E8F0] shadow-xs space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
            Field Operational Protocol
          </h4>
          <p className="text-xs text-[#64748B] leading-relaxed">
            Staff members assigned to civic repair tasks must verify initial site conditions, maintain active telemetry when starting work, and attach clear photographic evidence before closing grievances. All actions are logged into the municipal audit trail.
          </p>
        </div>
      </div>
    </StaffLayout>
  );
};

export default StaffProfile;
