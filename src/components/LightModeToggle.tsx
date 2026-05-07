import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

const STORAGE_KEY = "pixcellor:light-mode";

const LightModeToggle = () => {
  const [light, setLight] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) === "1";
    setLight(stored);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (light) {
      root.classList.add("pixcellor-light");
    } else {
      root.classList.remove("pixcellor-light");
    }
    localStorage.setItem(STORAGE_KEY, light ? "1" : "0");
  }, [light]);

  return (
    <button
      type="button"
      aria-label={light ? "Switch to dark mode" : "Switch to light mode"}
      onClick={() => setLight((v) => !v)}
      className="fixed top-3 left-3 z-[100] flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/40 text-white backdrop-blur-md transition hover:bg-black/60"
    >
      {light ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
};

export default LightModeToggle;
