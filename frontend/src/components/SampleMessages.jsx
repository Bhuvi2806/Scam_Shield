import PropTypes from "prop-types";

const SAMPLES = [
  {
    id: "sample-kyc",
    label: "Fake KYC Threat",
    tag: "Likely Scam",
    tagClass: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    text: "URGENT: Your SBI bank account will be suspended today due to pending KYC update. Click https://sbi-kyc-update.in to verify immediately.",
  },
  {
    id: "sample-electricity",
    label: "Electricity Cut Threat",
    tag: "Likely Scam",
    tagClass: "bg-rose-500/20 text-rose-300 border-rose-500/30",
    text: "Dear consumer, your electricity power supply will be disconnected tonight at 9:30 PM because previous bill was not updated. Immediately call electricity officer 9876543210.",
  },
  {
    id: "sample-genuine-otp",
    label: "Authentic Bank Alert",
    tag: "Genuine / Safe",
    tagClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    text: "Dear Customer, INR 1,250.00 debited from A/C XX4321 on 29-Oct-26 via UPI. Info: Swiggy. If not done by you, SMS BLOCK to 567676. Never share OTP or PIN with anyone.",
  },
];

/**
 * SampleMessages renders one-click demo messages for quick exploration.
 */
export function SampleMessages({ onSelect, disabled = false }) {
  return (
    <div className="mt-4 pt-4 border-t border-white/5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-text-muted">
          Try a sample message / उदाहरण देखें:
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {SAMPLES.map((sample) => (
          <button
            key={sample.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(sample.text)}
            className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium bg-surface/90 hover:bg-surface-light text-text border border-white/10 hover:border-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            <span>{sample.label}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded font-semibold border ${sample.tagClass}`}>
              {sample.tag}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

SampleMessages.propTypes = {
  onSelect: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};
