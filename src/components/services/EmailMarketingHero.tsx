import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Email marketing hero — GLSL "digital petals" shader.
 * Scoped to its container (not fixed to the viewport) so it slots
 * into the standard service hero frame like the other WebGL heroes.
 */
const EmailMarketingHero = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const clock = new THREE.Clock();

    const vertexShader = /* glsl */ `
      void main() { gl_Position = vec4(position, 1.0); }
    `;

    const fragmentShader = /* glsl */ `
      precision highp float;
      uniform vec2 iResolution;
      uniform float iTime;
      uniform vec2 iMouse;

      float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
      }

      void main() {
        vec2 uv    = (gl_FragCoord.xy - 0.5 * iResolution.xy) / iResolution.y;
        vec2 mouse = (iMouse - 0.5 * iResolution.xy) / iResolution.y;

        float t = iTime * 0.3;
        float r = length(uv);
        float a = atan(uv.y, uv.x);

        float mouseDist = length(uv - mouse);
        float bloom = smoothstep(0.4, 0.0, mouseDist);

        float petals = 5.0 + sin(t) * 2.0;
        float petalShape = sin(a * petals + r * 2.0);
        petalShape = pow(abs(petalShape), 0.5);

        float flow = sin(r * 10.0 - t * 2.0);
        float pattern = mix(petalShape, flow, 0.5) + bloom * 0.5;

        vec3 color1 = vec3(0.8, 0.1, 0.5);
        vec3 color2 = vec3(0.2, 0.4, 0.9);
        vec3 highlightColor = vec3(1.0);

        vec3 finalColor = mix(
          color1,
          color2,
          smoothstep(0.5, 0.8, r + random(vec2(t, t)) * 0.1)
        ) * pattern;

        finalColor += highlightColor * pow(pattern, 10.0) * (1.0 + bloom);
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    const uniforms = {
      iTime: { value: 0 },
      iResolution: { value: new THREE.Vector2(1, 1) },
      iMouse: { value: new THREE.Vector2(0, 0) },
    };

    const material = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms });
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      renderer.setSize(w, h, false);
      uniforms.iResolution.value.set(w, h);
      uniforms.iMouse.value.set(w / 2, h / 2);
    };
    onResize();
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      uniforms.iMouse.value.set(e.clientX - rect.left, rect.height - (e.clientY - rect.top));
    };
    container.addEventListener("mousemove", onMouseMove);

    renderer.setAnimationLoop(() => {
      uniforms.iTime.value = clock.getElapsedTime();
      renderer.render(scene, camera);
    });

    return () => {
      renderer.setAnimationLoop(null);
      ro.disconnect();
      container.removeEventListener("mousemove", onMouseMove);
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      material.dispose();
      geometry.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden bg-black"
      aria-label="Digital petals animated background"
    />
  );
};

export default EmailMarketingHero;
