import { useState, useEffect } from "react";
import Header from "../../components/ui/Header";
import Icon from "../../components/ui/Icon";

const THEME_KEY = "knot_theme";

const THEMES = [
  { id: "dark",  label: "Midnight Wave", bg: "#000000", accent: "#7c3aed", textColor: "#e2e2e2" },
  { id: "light", label: "Ice Wave",      bg: "#f0f4ff", accent: "#3b82f6", textColor: "#1a1a1a" },
];

function applyTheme(id) {
  if (id === "light") {
    document.documentElement.classList.add("theme-light");
  } else {
    document.documentElement.classList.remove("theme-light");
  }
  localStorage.setItem(THEME_KEY, id);
}

export function initTheme() {
  const saved = localStorage.getItem(THEME_KEY) || "dark";
  applyTheme(saved);
}

export default function SettingsAppearance() {
  const [theme, setTheme] = useState(() => localStorage.getItem(THEME_KEY) || "dark");
  const [animations, setAnimations] = useState(() => localStorage.getItem("knot_animations") !== "false");
  const [autoTheme, setAutoTheme] = useState(() => localStorage.getItem("knot_auto_theme") === "true");

  const selectTheme = (id) => {
    setTheme(id);
    applyTheme(id);
  };

  useEffect(() => {
    if (autoTheme) {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      selectTheme(mq.matches ? "dark" : "light");
      const handler = (e) => selectTheme(e.matches ? "dark" : "light");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [autoTheme]);

  return (
    <>
      <Header title="Appearance" />
      <div className="flex flex-col gap-6 p-4">

        <p className="font-bold text-on-surface text-body-md">Select a theme</p>

        <div className="flex gap-4">
          {THEMES.map((t) => (
            <button key={t.id} onClick={() => selectTheme(t.id)} className="flex flex-col items-center gap-2">
              <div
                className={`w-36 h-24 rounded-2xl border-2 flex items-center justify-center relative overflow-hidden transition-all ${
                  theme === t.id ? "border-primary" : "border-outline-variant"
                }`}
                style={{ backgroundColor: t.bg }}
              >
                <div
                  className="w-16 h-16 rounded-full opacity-80"
                  style={{ background: `radial-gradient(circle, ${t.accent}, transparent)` }}
                />
                <p className="absolute bottom-2 left-0 right-0 text-center text-xs font-bold" style={{ color: t.textColor }}>
                  {t.label}
                </p>
                {theme === t.id && (
                  <span className="absolute top-2 right-2 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                    <Icon name="check" size={12} className="text-on-primary" />
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4 border-t border-outline-variant pt-4">
          <Checkbox
            label="Show Animations"
            checked={animations}
            onChange={(v) => { setAnimations(v); localStorage.setItem("knot_animations", String(v)); }}
          />
          <Checkbox
            label="Auto Dark/Light based on system settings"
            checked={autoTheme}
            onChange={(v) => { setAutoTheme(v); localStorage.setItem("knot_auto_theme", String(v)); }}
          />
        </div>

      </div>
    </>
  );
}

function Checkbox({ label, checked, onChange }) {
  return (
    <button onClick={() => onChange(!checked)} className="flex items-center gap-3 text-left">
      <span className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? "bg-primary border-primary" : "border-outline-variant"}`}>
        {checked && <Icon name="check" size={12} className="text-on-primary" />}
      </span>
      <span className="text-body-md text-on-surface">{label}</span>
    </button>
  );
}
