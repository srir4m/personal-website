import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { content } from "../../content";
import { ACT_RANGES } from "../../stage/acts";
import { actProgress, useStage } from "../../stage/store";
import { facingRotation, latLngToVector } from "./geo";
import type { GlobeData } from "./globeData";
import { DOLLY_DISTANCE, GLOBE_RADIUS_VMIN, IDLE_START_LNG, IDLE_TILT_DEG, cameraDistanceFor } from "./layout";
import { globeFragment, globeVertex } from "./shaders";
import { subsolarPoint } from "./sun";

const RANGE = ACT_RANGES[1]!;
const { lat: MARKER_LAT, lng: MARKER_LNG } = content.education.location;
const FACING = facingRotation(MARKER_LAT, MARKER_LNG);
const IDLE = facingRotation(IDLE_TILT_DEG, IDLE_START_LNG);
const IDLE_SPEED = (2 * Math.PI) / 90; // one revolution per 90 s (PRD Act 1)
/** By this share of the act the marker faces the camera; the dolly runs after it. */
const FACE_BY = 0.4;

/** Screen-space state the DOM HUD reads every frame, without React renders. */
export type HudFrame = { x: number; y: number; visible: number; width: number; height: number };

function srgb(hex: string) {
  const value = parseInt(hex.slice(1), 16);
  return new THREE.Vector3(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
}

function graticuleGeometry(step = 15, resolution = 2, radius = 1.0015) {
  const points: number[] = [];
  const push = (lat0: number, lng0: number, lat1: number, lng1: number) =>
    points.push(...latLngToVector(lat0, lng0, radius), ...latLngToVector(lat1, lng1, radius));
  for (let lng = -180; lng < 180; lng += step)
    for (let lat = -90; lat < 90; lat += resolution) push(lat, lng, lat + resolution, lng);
  for (let lat = -90 + step; lat < 90; lat += step)
    for (let lng = -180; lng < 180; lng += resolution) push(lat, lng, lat, lng + resolution);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  return geometry;
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Shortest-path blend between two angles. */
function blendAngle(from: number, to: number, weight: number) {
  const delta = ((((to - from) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;
  return from + delta * weight;
}

type Props = { data: GlobeData; phone: boolean; hud: React.RefObject<(frame: HudFrame) => void> };

export function GlobeScene({ data, phone, hud }: Props) {
  const group = useRef<THREE.Group>(null);
  const idle = useRef(IDLE.y);
  const { gl, camera, invalidate } = useThree();

  const material = useMemo(() => {
    const land = new THREE.Texture(data.landMask);
    land.colorSpace = THREE.NoColorSpace;
    land.generateMipmaps = false; // mip selection breaks at the longitude seam
    land.minFilter = THREE.LinearFilter;
    land.wrapS = THREE.RepeatWrapping;
    land.needsUpdate = true;
    const sun = subsolarPoint(new Date());
    return new THREE.ShaderMaterial({
      vertexShader: globeVertex,
      fragmentShader: globeFragment,
      uniforms: {
        uLand: { value: land },
        uSun: { value: new THREE.Vector3(...latLngToVector(sun.lat, sun.lng)) },
        uHatch: { value: phone ? 0 : 1 },
        uPixelRatio: { value: 1 },
        uParchment: { value: srgb("#EFE4CC") },
        uSepia: { value: srgb("#8A6B47") },
        uInk: { value: srgb("#2B2118") },
        uCyan: { value: srgb("#3FD6E0") },
      },
    });
  }, [data, phone]);

  const coastlines = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    // Lift the lines just off the surface so the sphere's depth doesn't swallow them.
    const lifted = data.coastlines.map((v) => v * 1.002);
    geometry.setAttribute("position", new THREE.BufferAttribute(lifted, 3));
    return geometry;
  }, [data]);
  const graticule = useMemo(() => graticuleGeometry(), []);
  const markerLocal = useMemo(() => new THREE.Vector3(...latLngToVector(MARKER_LAT, MARKER_LNG)), []);
  const scratch = useMemo(() => ({ world: new THREE.Vector3(), normal: new THREE.Vector3(), toCamera: new THREE.Vector3() }), []);

  useEffect(
    () => () => {
      material.uniforms.uLand!.value.dispose();
      material.dispose();
    },
    [material],
  );
  useEffect(() => () => coastlines.dispose(), [coastlines]);
  useEffect(() => () => graticule.dispose(), [graticule]);

  // In demand mode, redraw whenever the playhead moves.
  useEffect(() => useStage.subscribe((s, prev) => s.progress !== prev.progress && invalidate()), [invalidate]);

  useFrame((state, delta) => {
    const globe = group.current;
    if (!globe) return;
    const { progress, motion } = useStage.getState();
    const t = actProgress(RANGE, progress);
    const { width, height } = state.size;

    if (motion === "full") idle.current += Math.min(delta, 0.1) * IDLE_SPEED;
    const face = smoothstep(0, FACE_BY, t);
    globe.rotation.set(
      IDLE.x + (FACING.x - IDLE.x) * face,
      blendAngle(idle.current, FACING.y, face),
      0,
      "XYZ",
    );

    const rest = cameraDistanceFor(GLOBE_RADIUS_VMIN * Math.min(width, height), height);
    const dolly = smoothstep(FACE_BY, 1, t);
    camera.position.set(0, 0, rest + (DOLLY_DISTANCE - rest) * dolly);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    material.uniforms.uPixelRatio!.value = gl.getPixelRatio();

    // Project the marker for the DOM HUD; fade it out as it turns to the far side.
    globe.updateMatrixWorld();
    const { world, normal, toCamera } = scratch;
    world.copy(markerLocal).applyMatrix4(globe.matrixWorld);
    normal.copy(world).normalize();
    toCamera.copy(camera.position).sub(world).normalize();
    const visible = smoothstep(0.05, 0.3, normal.dot(toCamera));
    world.project(camera);
    hud.current?.({ x: ((world.x + 1) / 2) * width, y: ((1 - world.y) / 2) * height, visible, width, height });
  });

  return (
    <group ref={group}>
      <mesh material={material}>
        <sphereGeometry args={[1, phone ? 64 : 128, phone ? 32 : 64]} />
      </mesh>
      <lineSegments geometry={graticule}>
        <lineBasicMaterial color="#8A6B47" transparent opacity={0.45} />
      </lineSegments>
      <lineSegments geometry={coastlines}>
        <lineBasicMaterial color="#2B2118" />
      </lineSegments>
    </group>
  );
}
