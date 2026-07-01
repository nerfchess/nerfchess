"use client";

import { Image as ImageIcon, Paintbrush, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface BackgroundPreset {
  id: string;
  name: string;
  value: string;
}

const PRESETS: BackgroundPreset[] = [
  {
    id: "royal",
    name: "Royal dusk",
    value:
      "radial-gradient(ellipse 120% 70% at 50% -20%, rgba(200,155,74,0.07), transparent 60%), radial-gradient(ellipse 80% 50% at 100% 110%, rgba(124,122,163,0.05), transparent 70%), linear-gradient(180deg, #111a2b 0%, #0a111e 100%)",
  },
  {
    id: "boardroom",
    name: "Boardroom",
    value:
      "linear-gradient(45deg, rgba(216,181,110,0.05) 25%, transparent 25% 75%, rgba(216,181,110,0.05) 75%), linear-gradient(45deg, rgba(216,181,110,0.05) 25%, transparent 25% 75%, rgba(216,181,110,0.05) 75%), radial-gradient(circle at 12% 12%, rgba(90,155,122,0.12), transparent 34%), linear-gradient(180deg, #111a2b, #070d17)",
  },
  {
    id: "oxblood",
    name: "Oxblood hall",
    value:
      "radial-gradient(circle at 85% 12%, rgba(181,70,65,0.2), transparent 36%), radial-gradient(circle at 10% 88%, rgba(216,181,110,0.1), transparent 32%), linear-gradient(180deg, #16101a, #08070d)",
  },
  {
    id: "verdigris",
    name: "Verdigris study",
    value:
      "radial-gradient(circle at 18% 20%, rgba(90,155,122,0.22), transparent 34%), radial-gradient(circle at 88% 78%, rgba(124,122,163,0.13), transparent 38%), linear-gradient(180deg, #0d1720, #07100e)",
  },
  {
    id: "parchment",
    name: "Parchment night",
    value:
      "linear-gradient(180deg, rgba(236,231,214,0.08), transparent 260px), radial-gradient(circle at 74% 8%, rgba(216,181,110,0.12), transparent 30%), linear-gradient(180deg, #141728, #080b14)",
  },
  {
    id: "tournament",
    name: "Tournament floor",
    value:
      "repeating-linear-gradient(90deg, rgba(236,231,214,0.04) 0 1px, transparent 1px 72px), repeating-linear-gradient(0deg, rgba(236,231,214,0.025) 0 1px, transparent 1px 72px), radial-gradient(circle at 50% -10%, rgba(200,155,74,0.1), transparent 42%), linear-gradient(180deg, #101827, #07101d)",
  },
];

const PRESET_KEY = "nerfchess:bg-preset";
const CUSTOM_KEY = "nerfchess:bg-custom";

export function BackgroundControls() {
  const [preset, setPreset] = useState("royal");
  const [custom, setCustom] = useState<string | null>(null);
  const active = useMemo(() => PRESETS.find((item) => item.id === preset) ?? PRESETS[0], [preset]);

  useEffect(() => {
    try {
      setPreset(window.localStorage.getItem(PRESET_KEY) || "royal");
      setCustom(window.localStorage.getItem(CUSTOM_KEY));
    } catch {}
  }, []);

  useEffect(() => {
    const background =
      preset === "custom" && custom
        ? `linear-gradient(180deg, rgba(10,17,30,0.42), rgba(10,17,30,0.74)), url("${custom}") center / cover fixed no-repeat`
        : active.value;

    document.documentElement.style.setProperty("--site-background", background);
    try {
      window.localStorage.setItem(PRESET_KEY, preset);
      if (custom) window.localStorage.setItem(CUSTOM_KEY, custom);
      else window.localStorage.removeItem(CUSTOM_KEY);
    } catch {}
  }, [active.value, custom, preset]);

  const upload = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== "string") return;
      setCustom(reader.result);
      setPreset("custom");
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed right-3 bottom-3 z-50 plate p-2 flex items-center gap-2 max-w-[calc(100vw-1.5rem)]">
      <Paintbrush size={16} className="text-gold-leaf shrink-0" aria-hidden />
      <select
        value={preset}
        onChange={(event) => setPreset(event.target.value)}
        aria-label="Site background"
        className="bg-ink-900/80 border border-white/10 rounded-sm px-2 py-1 text-xs text-parchment"
      >
        {PRESETS.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
        <option value="custom" disabled={!custom}>
          Uploaded image
        </option>
      </select>
      <label className="w-8 h-8 inline-flex items-center justify-center rounded-sm btn-ghost cursor-pointer" title="Upload background">
        <ImageIcon size={15} aria-hidden />
        <input className="hidden" type="file" accept="image/*" onChange={(event) => upload(event.target.files?.[0] ?? null)} />
      </label>
      {custom && (
        <button
          type="button"
          className="w-8 h-8 inline-flex items-center justify-center rounded-sm btn-ghost"
          title="Clear uploaded background"
          onClick={() => {
            setCustom(null);
            if (preset === "custom") setPreset("royal");
          }}
        >
          <RotateCcw size={15} aria-hidden />
        </button>
      )}
    </div>
  );
}
