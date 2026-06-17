import { useState } from "react";
import Header from "../../components/ui/Header";

const DEFAULT_ZAP_KEY = "knot_default_zap";
const ZAP_PRESETS = [
  { emoji: "👍", sats: 21,     label: "Great post 👍" },
  { emoji: "🚀", sats: 420,    label: "Let's go 🚀" },
  { emoji: "☕", sats: 1000,   label: "Coffee on me ☕" },
  { emoji: "🍻", sats: 5000,   label: "Cheers 🍻" },
  { emoji: "🍷", sats: 10000,  label: "Party time 🍷" },
  { emoji: "👑", sats: 100000, label: "Generational wealth 👑" },
];

export default function SettingsZaps() {
  const [defaultZap, setDefaultZap] = useState(
    () => parseInt(localStorage.getItem(DEFAULT_ZAP_KEY) || "42", 10),
  );

  const save = (val) => {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n > 0) {
      setDefaultZap(n);
      localStorage.setItem(DEFAULT_ZAP_KEY, String(n));
    }
  };

  return (
    <>
      <Header title="Zaps" />
      <div className="flex flex-col gap-6 p-4">

        <div className="flex flex-col gap-2">
          <p className="text-on-surface text-body-md font-medium">Default zap amount (sats)</p>
          <div className="flex items-center gap-3 bg-surface-container-low border border-outline-variant rounded-full px-4 py-3">
            <input
              type="number"
              min={1}
              value={defaultZap}
              onChange={(e) => save(e.target.value)}
              className="bg-transparent text-on-surface font-bold text-body-md w-24 focus:outline-none"
            />
            <span className="text-on-surface-variant text-body-md">Onward 🫡</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-on-surface text-body-md font-medium">Quick-select presets</p>
          <div className="flex flex-col gap-2">
            {ZAP_PRESETS.map((p) => (
              <button
                key={p.sats}
                onClick={() => save(p.sats)}
                className={`flex items-center gap-4 px-4 py-3 rounded-full border transition-colors ${
                  defaultZap === p.sats
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-outline-variant bg-surface-container-low hover:bg-surface-container-high text-on-surface"
                }`}
              >
                <span className="text-xl">{p.emoji}</span>
                <span className="font-bold w-16 text-right">{p.sats.toLocaleString()}</span>
                <span className="flex-1 text-left text-body-md">{p.label}</span>
              </button>
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
