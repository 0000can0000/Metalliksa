import React, { useState } from "react";
import { Zap, ChevronDown } from "lucide-react";
import { PipelineMaterialPayload } from "../utils/materialDataPipeline";
import { SendToModuleModal } from "./SendToModuleModal";

interface SendToModuleButtonProps {
  payload: PipelineMaterialPayload | null;
  onNavigate?: (tabId: string) => void;
  label?: string;
  variant?: "primary" | "secondary" | "compact" | "badge";
  className?: string;
}

export const SendToModuleButton: React.FC<SendToModuleButtonProps> = ({
  payload,
  onNavigate,
  label = "Send to Module",
  variant = "primary",
  className = "",
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!payload) return null;

  let baseStyle = "font-mono font-bold transition-all duration-150 flex items-center justify-center gap-1.5 active:scale-95";
  if (variant === "primary") {
    baseStyle += " px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-slate-950 shadow-[0_0_15px_rgba(56,189,248,0.35)] text-xs";
  } else if (variant === "secondary") {
    baseStyle += " px-3 py-1.5 rounded-lg bg-[#0c1322] hover:bg-[#121c30] border border-sky-500/30 hover:border-sky-400 text-sky-300 hover:text-white text-xs";
  } else if (variant === "compact") {
    baseStyle += " px-2.5 py-1 rounded-md bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 text-[11px]";
  } else if (variant === "badge") {
    baseStyle += " px-2 py-0.5 rounded bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 text-[10px]";
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsModalOpen(true);
        }}
        className={`${baseStyle} ${className}`}
        title={`Send ${payload.name} chemistry & kinetics to simulation modules`}
      >
        <Zap className="w-3.5 h-3.5 text-amber-300" />
        <span>{label}</span>
      </button>

      {isModalOpen && (
        <SendToModuleModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          payload={payload}
          onNavigate={onNavigate}
        />
      )}
    </>
  );
};
