import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Sliders, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

const VERTEX = `
  void main() { gl_Position = vec4(position, 1.0); }
`;

const FRAGMENT = `
  precision mediump float;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform float u_waveCount;
  uniform float u_amplitude;
  uniform float u_frequency;
  uniform float u_brightness;
  uniform float u_colorSeparation;
  float pattern(vec2 uv) {
    float intensity = 0.0;
    for (float i = 0.0; i < 20.0; i++) {
      if (i >= u_waveCount) break;
      uv.x += sin(u_time * (1.0 + i) + uv.y * u_frequency) * u_amplitude;
      intensity += u_brightness / abs(uv.x);
    }
    return intensity;
  }
  vec3 scene(vec2 uv) {
    vec3 color = vec3(0.0);
    vec2 ruv = vec2(uv.y, uv.x);
    for (float i = 0.0; i < 20.0; i++) {
      if (i >= u_waveCount) break;
      int channel = int(mod(i, 3.0));
      vec2 cuv = ruv + vec2(0.0, i * u_colorSeparation);
      color[channel] += pattern(cuv);
    }
    return color;
  }
  void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution)
              / min(u_resolution.x, u_resolution.y);
    vec3 col = scene(uv);
    gl_FragColor = vec4(col, 1.0);
  }
`;

interface Props {
  waveCount?: number;
  amplitude?: number;
  frequency?: number;
  brightness?: number;
  colorSeparation?: number;
}

/**
 * Documents & Decks hero — Electric Waves GLSL shader with live controls.
 * Slider panel mirrors the Product Management hero (desktop dock + mobile drawer).
 */
export default function DocumentsDecksHero({
  waveCount: initialWaveCount = 5,
  amplitude: initialAmplitude = 0.1,
  frequency: initialFrequency = 2,
  brightness: initialBrightness = 0.005,
  colorSeparation: initialColorSeparation = 0.1,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTop, setSheetTop] = useState(0);

  const [waveCount, setWaveCount] = useState(initialWaveCount);
  const [amplitude, setAmplitude] = useState(initialAmplitude);
  const [frequency, setFrequency] = useState(initialFrequency);
  const [brightness, setBrightness] = useState(initialBrightness);
  const [colorSeparation, setColorSeparation] = useState(initialColorSeparation);

  // Dock the mobile sheet directly under the banner.
  useEffect(() => {
    if (!sheetOpen) return;
    const update = () => {
      const el = containerRef.current;
      if (!el) return;
      setSheetTop(el.getBoundingClientRect().bottom);
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [sheetOpen]);

  // Push slider state into shader uniforms live.
  useEffect(() => {
    const m = materialRef.current;
    if (!m) return;
    m.uniforms.u_waveCount.value = waveCount;
    m.uniforms.u_amplitude.value = amplitude;
    m.uniforms.u_frequency.value = frequency;
    m.uniforms.u_brightness.value = brightness;
    m.uniforms.u_colorSeparation.value = colorSeparation;
  }, [waveCount, amplitude, frequency, brightness, colorSeparation]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      container.appendChild(renderer.domElement);
      renderer.domElement.style.display = "block";
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
    } catch (err) {
      console.error("WebGL not supported", err);
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const clock = new THREE.Clock();

    const uniforms = {
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector2() },
      u_waveCount: { value: waveCount },
      u_amplitude: { value: amplitude },
      u_frequency: { value: frequency },
      u_brightness: { value: brightness },
      u_colorSeparation: { value: colorSeparation },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
    });
    materialRef.current = material;

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const onResize = () => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      renderer.setSize(w, h, false);
      uniforms.u_resolution.value.set(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);
    onResize();

    renderer.setAnimationLoop(() => {
      uniforms.u_time.value = clock.getElapsedTime();
      renderer.render(scene, camera);
    });

    return () => {
      ro.disconnect();
      renderer.setAnimationLoop(null);
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      materialRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sliders: {
    name: string;
    value: number;
    min: number;
    max: number;
    step: number;
    fixed: number;
    set: (v: number) => void;
  }[] = [
    { name: "Wave Count", value: waveCount, min: 1, max: 20, step: 1, fixed: 0, set: setWaveCount },
    { name: "Amplitude", value: amplitude, min: 0.01, max: 0.5, step: 0.01, fixed: 2, set: setAmplitude },
    { name: "Frequency", value: frequency, min: 0.5, max: 10, step: 0.1, fixed: 1, set: setFrequency },
    { name: "Brightness", value: brightness, min: 0.00001, max: 0.01, step: 0.00001, fixed: 5, set: setBrightness },
    { name: "Color Sep.", value: colorSeparation, min: 0, max: 0.5, step: 0.01, fixed: 2, set: setColorSeparation },
  ];

  const sliderRows = (size: "sm" | "md" = "sm") => (
    <>
      {sliders.map((s) => (
        <div key={s.name} className={size === "sm" ? "mb-1 last:mb-0" : "mb-3 last:mb-0"}>
          <div
            className={`flex items-center justify-between leading-tight text-white/70 ${
              size === "sm" ? "text-[9px]" : "text-xs"
            }`}
          >
            <span>{s.name}</span>
            <span className="tabular-nums text-white/90">{s.value.toFixed(s.fixed)}</span>
          </div>
          <input
            type="range"
            min={s.min}
            max={s.max}
            step={s.step}
            value={s.value}
            onChange={(e) => s.set(parseFloat(e.target.value))}
            className={`w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-white ${
              size === "sm" ? "h-0.5" : "h-1.5 mt-1"
            }`}
          />
        </div>
      ))}
    </>
  );

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-black">
      {isMobile ? (
        <>
          <button
            type="button"
            onClick={() => setSheetOpen((o) => !o)}
            aria-label={sheetOpen ? "Close shader controls" : "Open shader controls"}
            className="absolute bottom-2 left-2 z-20 flex h-9 w-9 items-center justify-center rounded-md border border-white/15 bg-black/55 text-white/85 shadow-xl backdrop-blur-xl active:bg-black/70"
          >
            {sheetOpen ? <X className="h-4 w-4" /> : <Sliders className="h-4 w-4" />}
          </button>

          {sheetOpen && (
            <div
              className="fixed left-0 right-0 z-[60] rounded-t-2xl border-t border-white/10 bg-black/85 px-4 pb-6 pt-3 text-white shadow-2xl backdrop-blur-2xl animate-in slide-in-from-bottom duration-200"
              style={{
                top: sheetTop,
                maxHeight: `calc(100vh - ${sheetTop}px)`,
                overflowY: "auto",
              }}
            >
              <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-white/25" />
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-widest text-white/70">
                  Electric Waves
                </div>
                <button
                  type="button"
                  onClick={() => setSheetOpen(false)}
                  aria-label="Close"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-white/70 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {sliderRows("md")}
            </div>
          )}
        </>
      ) : (
        <div className="absolute bottom-2 left-2 z-10 w-44 rounded-md border border-white/10 bg-black/55 p-2 text-white shadow-xl backdrop-blur-xl">
          <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-white/60">
            Electric Waves
          </div>
          {sliderRows("sm")}
        </div>
      )}
    </div>
  );
}
