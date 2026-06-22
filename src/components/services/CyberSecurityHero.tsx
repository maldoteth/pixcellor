import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Hero scene for the "Cyber-security" service.
 * A grid of shader-driven particles rippling like a defensive mesh,
 * with a strong cursor-driven shockwave on top of the ambient motion.
 * Container-scoped (not window-bound) so it sits inside the banner card
 * the same way every other service hero does.
 */
export default function CyberSecurityHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const bgColor = new THREE.Color(0x000000);
    const particleColor = new THREE.Vector3(0.92, 0.94, 0.98);

    const particleVertex = /* glsl */ `
      attribute float scale;
      uniform float uTime;
      uniform vec2 uMouse;      // world-space xz position of cursor on ground plane
      uniform float uMouseStrength; // 0..1 fade in/out when entering/leaving
      void main() {
        vec3 p = position;
        float s = scale;

        // Ambient ripple
        p.y += (sin(p.x + uTime) * 0.5) + (cos(p.z + uTime) * 0.1) * 2.0;
        p.x += (sin(p.z + uTime) * 0.5);
        s += (sin(p.x + uTime) * 0.5) + (cos(p.z + uTime) * 0.1) * 2.0;

        // Cursor-driven shockwave on the xz plane
        vec2 toMouse = p.xz - uMouse;
        float dist = length(toMouse);
        float falloff = exp(-dist * 0.18);                  // radius of influence
        float wave = sin(dist * 1.2 - uTime * 3.0);         // travelling ripple
        p.y += wave * falloff * 3.5 * uMouseStrength;       // big vertical bump
        s += falloff * 4.0 * uMouseStrength;                // make nearby points pop

        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = s * 15.0 * (1.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const particleFragment = /* glsl */ `
      uniform vec3 uColor;
      void main() {
        gl_FragColor = vec4(uColor, 0.5);
      }
    `;

    const width = container.clientWidth || 1;
    const height = container.clientHeight || 1;

    const camera = new THREE.PerspectiveCamera(75, width / height, 0.01, 1000);
    camera.position.set(0, 6, 5);

    const scene = new THREE.Scene();

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    renderer.setClearColor(bgColor);

    const gap = 0.3;
    const amountX = 200;
    const amountY = 200;
    const particleNum = amountX * amountY;
    const positions = new Float32Array(particleNum * 3);
    const scales = new Float32Array(particleNum);

    let i = 0;
    let j = 0;
    for (let ix = 0; ix < amountX; ix++) {
      for (let iy = 0; iy < amountY; iy++) {
        positions[i] = ix * gap - (amountX * gap) / 2;
        positions[i + 1] = 0;
        positions[i + 2] = iy * gap - (amountX * gap) / 2;
        scales[j] = 1;
        i += 3;
        j++;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("scale", new THREE.BufferAttribute(scales, 1));

    const material = new THREE.ShaderMaterial({
      transparent: true,
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: particleColor },
        uMouse: { value: new THREE.Vector2(0, 0) },
        uMouseStrength: { value: 0 },
      },
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    // Cursor raycasting onto y=0 plane to get world-space xz
    const ndc = new THREE.Vector2(0, 0);
    const raycaster = new THREE.Raycaster();
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const target = new THREE.Vector3();
    const mouseTarget = new THREE.Vector2(0, 0);
    const mouseCurrent = new THREE.Vector2(0, 0);
    let strengthTarget = 0;

    const updateMouseFromEvent = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(ndc, camera);
      if (raycaster.ray.intersectPlane(groundPlane, target)) {
        mouseTarget.set(target.x, target.z);
      }
      strengthTarget = 1;
    };

    const onLeave = () => {
      strengthTarget = 0;
    };

    container.addEventListener("pointermove", updateMouseFromEvent);
    container.addEventListener("pointerenter", updateMouseFromEvent);
    container.addEventListener("pointerleave", onLeave);

    let animationId: number | null = null;
    const animate = () => {
      material.uniforms.uTime.value += 0.05;

      // Smooth follow so the wave eases into place instead of snapping
      mouseCurrent.lerp(mouseTarget, 0.15);
      material.uniforms.uMouse.value.copy(mouseCurrent);
      const s = material.uniforms.uMouseStrength.value as number;
      material.uniforms.uMouseStrength.value = s + (strengthTarget - s) * 0.08;

      camera.lookAt(scene.position);
      renderer.render(scene, camera);
      animationId = requestAnimationFrame(animate);
    };
    animate();

    const ro = new ResizeObserver(() => {
      const w = container.clientWidth || 1;
      const h = container.clientHeight || 1;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    });
    ro.observe(container);

    return () => {
      if (animationId !== null) cancelAnimationFrame(animationId);
      ro.disconnect();
      container.removeEventListener("pointermove", updateMouseFromEvent);
      container.removeEventListener("pointerenter", updateMouseFromEvent);
      container.removeEventListener("pointerleave", onLeave);
      scene.remove(particles);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-black">
      <canvas ref={canvasRef} className="block h-full w-full" />
    </div>
  );
}
