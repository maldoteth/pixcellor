import { useEffect, useRef, useState } from "react";

interface ProductManagementHeroProps {
  hue?: number;
  speed?: number;
  noise?: number;
  warp?: number;
  zoom?: number;
  brightness?: number;
}

const VERT = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform float iTime;
uniform vec2 iResolution;
uniform vec2 iMouse;
uniform float uHue;
uniform float uNoise;
uniform float uWarp;
uniform float uZoom;
uniform float uBrightness;

vec3 hsv2rgb(vec3 c) {
  vec3 rgb = clamp(abs(mod(c.x * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return c.z * mix(vec3(1.0), rgb, c.y);
}
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
  m = m*m; m = m*m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - iResolution.xy) / min(iResolution.x, iResolution.y);
  uv *= uZoom;
  vec2 mouseUv = (iMouse * 2.0 - 1.0);
  mouseUv.y *= -1.0;
  uv += mouseUv * uWarp;
  float time = iTime * 0.5;
  float noise_pattern = snoise(uv * 1.5 + vec2(time * 0.3, -time * 0.2)) * 0.5;
  noise_pattern += snoise(uv * 3.0 + vec2(-time * 0.2, time * 0.3)) * 0.25;
  noise_pattern = (noise_pattern + 1.0) * 0.5;
  float bands = sin(noise_pattern * 15.0 - time * 2.0);
  bands = smoothstep(0.4, 0.6, bands);
  float detail = snoise(uv * 10.0 + time) * 0.5 + 0.5;
  bands = mix(bands, bands + detail, uNoise);
  vec3 baseColor = hsv2rgb(vec3(uHue / 360.0, 0.7, 1.0));
  vec3 color = baseColor * bands * uBrightness;
  gl_FragColor = vec4(color, 1.0);
}
`;

/**
 * Hero scene for the "Product & project management" service.
 * A liquid-crystal WebGL shader that warps based on the cursor's
 * position anywhere on the page. Container-scoped to the banner card.
 */
export default function ProductManagementHero({
  hue: initialHue = 200,
  speed: initialSpeed = 1,
  noise: initialNoise = 0.4,
  warp: initialWarp = 0.18,
  zoom: initialZoom = 1.6,
  brightness: initialBrightness = 1,
}: ProductManagementHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0.5, y: 0.5 });

  const [hue, setHue] = useState(initialHue);
  const [speed, setSpeed] = useState(initialSpeed);
  const [noise, setNoise] = useState(initialNoise);
  const [warp, setWarp] = useState(initialWarp);
  const [zoom, setZoom] = useState(initialZoom);
  const [brightness, setBrightness] = useState(initialBrightness);
  const [panelOpen, setPanelOpen] = useState(false);

  // Uniforms are read from refs inside the animation loop so slider changes
  // apply instantly without reinitialising the WebGL program.
  const paramsRef = useRef({ hue, speed, noise, warp, zoom, brightness });
  paramsRef.current = { hue, speed, noise, warp, zoom, brightness };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const gl = canvas.getContext("webgl", { antialias: true });
    if (!gl) return;

    const compile = (src: string, type: number) => {
      const sh = gl.createShader(type)!;
      gl.shaderSource(sh, src);
      gl.compileShader(sh);
      if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(sh));
        gl.deleteShader(sh);
        return null;
      }
      return sh;
    };

    const vs = compile(VERT, gl.VERTEX_SHADER);
    const fs = compile(FRAG, gl.FRAGMENT_SHADER);
    if (!vs || !fs) return;

    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return;
    }
    gl.useProgram(program);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );
    const posLoc = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const u = {
      iTime: gl.getUniformLocation(program, "iTime"),
      iResolution: gl.getUniformLocation(program, "iResolution"),
      iMouse: gl.getUniformLocation(program, "iMouse"),
      uHue: gl.getUniformLocation(program, "uHue"),
      uNoise: gl.getUniformLocation(program, "uNoise"),
      uWarp: gl.getUniformLocation(program, "uWarp"),
      uZoom: gl.getUniformLocation(program, "uZoom"),
      uBrightness: gl.getUniformLocation(program, "uBrightness"),
    };

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u.iResolution, canvas.width, canvas.height);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    const onMove = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: (clientX - rect.left) / rect.width,
        y: 1 - (clientY - rect.top) / rect.height,
      };
    };
    const onMouse = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const onTouch = (e: TouchEvent) => {
      if (e.touches.length) onMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    window.addEventListener("mousemove", onMouse);
    window.addEventListener("touchmove", onTouch, { passive: true });

    const start = performance.now();
    let raf = 0;
    const animate = () => {
      const p = paramsRef.current;
      const t = ((performance.now() - start) / 1000) * p.speed;
      gl.uniform1f(u.iTime, t);
      gl.uniform2f(u.iMouse, mouseRef.current.x, mouseRef.current.y);
      gl.uniform1f(u.uHue, p.hue);
      gl.uniform1f(u.uNoise, p.noise);
      gl.uniform1f(u.uWarp, p.warp);
      gl.uniform1f(u.uZoom, p.zoom);
      gl.uniform1f(u.uBrightness, p.brightness);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("touchmove", onTouch);
      if (!gl.isContextLost()) {
        gl.deleteProgram(program);
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        gl.deleteBuffer(buf);
      }
    };
  }, []);

  const sliders: {
    name: string;
    value: number;
    min: number;
    max: number;
    step: number;
    set: (v: number) => void;
  }[] = [
    { name: "Hue", value: hue, min: 0, max: 360, step: 1, set: setHue },
    { name: "Speed", value: speed, min: 0, max: 2, step: 0.01, set: setSpeed },
    { name: "Noise", value: noise, min: 0, max: 1, step: 0.01, set: setNoise },
    { name: "Warp", value: warp, min: 0, max: 0.5, step: 0.01, set: setWarp },
    { name: "Zoom", value: zoom, min: 0.5, max: 5, step: 0.01, set: setZoom },
    { name: "Brightness", value: brightness, min: 0.1, max: 2, step: 0.01, set: setBrightness },
  ];

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-black">
      <canvas ref={canvasRef} className="block h-full w-full" />

      <div className="absolute right-2 top-2 z-10 w-44 rounded-md border border-white/10 bg-black/55 p-2 text-white shadow-xl backdrop-blur-xl">
        <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-widest text-white/60">
          Liquid Crystal
        </div>
        {sliders.map((s) => (
          <div key={s.name} className="mb-1 last:mb-0">
            <div className="flex items-center justify-between text-[9px] leading-tight text-white/70">
              <span>{s.name}</span>
              <span className="tabular-nums text-white/90">
                {s.step < 1 ? s.value.toFixed(2) : s.value.toFixed(0)}
              </span>
            </div>
            <input
              type="range"
              min={s.min}
              max={s.max}
              step={s.step}
              value={s.value}
              onChange={(e) => s.set(parseFloat(e.target.value))}
              className="h-0.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-white"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

