/** Shared claim-hygiene sentence for screening-only outputs (UI and PDFs). */
export const ENGINEERING_ESTIMATE_DISCLAIMER =
  "Engineering estimate — not for airworthiness, contractual allowables, or NADCAP/AS9100 certification.";

export const SYNTHETIC_COUPON_MMPDS_NOTICE =
  "Synthetic coupon n/lot is for teaching only and is not MMPDS A-basis or B-basis handbook allowables.";

interface EngineeringEstimateBannerProps {
  className?: string;
}

export function EngineeringEstimateBanner({ className = "" }: EngineeringEstimateBannerProps) {
  return (
    <div
      className={`rounded-lg border border-amber-500/40 bg-amber-950/50 px-3 py-2 text-xs text-amber-100 leading-relaxed ${className}`.trim()}
      role="note"
    >
      {ENGINEERING_ESTIMATE_DISCLAIMER}
    </div>
  );
}
