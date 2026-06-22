import { useEffect, useRef } from "react";
import * as THREE from "three";

/**
 * Hero scene for the "Cyber-security" service.
 * A grid of shader-driven particles rippling like a defensive mesh.
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

    // Banner card sits on the always-dark service hero surface,
    // so we hard-code a black background with silvery-white particles.
    const bgColor = new THREE.Color(0x000000);
    const particleColor = new THREE.Vector3(0.92, 0.94, 0.98);

    const particleVertex = /* glsl */ `
      attribute float scale;
      uniform float uTime;
      void main() {
        vec3 p = position;
        float s = scale;
        p.y += (sin(p.x + uTime) * 0.5) + (cos(p.y + uTime) * 0.1) * 2.0;
        p.x += (sin(p.y + uTime) * 0.5);
        s += (sin(p.x + uTime) * 0.5) + (cos(p.y + uTime) * 0.1) * 2.0;
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
      },
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    let animationId: number | null = null;
    const animate = () => {
      material.uniforms.uTime.value += 0.05;
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
