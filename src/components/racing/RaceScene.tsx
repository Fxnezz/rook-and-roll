"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { TrackMesh } from "./TrackMesh";
import { TrackScenery } from "./TrackScenery";
import { Car } from "./Car";
import { updateCar, initialCarState, carSpeed, type CarInput, type CarStats } from "@/lib/racing/carPhysics";
import type { Track } from "@/lib/racing/track";
import type { CarType } from "@/lib/racing/cars";

export interface RaceCallbacks {
  onLap: (lapTimeMs: number, lap: number) => void;
  onFinish: (totalMs: number) => void;
  onProgress: (info: { elapsedMs: number; offTrack: boolean; x: number; z: number; heading: number; speed: number; driftFactor: number }) => void;
}

export function RaceScene({
  track,
  car,
  stats,
  inputRef,
  running,
  callbacks,
}: {
  track: Track;
  car: CarType;
  stats: CarStats;
  inputRef: React.RefObject<CarInput>;
  running: boolean;
  callbacks: React.RefObject<RaceCallbacks>;
}) {
  const carRef = useRef<THREE.Group>(null);
  const carTiltRef = useRef(0);
  const camTarget = useRef(new THREE.Vector3());
  const startHeading = Math.atan2(track.startTangent.x, track.startTangent.z);
  const state = useRef(initialCarState(track.startPosition.x, track.startPosition.z, startHeading));
  const raceProgress = useRef(0); // unwrapped 0..laps track parameter
  const lastT = useRef(0);
  const lapStartMs = useRef(0);
  const raceStartMs = useRef(0);
  const finished = useRef(false);
  const lapNum = useRef(1);

  useFrame((_, dt) => {
    if (!running || finished.current) return;
    const clampedDt = Math.min(dt, 1 / 20); // avoid huge steps on tab-switch lag spikes

    const proj = track.projectToTrack(new THREE.Vector3(state.current.x, 0, state.current.z));
    const onTrack = track.isOnTrack(proj.lateral);
    state.current = updateCar(state.current, inputRef.current, clampedDt, { onTrack, stats });

    // lap counting via unwrapped track parameter
    const proj2 = track.projectToTrack(new THREE.Vector3(state.current.x, 0, state.current.z));
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
    if (Math.floor(raceProgress.current) >= lapNum.current && lapNum.current <= track.laps) {
      const lapTime = now - lapStartMs.current;
      callbacks.current?.onLap(lapTime, lapNum.current);
      lapStartMs.current = now;
      lapNum.current += 1;
      if (lapNum.current > track.laps) {
        finished.current = true;
        callbacks.current?.onFinish(now - raceStartMs.current);
      }
    }
    callbacks.current?.onProgress({
      elapsedMs: now - raceStartMs.current,
      offTrack: !onTrack,
      x: state.current.x,
      z: state.current.z,
      heading: state.current.heading,
      speed: carSpeed(state.current),
      driftFactor: state.current.driftFactor,
    });

    // apply transform to the car mesh, plus a slight bank into the slide
    // while drifting (purely cosmetic — the physics doesn't use tilt).
    if (carRef.current) {
      carRef.current.position.set(state.current.x, 0, state.current.z);
      carRef.current.rotation.y = state.current.heading;
      const travelHeading = Math.atan2(state.current.vx, state.current.vz);
      let diff = state.current.heading - travelHeading;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      const targetTilt = Math.max(-0.25, Math.min(0.25, diff * state.current.driftFactor * 0.9));
      carTiltRef.current += (targetTilt - carTiltRef.current) * 0.15;
      carRef.current.rotation.z = carTiltRef.current;
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
      <TrackMesh track={track} />
      <TrackScenery track={track} />
      <Car ref={carRef} color={car.color} scale={car.scale} variant={car.variant} />
    </>
  );
}
