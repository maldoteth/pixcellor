/*
  Wave WebGL component using @react-three/fiber + drei.
  Transparent background, centered plane, pointer-reactive shader.
*/
import type React from "react";
import { useRef, useState, Suspense } from "react";
import * as THREE from "three";
import { Canvas, extend, useFrame } from "@react-three/fiber";
import { shaderMaterial, OrthographicCamera } from "@react-three/drei";

const WaveMaterial = shaderMaterial(
  {
    time: 0,
    resolution: new THREE.Vector2(1, 1),
    pointer: new THREE.Vector2(0, 0),
    tiles: 1.5,
  },
  /* glsl */ `
    varying vec2 vUv;
    void main() {
      vec4 modelPosition = modelMatrix * vec4(position, 1.0);
      vec4 viewPosition = viewMatrix * modelPosition;
      vec4 projectionPosition = projectionMatrix * viewPosition;
      gl_Position = projectionPosition;
      vUv = uv;
    }
  `,
  /* glsl */ `
    uniform float time;
    uniform vec2 resolution;
    uniform vec2 pointer;
    uniform float tiles;
    varying vec2 vUv;

    vec3 palette(float t) {
      vec3 a = vec3(0.5, 0.5, 0.5);
      vec3 b = vec3(0.5, 0.5, 0.5);
      vec3 c = vec3(1.0, 1.0, 1.0);
      vec3 d = vec3(0.263, 0.416, 0.557);
      return a + b * cos(6.28318 * (c * t + d));
    }

    void main() {
      vec2 uv = vUv * 2.0 - 1.0;
      vec2 uv0 = uv;
      vec3 finalColor = vec3(0.0);

      uv = uv * tiles - pointer;

      float d = length(uv) * exp(-length(uv0));
      vec3 col = palette(length(uv0) + time * 0.4);
      d = sin(d * 8.0 + time) / 8.0;
      d = abs(d);
      d = pow(0.02 / d, 2.0);
      finalColor += col * d;

      float alpha = clamp(length(finalColor), 0.0, 1.0);
      gl_FragColor = vec4(finalColor, alpha);
    }
  `,
);

extend({ WaveMaterial });

export type WaveProps = {
  width?: number;
  height?: number;
  speed?: number;
  tiles?: number;
  pointer?: { x: number; y: number };
  disablePointerTracking?: boolean;
  dpr?: number | [number, number];
  onPointerMove?: (e: React.PointerEvent<HTMLDivElement>) => void;
  className?: string;
  style?: React.CSSProperties;
};

function WaveQuad({
  speed = 1,
  tiles = 1.5,
  width = 1200,
  height = 1000,
  pointerOverride,
  trackPointer = true,
}: {
  speed?: number;
  tiles?: number;
  width?: number;
  height?: number;
  pointerOverride?: { x: number; y: number };
  trackPointer?: boolean;
}) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  useFrame((state, delta) => {
    if (!matRef.current) return;
    matRef.current.uniforms.time.value += delta * speed;
    matRef.current.uniforms.resolution.value.set(state.size.width, state.size.height);
    if (pointerOverride) {
      matRef.current.uniforms.pointer.value.set(pointerOverride.x, pointerOverride.y);
    } else if (trackPointer) {
      matRef.current.uniforms.pointer.value.set(state.pointer.x, state.pointer.y);
    }
    matRef.current.uniforms.tiles.value = tiles;
  });

  return (
    <group>
      <OrthographicCamera makeDefault position={[0, 0, 10]} />
      <mesh position={[0, 0, 0]}>
        <planeGeometry args={[width, height]} />
        {/* @ts-expect-error - intrinsic added via extend */}
        <waveMaterial ref={matRef} transparent />
      </mesh>
    </group>
  );
}

export function Wave({
  width = 1200,
  height = 1000,
  speed = 1,
  tiles = 1.5,
  pointer: pointerOverride,
  disablePointerTracking = false,
  dpr = [1, 2],
  onPointerMove,
  className,
  style,
}: WaveProps) {
  const [localPointer, setLocalPointer] = useState<{ x: number; y: number } | null>(null);
  const effectivePointer = pointerOverride ?? localPointer ?? undefined;

  return (
    <div
      className={className}
      style={{ width: "100%", height: "100%", ...style }}
      onPointerMove={(e) => {
        if (!disablePointerTracking && !pointerOverride) {
          const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
          const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
          const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
          setLocalPointer({ x: nx, y: ny });
        }
        onPointerMove?.(e);
      }}
    >
      <Canvas dpr={dpr} gl={{ alpha: true, antialias: true }} style={{ background: "transparent" }}>
        <Suspense fallback={null}>
          <WaveQuad
            speed={speed}
            tiles={tiles}
            width={width}
            height={height}
            pointerOverride={effectivePointer}
            trackPointer={!disablePointerTracking}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default Wave;
