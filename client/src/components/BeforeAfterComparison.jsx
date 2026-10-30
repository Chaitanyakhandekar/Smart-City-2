import React, { useState } from "react";
import { getImageUrl } from "../api/client";
import { Maximize2, X, CheckCircle, Clock } from "lucide-react";

export const BeforeAfterComparison = ({
  beforeImage,
  afterImage,
  progressImages = [],
  theme = "dark",
  beforeAction = null,
  afterAction = null
}) => {
  const [activeModalImage, setActiveModalImage] = useState(null);

  const beforeUrl = beforeImage?.imageUrl ? getImageUrl(beforeImage.imageUrl) : null;
  const afterUrl = afterImage?.imageUrl ? getImageUrl(afterImage.imageUrl) : null;
  const isLight = theme === "light";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* BEFORE IMAGE CARD */}
        <div className={`rounded-2xl p-4 flex flex-col justify-between border ${
          isLight
            ? "bg-[#F8FAFC] border-[#E2E8F0]"
            : "bg-[#070B14] border-slate-800"
        }`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                isLight
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : "bg-rose-950/40 text-rose-300 border-rose-500/30"
              }`}>
                <Clock className="w-3.5 h-3.5" /> BEFORE RESOLUTION
              </span>
              <span className={`text-xs ${isLight ? "text-[#64748B]" : "text-slate-400"}`}>Citizen Submission</span>
            </div>

            <div className={`relative group rounded-xl overflow-hidden aspect-video flex items-center justify-center border ${
              isLight
                ? "bg-[#F1F5F9] border-[#E2E8F0]"
                : "bg-slate-900 border-slate-800"
            }`}>
              {beforeUrl ? (
                <>
                  <img
                    src={beforeUrl}
                    alt="Before Resolution"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <button
                    onClick={() => setActiveModalImage({ url: beforeUrl, title: "Before Resolution" })}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-2 text-sm font-medium"
                  >
                    <Maximize2 className="w-5 h-5" /> Enlarge Photo
                  </button>
                </>
              ) : (
                <p className={`text-xs ${isLight ? "text-[#94A3B8]" : "text-slate-500"}`}>No before image provided</p>
              )}
            </div>
          </div>

          {beforeAction && (
            <div className={`mt-3 pt-3 border-t ${isLight ? "border-[#E2E8F0]" : "border-slate-800"}`}>
              {beforeAction}
            </div>
          )}
        </div>

        {/* AFTER IMAGE CARD */}
        <div className={`rounded-2xl p-4 flex flex-col justify-between border ${
          isLight
            ? "bg-[#F8FAFC] border-[#E2E8F0]"
            : "bg-[#070B14] border-slate-800"
        }`}>
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                isLight
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
              }`}>
                <CheckCircle className="w-3.5 h-3.5" /> AFTER RESOLUTION
              </span>
              <span className={`text-xs ${isLight ? "text-[#64748B]" : "text-slate-400"}`}>Municipal Verification</span>
            </div>

            <div className={`relative group rounded-xl overflow-hidden aspect-video flex items-center justify-center border ${
              isLight
                ? "bg-[#F1F5F9] border-[#E2E8F0]"
                : "bg-slate-900 border-slate-800"
            }`}>
              {afterUrl ? (
                <>
                  <img
                    src={afterUrl}
                    alt="After Resolution"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <button
                    onClick={() => setActiveModalImage({ url: afterUrl, title: "After Resolution" })}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-2 text-sm font-medium"
                  >
                    <Maximize2 className="w-5 h-5" /> Enlarge Photo
                  </button>
                </>
              ) : (
                <div className={`text-center p-4 ${isLight ? "text-[#64748B]" : "text-slate-400"}`}>
                  <p className="text-xs font-medium">Resolution photo pending</p>
                  <p className={`text-[11px] mt-1 ${isLight ? "text-[#94A3B8]" : "text-slate-500"}`}>
                    Field staff will upload proof of work upon task completion.
                  </p>
                </div>
              )}
            </div>
          </div>

          {afterAction && (
            <div className={`mt-3 pt-3 border-t ${isLight ? "border-[#E2E8F0]" : "border-slate-800"}`}>
              {afterAction}
            </div>
          )}
        </div>
      </div>

      {/* Progress Images if any */}
      {progressImages && progressImages.length > 0 && (
        <div className={`rounded-2xl p-4 border ${
          isLight
            ? "bg-[#F8FAFC] border-[#E2E8F0]"
            : "bg-[#070B14] border-slate-800"
        }`}>
          <h4 className={`text-xs font-bold uppercase tracking-wider mb-3 ${
            isLight ? "text-[#64748B]" : "text-slate-400"
          }`}>
            Interim Field Work Photos ({progressImages.length})
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {progressImages.map((prog, i) => {
              const url = getImageUrl(prog.imageUrl);
              return (
                <div
                  key={prog._id || i}
                  onClick={() => setActiveModalImage({ url, title: `Work In Progress #${i + 1}` })}
                  className={`relative group rounded-xl overflow-hidden aspect-video cursor-pointer border ${
                    isLight
                      ? "bg-[#F1F5F9] border-[#E2E8F0]"
                      : "bg-slate-900 border-slate-800"
                  }`}
                >
                  <img src={url} alt={`Progress ${i + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                    View
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Zoom Preview */}
      {activeModalImage && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800 text-white">
              <span className="text-sm font-semibold">{activeModalImage.title}</span>
              <button
                onClick={() => setActiveModalImage(null)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-2 flex items-center justify-center max-h-[75vh]">
              <img
                src={activeModalImage.url}
                alt={activeModalImage.title}
                className="max-h-[70vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BeforeAfterComparison;
