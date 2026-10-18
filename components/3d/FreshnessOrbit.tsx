"use client";

import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Sparkles as R3FSparkles } from "@react-three/drei";
import * as THREE from "three";
import { OrbitFallback } from "./OrbitFallback";

// Stylized Realistic 3D Half-Avocado (Pear silhouette, creamy flesh, dark brown pit)
function AvocadoMesh({ position, rotation = [0, 0, 0] }: { position: [number, number, number]; rotation?: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.25;
  });

  return (
    <Float speed={2} rotationIntensity={0.8} floatIntensity={1.2}>
      <group ref={groupRef} position={position} rotation={rotation} scale={0.78}>
        {/* Dark Textured Rind / Skin */}
        <mesh position={[0, -0.05, -0.08]} scale={[0.88, 1.15, 0.8]}>
          <sphereGeometry args={[0.55, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshStandardMaterial color="#1A2D16" roughness={0.8} />
        </mesh>
        {/* Pear-shaped cut face: Creamy Pale Lime Flesh */}
        <mesh position={[0, -0.05, 0]} scale={[0.86, 1.12, 1]}>
          <cylinderGeometry args={[0.52, 0.52, 0.08, 32]} />
          <meshStandardMaterial color="#D6E89B" roughness={0.35} />
        </mesh>
        {/* Glossy Brown Round Seed / Pit */}
        <mesh position={[0, -0.15, 0.12]}>
          <sphereGeometry args={[0.22, 28, 28]} />
          <meshStandardMaterial color="#543016" roughness={0.25} metalness={0.15} />
        </mesh>
      </group>
    </Float>
  );
}

// Stylized Glossy Red Vine Tomato (Plump body, 5-point star calyx & curved stem)
function TomatoMesh({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.35;
      groupRef.current.rotation.x += delta * 0.15;
    }
  });

  return (
    <Float speed={2.2} rotationIntensity={0.9} floatIntensity={1.3}>
      <group ref={groupRef} position={position} scale={0.8}>
        {/* Glossy Red Body */}
        <mesh scale={[1, 0.92, 1]}>
          <sphereGeometry args={[0.52, 32, 32]} />
          <meshStandardMaterial color="#E0281A" roughness={0.18} metalness={0.08} />
        </mesh>
        {/* Calyx Star (5 green leaflets) */}
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh
            key={i}
            position={[0, 0.46, 0]}
            rotation={[0.25, (i * (Math.PI * 2)) / 5, 0.3]}
          >
            <coneGeometry args={[0.07, 0.22, 4]} />
            <meshStandardMaterial color="#2B6833" roughness={0.5} />
          </mesh>
        ))}
        {/* Curved stem */}
        <mesh position={[0, 0.58, 0]} rotation={[0.1, 0, 0.15]}>
          <cylinderGeometry args={[0.035, 0.04, 0.16, 12]} />
          <meshStandardMaterial color="#24572B" roughness={0.6} />
        </mesh>
      </group>
    </Float>
  );
}

// Stylized Citrus Lemon (Tapered pointed ends on both sides)
function LemonMesh({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.z += delta * 0.3;
  });

  return (
    <Float speed={1.8} rotationIntensity={0.6} floatIntensity={1.1}>
      <group ref={groupRef} position={position} rotation={[0.4, 0.2, -0.5]} scale={0.72}>
        {/* Central elongated body */}
        <mesh scale={[0.56, 0.85, 0.56]}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial color="#F7D02C" roughness={0.3} metalness={0.05} />
        </mesh>
        {/* Top tip */}
        <mesh position={[0, 0.44, 0]}>
          <coneGeometry args={[0.1, 0.14, 16]} />
          <meshStandardMaterial color="#F0C724" roughness={0.35} />
        </mesh>
        {/* Bottom tip */}
        <mesh position={[0, -0.44, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.1, 0.14, 16]} />
          <meshStandardMaterial color="#EABF20" roughness={0.35} />
        </mesh>
      </group>
    </Float>
  );
}

// Stylized Red Onion (Burgundy-purple bulb with papery neck)
function RedOnionMesh({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.28;
  });

  return (
    <Float speed={2.4} rotationIntensity={0.7} floatIntensity={1.3}>
      <group ref={groupRef} position={position} scale={0.78}>
        {/* Slightly flattened sphere bulb */}
        <mesh scale={[1, 0.84, 1]}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial color="#7F1D4B" roughness={0.28} metalness={0.12} />
        </mesh>
        {/* Tapered upper neck */}
        <mesh position={[0, 0.44, 0]}>
          <coneGeometry args={[0.16, 0.26, 20]} />
          <meshStandardMaterial color="#5E1436" roughness={0.4} />
        </mesh>
        {/* Root tuft */}
        <mesh position={[0, -0.42, 0]}>
          <cylinderGeometry args={[0.07, 0.02, 0.08, 12]} />
          <meshStandardMaterial color="#CBB9A8" roughness={0.8} />
        </mesh>
      </group>
    </Float>
  );
}

// Stylized Broccoli (Pale green stalk with lush clustered crown)
function BroccoliMesh({ position }: { position: [number, number, number] }) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y -= delta * 0.22;
  });

  return (
    <Float speed={1.6} rotationIntensity={0.5} floatIntensity={1}>
      <group ref={groupRef} position={position} scale={0.72}>
        {/* Thick pale green stalk */}
        <mesh position={[0, -0.28, 0]}>
          <cylinderGeometry args={[0.16, 0.22, 0.5, 16]} />
          <meshStandardMaterial color="#7CB342" roughness={0.65} />
        </mesh>
        {/* Clustered crown florets */}
        <mesh position={[0, 0.1, 0]} scale={[1, 0.85, 1]}>
          <dodecahedronGeometry args={[0.45, 1]} />
          <meshStandardMaterial color="#2E6319" roughness={0.85} />
        </mesh>
        <mesh position={[-0.2, 0.2, 0.1]} scale={0.7}>
          <dodecahedronGeometry args={[0.35, 1]} />
          <meshStandardMaterial color="#35731D" roughness={0.85} />
        </mesh>
        <mesh position={[0.22, 0.16, -0.1]} scale={0.7}>
          <dodecahedronGeometry args={[0.35, 1]} />
          <meshStandardMaterial color="#275615" roughness={0.85} />
        </mesh>
      </group>
    </Float>
  );
}

// Glass Orbital Rings & Translucent Bubble Enclosure
function GlassOrbitalEnclosure() {
  const ringRef1 = useRef<THREE.Group>(null);
  const ringRef2 = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (ringRef1.current) ringRef1.current.rotation.z += delta * 0.1;
    if (ringRef2.current) ringRef2.current.rotation.z -= delta * 0.07;
  });

  return (
    <>
      {/* Translucent Soft Glass Enclosure Sphere */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[1.9, 48, 48]} />
        <meshStandardMaterial
          color="#EAF5DC"
          transparent
          opacity={0.16}
          roughness={0.06}
          metalness={0.12}
        />
      </mesh>

      {/* Primary Slanted Forest Ring */}
      <group ref={ringRef1} rotation={[Math.PI / 4, 0, 0]}>
        <mesh>
          <torusGeometry args={[2.35, 0.02, 16, 120]} />
          <meshBasicMaterial color="#163C29" transparent opacity={0.3} />
        </mesh>
      </group>

      {/* Secondary Soft Lime Ring */}
      <group ref={ringRef2} rotation={[-Math.PI / 5, Math.PI / 3, 0]}>
        <mesh>
          <torusGeometry args={[2.0, 0.016, 16, 120]} />
          <meshBasicMaterial color="#C8E27A" transparent opacity={0.5} />
        </mesh>
      </group>
    </>
  );
}

function Scene({ mouse }: { mouse: { x: number; y: number } }) {
  const rootRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (rootRef.current) {
      // Gentle mouse parallax
      rootRef.current.rotation.y = THREE.MathUtils.lerp(rootRef.current.rotation.y, mouse.x * 0.35, 0.05);
      rootRef.current.rotation.x = THREE.MathUtils.lerp(rootRef.current.rotation.x, -mouse.y * 0.25, 0.05);
    }
  });

  return (
    <group ref={rootRef}>
      <ambientLight intensity={1.2} />
      <directionalLight position={[6, 8, 6]} intensity={1.7} castShadow />
      <pointLight position={[-4, -3, -2]} intensity={0.9} color="#C8E27A" />
      <pointLight position={[3, -2, 3]} intensity={0.8} color="#FFFFFF" />

      {/* Glass Enclosure */}
      <GlassOrbitalEnclosure />

      {/* Stylized recognizable produce positioned as in reference */}
      <AvocadoMesh position={[0.4, 0.82, 0.1]} rotation={[0.2, -0.4, 0.2]} />
      <TomatoMesh position={[-0.65, 0.15, 0.55]} />
      <RedOnionMesh position={[-0.12, -0.68, 0.35]} />
      <LemonMesh position={[0.72, -0.52, 0.45]} />
      <BroccoliMesh position={[0.72, 0.14, -0.4]} />

      {/* Ambient subtle floating particles */}
      <R3FSparkles count={40} scale={4.6} size={2.4} speed={0.35} opacity={0.6} color="#C8E27A" />
    </group>
  );
}

export function FreshnessOrbit() {
  const [mounted, setMounted] = useState(false);
  const [hasWebGLError, setHasWebGLError] = useState(false);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
    setMouse({ x, y });
  };

  if (!mounted || hasWebGLError) {
    return <OrbitFallback />;
  }

  return (
    <div
      onMouseMove={handleMouseMove}
      className="relative w-full h-[440px] sm:h-[500px] lg:h-[580px] flex items-center justify-center cursor-grab active:cursor-grabbing"
    >
      <Canvas
        camera={{ position: [0, 0, 4.8], fov: 46 }}
        gl={{ antialias: true, alpha: true }}
        onError={() => setHasWebGLError(true)}
      >
        <Scene mouse={mouse} />
      </Canvas>
    </div>
  );
}
