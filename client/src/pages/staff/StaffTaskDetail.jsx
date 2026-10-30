import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import StaffLayout from "../../components/staff/StaffLayout";
import StatusBadge from "../../components/StatusBadge";
import PriorityBadge from "../../components/PriorityBadge";
import TimelineView from "../../components/TimelineView";
import BeforeAfterComparison from "../../components/BeforeAfterComparison";
import ImageUploadPreview from "../../components/ImageUploadPreview";
import { complaintApi, staffApi, getImageUrl } from "../../api/client";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  Phone,
  Wrench,
  CheckCircle2,
  Camera,
  Loader2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Check
} from "lucide-react";
import dayjs from "dayjs";
import toast from "react-hot-toast";

export const StaffTaskDetail = () => {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [complaintData, setComplaintData] = useState(null);

  // Modals
  const [showStartModal, setShowStartModal] = useState(false);
  const [startRemarks, setStartRemarks] = useState("");
  const [startPhoto, setStartPhoto] = useState(null);

  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolveRemarks, setResolveRemarks] = useState("");
  const [afterPhoto, setAfterPhoto] = useState(null);

  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      const res = await complaintApi.getComplaintById(id);
      if (res.data?.data) {
        setComplaintData(res.data.data);
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not load task details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [id]);

  // Handle Start Work (ASSIGNED -> IN_PROGRESS)
  const handleStartWork = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const formData = new FormData();
      if (startRemarks.trim()) formData.append("remarks", startRemarks.trim());
      if (startPhoto) formData.append("image", startPhoto);

      await staffApi.startWork(id, formData);
      toast.success("Task marked IN_PROGRESS. Field work commenced.");
      setShowStartModal(false);
      setStartRemarks("");
      setStartPhoto(null);
      fetchDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to start work.");
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Resolve (IN_PROGRESS -> RESOLVED)
  const handleResolve = async (e) => {
    e.preventDefault();

    if (!resolveRemarks.trim() || resolveRemarks.trim().length < 5) {
      toast.error("Please enter resolution remarks (at least 5 characters).");
      return;
    }

    if (!afterPhoto) {
      toast.error("An AFTER resolution photograph is strictly required to close the task!");
      return;
    }

    try {
      setActionLoading(true);
      const formData = new FormData();
      formData.append("remarks", resolveRemarks.trim());
      formData.append("image", afterPhoto);

      await staffApi.resolveTask(id, formData);
      toast.success("Grievance marked RESOLVED with photographic verification!");
      setShowResolveModal(false);
      setResolveRemarks("");
      setAfterPhoto(null);
      fetchDetails();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to resolve task.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <StaffLayout title="Task Inspection" subtitle="Loading field details...">
        <div className="py-24 flex items-center justify-center text-[#0D9488]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </StaffLayout>
    );
  }

  if (!complaintData) {
    return (
      <StaffLayout title="Task Inspection" subtitle="File record">
        <div className="bg-white rounded-2xl p-12 text-center border border-[#E2E8F0] shadow-xs max-w-md mx-auto">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-[#0F172A]">Task record not found</h3>
          <p className="text-xs text-[#64748B] mt-1 mb-4">
            This task does not exist or has been reassigned to another municipal department.
          </p>
          <Link
            to="/staff/tasks"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0D9488] hover:bg-[#0F766E] text-white rounded-xl text-xs font-semibold shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Assigned Tasks
          </Link>
        </div>
      </StaffLayout>
    );
  }

  const { complaint, beforeImage, afterImage, progressImages, timeline } = complaintData;

  return (
    <StaffLayout
      title={`Task #${complaint.complaintNumber}`}
      subtitle={`Reported on ${dayjs(complaint.createdAt).format("DD MMM YYYY, hh:mm A")}`}
      actions={
        <div className="flex items-center gap-2">
          <StatusBadge status={complaint.status} size="sm" />
          <PriorityBadge priority={complaint.priority} size="sm" />
        </div>
      }
    >
      <div className="space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/staff/tasks"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#0D9488] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Assigned Tasks
          </Link>
          <span className="text-xs text-[#64748B] font-mono">
            ID: #{complaint.complaintNumber}
          </span>
        </div>

        {/* ACTION REQUIRED BANNER */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#E2E8F0] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#64748B]">
              Field Action Required
            </span>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-base sm:text-lg font-bold text-[#0F172A]">
                Current Lifecycle:
              </span>
              <StatusBadge status={complaint.status} size="sm" />
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {(complaint.status === "ASSIGNED" || complaint.status === "REOPENED") && (
              <button
                type="button"
                onClick={() => setShowStartModal(true)}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <Wrench className="w-4 h-4" /> Start Work (Mark In-Progress)
              </button>
            )}

            {complaint.status === "IN_PROGRESS" && (
              <button
                type="button"
                onClick={() => setShowResolveModal(true)}
                className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Mark Resolved (Upload Proof)
              </button>
            )}

            {complaint.status === "RESOLVED" && (
              <span className="px-4 py-2 rounded-xl bg-[#DCFCE7] text-[#166534] border border-[#BBF7D0] text-xs font-bold flex items-center gap-1.5 shadow-2xs">
                <Check className="w-4 h-4 text-[#166534]" /> Marked Resolved • Verification Photo Attached
              </span>
            )}
          </div>
        </div>

        {/* REOPENED BANNER IF APPLICABLE */}
        {complaint.status === "REOPENED" && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 text-rose-900 shadow-xs">
            <div className="flex items-center gap-2 font-bold text-xs text-rose-700 uppercase tracking-wider mb-1">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Citizen Has Reopened This Grievance
            </div>
            <p className="text-xs text-rose-800">
              <span className="font-semibold">Citizen Feedback:</span> "{complaint.reopenReason}"
            </p>
          </div>
        )}

        {/* TASK DETAILS CARD */}
        <div className="bg-white rounded-2xl p-6 sm:p-7 border border-[#E2E8F0] shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-[#F1F5F9]">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-xs font-semibold text-[#64748B]">#{complaint.complaintNumber}</span>
                <span className="text-[#CBD5E1]">•</span>
                <span className="text-xs text-[#64748B] flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-[#94A3B8]" />
                  {dayjs(complaint.createdAt).format("DD MMM YYYY, hh:mm A")}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-[#0F172A] tracking-tight">
                {complaint.title}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <PriorityBadge priority={complaint.priority} size="sm" />
              <StatusBadge status={complaint.status} size="sm" />
            </div>
          </div>

          {/* Description */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-2">Issue Description</h4>
            <p className="text-sm text-[#334155] leading-relaxed bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
              {complaint.description}
            </p>
          </div>

          {/* Metadata Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="flex items-center gap-2 text-[#64748B] text-[10px] uppercase font-bold mb-1">
                <MapPin className="w-3.5 h-3.5 text-[#0D9488]" /> Location
              </div>
              <p className="font-semibold text-xs text-[#0F172A] truncate">{complaint.locationAddress}</p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="flex items-center gap-2 text-[#64748B] text-[10px] uppercase font-bold mb-1">
                <User className="w-3.5 h-3.5 text-[#0D9488]" /> Reporting Citizen
              </div>
              <p className="font-semibold text-xs text-[#0F172A] truncate">
                {complaint.citizen?.name || "Civic Citizen"} ({complaint.citizen?.phone || "No phone"})
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
              <div className="flex items-center gap-2 text-[#64748B] text-[10px] uppercase font-bold mb-1">
                <Calendar className="w-3.5 h-3.5 text-[#0D9488]" /> Category & Department
              </div>
              <p className="font-semibold text-xs text-[#0F172A] truncate">
                {complaint.category} • {complaint.subcategory || "General"}
              </p>
            </div>
          </div>

          {/* AI Vision Panel */}
          <div className="p-4 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0D9488] uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-[#0D9488]" /> AI Classification & Auto-Priority Analysis
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-[#0D9488] border border-[#99F6E4] shadow-2xs">
                AI Confidence: {complaint.aiConfidence ? `${Math.round(complaint.aiConfidence * 100)}%` : "Verified"}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="bg-white p-3 rounded-lg border border-[#CCFBF1]">
                <p className="text-[10px] text-[#64748B] font-semibold uppercase">Category</p>
                <p className="font-bold text-[#0F172A] mt-0.5 truncate">
                  {complaint.aiCategory || complaint.category || "General"}
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-[#CCFBF1]">
                <p className="text-[10px] text-[#64748B] font-semibold uppercase">Subcategory</p>
                <p className="font-bold text-[#0F172A] mt-0.5 truncate">
                  {complaint.aiSubcategory || complaint.subcategory || "Civic Defect"}
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-[#CCFBF1]">
                <p className="text-[10px] text-[#64748B] font-semibold uppercase">Priority</p>
                <p className="font-bold text-amber-700 mt-0.5 truncate">
                  {complaint.aiPriority || complaint.priority}
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-[#CCFBF1]">
                <p className="text-[10px] text-[#64748B] font-semibold uppercase">Status</p>
                <p className="font-bold text-[#0D9488] mt-0.5 truncate">
                  {complaint.aiCategory ? "AI Verified" : "Active"}
                </p>
              </div>
            </div>
          </div>

          {/* Photographic Comparison Section */}
          <div className="pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-3">
              Photographic Proofs (Before & After)
            </h3>
            <BeforeAfterComparison
              beforeImage={beforeImage}
              afterImage={afterImage}
              progressImages={progressImages}
              theme="light"
            />
          </div>

          {/* Resolution Activity Timeline */}
          <div className="pt-4 border-t border-[#F1F5F9]">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#64748B] mb-4">
              Activity & Actions Timeline
            </h3>
            <TimelineView updates={timeline} theme="light" />
          </div>
        </div>
      </div>

      {/* MODAL: START WORK */}
      {showStartModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] text-[#0F172A] rounded-2xl p-6 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 max-h-[90dvh] overflow-y-auto space-y-4">
            <div className="w-10 h-10 rounded-xl bg-[#F0FDFA] border border-[#CCFBF1] text-[#0D9488] flex items-center justify-center">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">Commence Field Work</h3>
              <p className="text-xs text-[#64748B] mt-1">
                Mark task #{complaint.complaintNumber} as IN_PROGRESS to notify citizen and city administration.
              </p>
            </div>

            <form onSubmit={handleStartWork} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Field Remarks (Optional)
                </label>
                <textarea
                  rows={3}
                  value={startRemarks}
                  onChange={(e) => setStartRemarks(e.target.value)}
                  placeholder="e.g. Arrived on-site with maintenance crew and equipment..."
                  className="w-full p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs sm:text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0D9488] resize-y"
                />
              </div>

              <ImageUploadPreview
                onImageChange={(file) => setStartPhoto(file)}
                required={false}
                label="Interim Progress Photo (Optional)"
                theme="light"
              />

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowStartModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Start"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESOLVE TASK (AFTER PHOTO & REMARKS) */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] text-[#0F172A] rounded-2xl p-6 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in-95 max-h-[90dvh] overflow-y-auto space-y-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">Submit Completion Evidence</h3>
              <p className="text-xs text-[#64748B] mt-1">
                A photograph of the completed repair ("AFTER" photo) and resolution remarks are mandatory for municipal verification.
              </p>
            </div>

            <form onSubmit={handleResolve} className="space-y-4">
              <ImageUploadPreview
                onImageChange={(file) => setAfterPhoto(file)}
                required={true}
                label="Resolution Photograph (AFTER Photo) *"
                theme="light"
              />

              <div>
                <label className="block text-xs font-semibold text-[#0F172A] mb-1">
                  Resolution Remarks *
                </label>
                <textarea
                  required
                  rows={3}
                  value={resolveRemarks}
                  onChange={(e) => setResolveRemarks(e.target.value)}
                  placeholder="e.g. Garbage cleared and bin disinfected. Road surface repaired with bitumen..."
                  className="w-full p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs sm:text-sm text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0D9488] resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="px-4 py-2 rounded-xl border border-[#E2E8F0] text-xs font-semibold text-[#64748B] hover:bg-[#F8FAFC] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 rounded-xl bg-[#0D9488] hover:bg-[#0F766E] text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" /> Submitting...
                    </>
                  ) : (
                    "Submit Resolution Proof"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </StaffLayout>
  );
};

export default StaffTaskDetail;
