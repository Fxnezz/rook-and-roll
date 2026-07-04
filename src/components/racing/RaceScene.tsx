"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TrackMesh } from "./TrackMesh";
import { Car } from "./Car";
import { updateCar, initialCarState, type CarInput } from "@/lib/racing/carPhysics";
import { projectToTrack, isOnTrack, START_POSITION, START_TANGENT, TOTAL_LAPS } from "@/lib/racing/track";

export interface RaceCallbacks {
  onLap: (lapTimeMs: number, lap: number) => void;
  onFinish: (totalMs: number) => void;
  onProgress: (elapsedMs: number, offTrack: boolean) => void;
}

const startHeading = Math.atan2(START_TANGENT.x, START_TANGENT.z);

export function RaceScene({
  inputRef,
  running,
  callbacks,
}: {
  inputRef: React.RefObject<CarInput>;
  running: boolean;
  callbacks: React.RefObject<RaceCallbacks>;
}) {
  const carRef = useRef<THREE.Group>(null);
  const camTarget = useRef(new THREE.Vector3());
  const state = useRef(initialCarState(START_POSITION.x, START_POSITION.z, startHeading));
  const raceProgress = useRef(0); // unwrapped 0..TOTAL_LAPS track parameter
  const lastT = useRef(0);
  const lapStartMs = useRef(0);
  const raceStartMs = useRef(0);
  const finished = useRef(false);
  const lapNum = useRef(1);

  useFrame((_, dt) => {
    if (!running || finished.current) return;
    const clampedDt = Math.min(dt, 1 / 20); // avoid huge steps on tab-switch lag spikes

    const proj = projectToTrack(new THREE.Vector3(state.current.x, 0, state.current.z));
    const onTrack = isOnTrack(proj.lateral);
    state.current = updateCar(state.current, inputRef.current, clampedDt, { onTrack });

    // lap counting via unwrapped track parameter
    const proj2 = projectToTrack(new THREE.Vector3(state.current.x, 0, state.current.z));
    let delta = proj2.t - lastT.current;
    if (delta < -0.5) delta += 1;
    else if (delta > 0.5) delta -= 1;
    raceProgress.current += delta;
    lastT.current = proj2.t;

    const now = performance.now();
    if (raceStartMs.current === 0) {
      raceStartMs.current = now;
      lapStartMs.current = now;
    }
    if (Math.floor(raceProgress.current) >= lapNum.current && lapNum.current <= TOTAL_LAPS) {
      const lapTime = now - lapStartMs.current;
      callbacks.current?.onLap(lapTime, lapNum.current);
      lapStartMs.current = now;
      lapNum.current += 1;
      if (lapNum.current > TOTAL_LAPS) {
        finished.current = true;
        callbacks.current?.onFinish(now - raceStartMs.current);
      }
    }
    callbacks.current?.onProgress(now - raceStartMs.current, !onTrack);

    // apply transform to the car mesh
    if (carRef.current) {
      carRef.current.position.set(state.current.x, 0, state.current.z);
      carRef.current.rotation.y = state.current.heading;
    }
  });

  useFrame((three) => {
    if (!carRef.current) return;
    const carPos = carRef.current.position;
    const behind = new THREE.Vector3(
      carPos.x - Math.sin(state.current.heading) * 9,
      carPos.y + 4.2,
      carPos.z - Math.cos(state.current.heading) * 9,
    );
    three.camera.position.lerp(behind, 0.12);
    camTarget.current.lerp(new THREE.Vector3(carPos.x, carPos.y + 0.6, carPos.z), 0.25);
    three.camera.lookAt(camTarget.current);
  });

  return (
    <>
      <ambientLight intensity={1.1} />
      <hemisphereLight args={["#6f9fe0", "#1c2b1c", 0.9]} />
      <directionalLight position={[60, 90, 30]} intensity={1.4} castShadow />
      <TrackMesh />
      <Car ref={carRef} />
    </>
  );
}
