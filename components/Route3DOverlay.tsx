"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { Coord } from "@/lib/orsTypes";
import type { RouteOption } from "@/lib/types";

type Props = {
  activePolyline?: [number, number][];
  stopCoords?: Coord[];
  routeOptions?: RouteOption[];
  selectedRouteIndex?: number;
};

export function Route3DOverlay({
  activePolyline,
  stopCoords = [],
  routeOptions = [],
  selectedRouteIndex = 0,
}: Props) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const displayPolyline = activePolyline?.length ? activePolyline : PREVIEW_POLYLINE;
  const isPreview = !activePolyline || activePolyline.length < 2;

  useEffect(() => {
    const host = hostRef.current;
    if (!host || displayPolyline.length < 2) return;
    if (host.clientWidth <= 0 || host.clientHeight <= 0) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    } catch {
      host.replaceChildren();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(host.clientWidth, host.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = "h-full w-full";
    renderer.domElement.setAttribute("aria-hidden", "true");
    host.replaceChildren(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020617, 0.047);

    const camera = new THREE.PerspectiveCamera(38, host.clientWidth / host.clientHeight, 0.1, 120);
    camera.position.set(0, 8.4, 13.5);
    camera.lookAt(0, 0.8, 0);

    const world = new THREE.Group();
    world.rotation.x = -0.96;
    scene.add(world);

    const ambient = new THREE.HemisphereLight(0x9dd6ff, 0x020617, 1.4);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0x8be9fd, 1.8);
    keyLight.position.set(-4, 9, 7);
    scene.add(keyLight);

    const fillLight = new THREE.PointLight(0x22d3ee, 2.4, 30, 2);
    fillLight.position.set(3, 3.8, 2);
    scene.add(fillLight);

    const skyGlow = new THREE.Mesh(
      new THREE.SphereGeometry(24, 32, 32),
      new THREE.MeshBasicMaterial({
        color: 0x0f172a,
        side: THREE.BackSide,
        transparent: true,
        opacity: 0.92,
      })
    );
    scene.add(skyGlow);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(12.5, 64),
      new THREE.MeshStandardMaterial({
        color: 0x07111f,
        emissive: 0x020617,
        roughness: 0.92,
        metalness: 0.08,
      })
    );
    floor.position.y = -0.02;
    floor.rotation.x = -Math.PI / 2;
    world.add(floor);

    const routePoints = normalizePolyline(displayPolyline, 11.5);
    const selectedCurve = new THREE.CatmullRomCurve3(routePoints, false, "catmullrom", 0.25);

    const roadDeck = buildRoadDeck(selectedCurve);
    world.add(roadDeck);

    const cityGroup = buildCity(routePoints);
    world.add(cityGroup);

    const laneStripe = buildLaneStripe(selectedCurve);
    world.add(laneStripe);

    const tubeGeometry = new THREE.TubeGeometry(selectedCurve, 160, 0.07, 10, false);
    const tubeMaterial = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.88,
      emissive: 0x1d4ed8,
      emissiveIntensity: 1.15,
      roughness: 0.28,
      metalness: 0.52,
    });
    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
    world.add(tube);

    const glowGeometry = new THREE.TubeGeometry(selectedCurve, 160, 0.18, 14, false);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0.11,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    world.add(glow);

    routeOptions.forEach((option, index) => {
      if (index === selectedRouteIndex || option.polyline.length < 2) return;
      const altPoints = normalizePolyline(option.polyline, 11.5);
      const altCurve = new THREE.CatmullRomCurve3(altPoints, false, "catmullrom", 0.2);
      const altGeometry = new THREE.BufferGeometry().setFromPoints(altCurve.getPoints(110));
      const altMaterial = new THREE.LineDashedMaterial({
        color: 0x94a3b8,
        transparent: true,
        opacity: 0.28,
        dashSize: 0.18,
        gapSize: 0.16,
      });
      const alt = new THREE.Line(altGeometry, altMaterial);
      alt.computeLineDistances();
      world.add(alt);
    });

    const pulse = buildPulseBeacon();
    world.add(pulse);

    const car = buildCarModel();
    world.add(car);

    const markerColors = [0x34d399, 0x38bdf8, 0xf87171, 0xfbbf24];
    const stopPositions = isPreview
      ? [routePoints[0], routePoints[Math.floor(routePoints.length / 2)], routePoints[routePoints.length - 1]]
      : normalizeCoords(stopCoords, displayPolyline, 11.5);
    stopPositions.forEach((point, index) => {
      const color = markerColors[Math.min(index, markerColors.length - 1)];
      const beacon = buildStopBeacon(color, index === 0 ? 1.15 : 0.92);
      beacon.position.set(point.x, 0.02, point.z);
      world.add(beacon);
    });

    const grid = new THREE.GridHelper(13, 14, 0x164e63, 0x0f172a);
    const gridMaterial = grid.material as THREE.Material | THREE.Material[];
    if (Array.isArray(gridMaterial)) {
      gridMaterial.forEach((material) => {
        material.transparent = true;
        material.opacity = 0.11;
      });
    } else {
      gridMaterial.transparent = true;
      gridMaterial.opacity = 0.11;
    }
    world.add(grid);

    const particleField = buildParticleField();
    scene.add(particleField);

    const resizeObserver = new ResizeObserver(() => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      if (width <= 0 || height <= 0) return;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    });
    resizeObserver.observe(host);

    let frame = 0;
    let raf = 0;
    const animate = () => {
      frame += 0.008;
      const point = selectedCurve.getPointAt(frame % 1);
      const tangent = selectedCurve.getTangentAt((frame + 0.002) % 1).normalize();
      pulse.position.copy(point);
      pulse.position.y += 0.24 + Math.sin(frame * 12) * 0.04;
      pulse.rotation.y += 0.02;
      car.position.copy(point);
      car.position.y += 0.16;
      car.lookAt(point.clone().add(tangent));
      car.rotateY(Math.PI / 2);
      car.rotation.z += Math.sin(frame * 10) * 0.002;
      tubeMaterial.opacity = 0.82 + Math.sin(frame * 8) * 0.04;
      glowMaterial.opacity = 0.1 + Math.sin(frame * 5) * 0.03;
      laneStripe.material.opacity = 0.45 + Math.sin(frame * 14) * 0.12;
      cityGroup.children.forEach((child, index) => {
        child.position.y = (child.userData.baseY as number) + Math.sin(frame * 3 + index * 0.7) * 0.01;
      });
      particleField.rotation.y += 0.0008;
      world.rotation.z = Math.sin(frame * 0.75) * 0.018;
      camera.position.x = Math.sin(frame * 0.45) * 1.2;
      camera.position.z = 13.4 + Math.cos(frame * 0.35) * 0.4;
      camera.lookAt(0, 0.8, 0);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        mesh.geometry?.dispose?.();
        const material = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material?.dispose?.();
      });
      renderer.dispose();
      host.replaceChildren();
    };
  }, [displayPolyline, isPreview, routeOptions, selectedRouteIndex, stopCoords]);

  return (
    <div className="pointer-events-none absolute bottom-4 right-4 z-[430] hidden md:block">
      <div className="overflow-hidden rounded-[1.6rem] border border-cyan-300/20 bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.16),_rgba(2,6,23,0.88)_62%)] shadow-[0_24px_80px_rgba(2,6,23,0.58)] backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-200">
              Route world
            </p>
            <p className="text-[11px] text-slate-400">
              {isPreview ? "Preview street scene" : "Animated 3D drive"}
            </p>
          </div>
          <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-300">
            {routeOptions.length > 1 ? `${routeOptions.length} routes` : "live"}
          </span>
        </div>
        <div
          ref={hostRef}
          className={"h-44 w-64 bg-transparent " + (isPreview ? "opacity-80" : "opacity-100")}
        />
      </div>
    </div>
  );
}

const PREVIEW_POLYLINE: [number, number][] = [
  [41.879, -87.644],
  [41.882, -87.638],
  [41.881, -87.631],
  [41.876, -87.626],
  [41.872, -87.621],
  [41.868, -87.616],
];

function normalizePolyline(points: [number, number][], scale: number): THREE.Vector3[] {
  const bounds = getBounds(points);
  return points.map(([lat, lng]) => project(lat, lng, bounds, scale));
}

function normalizeCoords(
  coords: Coord[],
  reference: [number, number][],
  scale: number
): THREE.Vector3[] {
  const bounds = getBounds(reference);
  return coords.map((coord) => project(coord.lat, coord.lng, bounds, scale));
}

function getBounds(points: [number, number][]) {
  const lats = points.map(([lat]) => lat);
  const lngs = points.map(([, lng]) => lng);
  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}

function project(
  lat: number,
  lng: number,
  bounds: ReturnType<typeof getBounds>,
  scale: number
): THREE.Vector3 {
  const latSpan = Math.max(bounds.maxLat - bounds.minLat, 0.0001);
  const lngSpan = Math.max(bounds.maxLng - bounds.minLng, 0.0001);
  const x = ((lng - bounds.minLng) / lngSpan - 0.5) * scale;
  const z = ((lat - bounds.minLat) / latSpan - 0.5) * -scale;
  return new THREE.Vector3(x, 0.12, z);
}

function buildRoadDeck(curve: THREE.CatmullRomCurve3) {
  const road = new THREE.Group();
  const points = curve.getSpacedPoints(44);
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const segment = end.clone().sub(start);
    const length = segment.length();
    const mid = start.clone().lerp(end, 0.5);

    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.08, Math.max(length, 0.28)),
      new THREE.MeshStandardMaterial({
        color: index % 3 === 0 ? 0x0f172a : 0x111827,
        roughness: 0.95,
        metalness: 0.06,
      })
    );
    mesh.position.set(mid.x, 0.02, mid.z);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      segment.clone().normalize()
    );
    road.add(mesh);
  }
  return road;
}

function buildLaneStripe(curve: THREE.CatmullRomCurve3) {
  const stripe = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(curve.getPoints(160)),
    new THREE.LineDashedMaterial({
      color: 0xf8fafc,
      transparent: true,
      opacity: 0.48,
      dashSize: 0.18,
      gapSize: 0.14,
    })
  );
  stripe.computeLineDistances();
  stripe.position.y = 0.09;
  return stripe;
}

function buildCity(routePoints: THREE.Vector3[]) {
  const city = new THREE.Group();
  const box = new THREE.BoxGeometry(0.64, 1, 0.64);
  routePoints.forEach((point, routeIndex) => {
    for (let side = -1; side <= 1; side += 2) {
      for (let offsetIndex = 1; offsetIndex <= 3; offsetIndex += 1) {
        const heightSeed = pseudoRandom(routeIndex * 17 + side * 13 + offsetIndex * 19);
        const height = 0.8 + heightSeed * 3.6;
        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color().setHSL(0.57 + pseudoRandom(routeIndex + offsetIndex) * 0.05, 0.34, 0.16 + pseudoRandom(routeIndex * 3 + offsetIndex) * 0.1),
          emissive: new THREE.Color().setHSL(0.54, 0.8, 0.12 + heightSeed * 0.08),
          emissiveIntensity: 0.9,
          roughness: 0.7,
          metalness: 0.28,
        });
        const tower = new THREE.Mesh(box, material);
        tower.scale.y = height;
        tower.scale.x = 0.7 + pseudoRandom(routeIndex * 5 + offsetIndex) * 0.9;
        tower.scale.z = 0.7 + pseudoRandom(routeIndex * 7 + offsetIndex) * 0.9;
        tower.position.set(
          point.x + side * (1.15 + offsetIndex * 0.78 + pseudoRandom(routeIndex + offsetIndex) * 0.45),
          0.18 + height * 0.5,
          point.z + (offsetIndex - 2) * 0.6
        );
        tower.userData.baseY = tower.position.y;
        city.add(tower);
      }
    }
  });
  return city;
}

function buildPulseBeacon() {
  return new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 24, 24),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.96,
      blending: THREE.AdditiveBlending,
    })
  );
}

function buildStopBeacon(color: number, scale = 1) {
  const beacon = new THREE.Group();

  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1 * scale, 0.14 * scale, 0.34 * scale, 18),
    new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.7,
      roughness: 0.32,
      metalness: 0.48,
    })
  );
  core.position.y = 0.2 * scale;
  beacon.add(core);

  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.16 * scale, 20, 20),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.94,
      blending: THREE.AdditiveBlending,
    })
  );
  orb.position.y = 0.44 * scale;
  beacon.add(orb);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.36 * scale, 0.022 * scale, 8, 36),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.42,
      blending: THREE.AdditiveBlending,
    })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.04;
  beacon.add(ring);

  return beacon;
}

function buildCarModel() {
  const car = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.22, 0.36),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0f172a,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.72,
    })
  );
  body.position.y = 0.18;
  car.add(body);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(0.34, 0.18, 0.28),
    new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.84,
      roughness: 0.16,
      metalness: 0.2,
    })
  );
  cabin.position.set(0.02, 0.34, 0);
  car.add(cabin);

  const wheelGeometry = new THREE.CylinderGeometry(0.08, 0.08, 0.04, 16);
  const wheelMaterial = new THREE.MeshStandardMaterial({
    color: 0x020617,
    roughness: 0.88,
    metalness: 0.18,
  });

  [
    [-0.22, 0.1, -0.18],
    [-0.22, 0.1, 0.18],
    [0.22, 0.1, -0.18],
    [0.22, 0.1, 0.18],
  ].forEach(([x, y, z]) => {
    const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, z);
    car.add(wheel);
  });

  const lightMaterial = new THREE.MeshBasicMaterial({
    color: 0xfef08a,
    transparent: true,
    opacity: 0.74,
    blending: THREE.AdditiveBlending,
  });
  const leftLight = new THREE.Mesh(new THREE.SphereGeometry(0.04, 12, 12), lightMaterial);
  leftLight.position.set(0.37, 0.2, -0.09);
  car.add(leftLight);
  const rightLight = leftLight.clone();
  rightLight.position.z = 0.09;
  car.add(rightLight);

  return car;
}

function buildParticleField() {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(160 * 3);
  for (let index = 0; index < 160; index += 1) {
    positions[index * 3] = (pseudoRandom(index * 11) - 0.5) * 24;
    positions[index * 3 + 1] = 2.2 + pseudoRandom(index * 13) * 7.5;
    positions[index * 3 + 2] = (pseudoRandom(index * 17) - 0.5) * 24;
  }
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color: 0x7dd3fc,
      size: 0.06,
      transparent: true,
      opacity: 0.56,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })
  );
}

function pseudoRandom(seed: number) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}
