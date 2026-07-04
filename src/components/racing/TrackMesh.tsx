"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { Track } from "@/lib/racing/track";

function checkerTexture(): THREE.CanvasTexture {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const n = 8;
  const cell = size / n;
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? "#f2f2f2" : "#151515";
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  return tex;
}

/** Builds the road surface as a triangle strip between the track's left/right edges. */
export function TrackMesh({ track }: { track: Track }) {
  const { road, stripes, edges } = useMemo(() => {
    const { left, right, center } = track.trackOutline();
    const positions: number[] = [];
    const uvs: number[] = [];
    for (let i = 0; i < left.length - 1; i++) {
      const l0 = left[i];
      const r0 = right[i];
      const l1 = left[i + 1];
      const r1 = right[i + 1];
      // two triangles per segment
      positions.push(l0.x, 0, l0.z, r0.x, 0, r0.z, l1.x, 0, l1.z);
      positions.push(r0.x, 0, r0.z, r1.x, 0, r1.z, l1.x, 0, l1.z);
      const v0 = i / left.length;
      const v1 = (i + 1) / left.length;
      uvs.push(0, v0, 1, v0, 0, v1, 1, v0, 1, v1, 0, v1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.computeVertexNormals();

    // dashed centerline stripes: short segments alternating on/off along center
    const stripePositions: number[] = [];
    for (let i = 0; i < center.length - 1; i += 6) {
      const a = center[i];
      const b = center[Math.min(i + 3, center.length - 1)];
      stripePositions.push(a.x, 0.02, a.z, b.x, 0.02, b.z);
    }
    const stripeGeo = new THREE.BufferGeometry();
    stripeGeo.setAttribute("position", new THREE.Float32BufferAttribute(stripePositions, 3));

    // edge lines (left/right boundary)
    const edgePositions: number[] = [];
    for (let i = 0; i < left.length; i++) edgePositions.push(left[i].x, 0.02, left[i].z);
    for (let i = 0; i < right.length; i++) edgePositions.push(right[i].x, 0.02, right[i].z);
    const edgeGeo = new THREE.BufferGeometry();
    edgeGeo.setAttribute("position", new THREE.Float32BufferAttribute(edgePositions, 3));

    return { road: geo, stripes: stripeGeo, edges: edgeGeo };
  }, [track]);

  const checker = useMemo(() => checkerTexture(), []);
  const startAngle = Math.atan2(track.startTangent.x, track.startTangent.z);

  return (
    <group>
      <mesh geometry={road} receiveShadow>
        <meshStandardMaterial color="#4a4e58" roughness={0.85} />
      </mesh>
      <lineSegments geometry={stripes}>
        <lineBasicMaterial color="#e9c73f" />
      </lineSegments>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#e8ecf3" />
      </lineSegments>
      {/* checkered start/finish line */}
      <mesh
        position={[track.startPosition.x, 0.03, track.startPosition.z]}
        rotation={[-Math.PI / 2, 0, -startAngle]}
        receiveShadow
      >
        <planeGeometry args={[track.width, 2.5]} />
        <meshStandardMaterial map={checker} roughness={0.7} />
      </mesh>
      {/* ground plane beyond the track */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color="#2f4a2f" roughness={1} />
      </mesh>
    </group>
  );
}
