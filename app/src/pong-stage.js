import * as THREE from "three";
import * as CANNON from "cannon-es";

const canvas = document.querySelector("#pong-canvas");
const stage = document.querySelector("#pong-stage");
const audioButton = document.querySelector("#pong-audio");
if (!canvas || !stage) throw new Error("Pong stage mount is missing");

const mono = window.matchMedia?.("(prefers-color-scheme: dark)").matches
  ? { paper: "#1d1c1a", ink: "#eee9df" }
  : { paper: "#f3efe7", ink: "#27231f" };
const scene = new THREE.Scene();
scene.background = new THREE.Color(mono.paper);
const camera = new THREE.OrthographicCamera(-20, 20, 20, -20, .1, 200);
const cameraTarget = new THREE.Vector3(0, 1.5, 0);
const cameraRadius = 60;
let cameraAzimuth = Math.PI / 4;
let cameraElevation = Math.atan(1 / Math.sqrt(2));
function updateCamera() {
  camera.position.set(
    Math.cos(cameraAzimuth) * Math.cos(cameraElevation) * cameraRadius,
    Math.sin(cameraElevation) * cameraRadius,
    Math.sin(cameraAzimuth) * Math.cos(cameraElevation) * cameraRadius
  );
  camera.lookAt(cameraTarget);
}
updateCamera();
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -9.82, 0) });
world.broadphase = new CANNON.NaiveBroadphase();
world.solver.iterations = 8;
const floor = new CANNON.Body({ mass: 0, shape: new CANNON.Plane() });
floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
world.addBody(floor);
const ballBody = new CANNON.Body({ mass: 1, shape: new CANNON.Sphere(.52), position: new CANNON.Vec3(-4, 2.5, 0) });
ballBody.velocity.set(4.2, 0, 1.1);
ballBody.linearDamping = .08;
world.addBody(ballBody);

const inkMaterial = new THREE.MeshBasicMaterial({ color: mono.ink });
const lineMaterial = new THREE.LineBasicMaterial({ color: mono.ink, transparent: true, opacity: .75 });
const ballMaterial = new THREE.MeshBasicMaterial({ color: mono.ink, wireframe: true });

function line(a, b, material = lineMaterial) {
  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(...a), new THREE.Vector3(...b)
  ]);
  scene.add(new THREE.Line(geometry, material));
}

// Teatro room envelope: X ±15, Z ±10, Y 0…20, including the door rail.
const room = { width: 15, depth: 10, height: 20 };
line([-room.width, 0, room.depth], [room.width, 0, room.depth]);
line([room.width, 0, room.depth], [room.width, 0, -room.depth]);
line([room.width, 0, -room.depth], [-room.width, 0, -room.depth]);
line([-room.width, 0, -room.depth], [-room.width, 0, room.depth]);
line([-room.width, 0, room.depth], [-room.width, room.height, room.depth]);
line([room.width, 0, room.depth], [room.width, room.height, room.depth]);
line([room.width, 0, -room.depth], [room.width, room.height, -room.depth]);
line([-room.width, 0, -room.depth], [-room.width, room.height, -room.depth]);
line([-room.width, room.height, room.depth], [room.width, room.height, room.depth]);
line([room.width, room.height, room.depth], [room.width, room.height, -room.depth]);
line([room.width, room.height, -room.depth], [-room.width, room.height, -room.depth]);
line([-room.width, room.height, -room.depth], [-room.width, room.height, room.depth]);
line([room.width, 0, -4], [room.width, 8, -4]);
line([room.width, 8, -4], [room.width, 8, -1]);
line([room.width, 8, -1], [room.width, 0, -1]);

function outlinedMesh(geometry) {
  const group = new THREE.Group();
  group.add(new THREE.Mesh(geometry, inkMaterial));
  group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry), lineMaterial));
  return group;
}

function createPuppet(label, x) {
  const puppet = new THREE.Group();
  puppet.name = label;
  puppet.position.set(x, 0, 0);
  puppet.userData.baseX = x;
  puppet.userData.baseX = x;
  puppet.userData.windPhase = x < 0 ? 0 : Math.PI;
  const bar = outlinedMesh(new THREE.BoxGeometry(10, .2, .2));
  bar.position.set(0, 15, 0);
  puppet.add(bar);
  const torso = outlinedMesh(new THREE.BoxGeometry(1.6, 3.0, .8));
  torso.position.y = 8;
  const head = outlinedMesh(new THREE.BoxGeometry(1.1, 1.1, .8));
  head.position.y = 10;
  const armL = outlinedMesh(new THREE.BoxGeometry(.4, 2.0, .4));
  const armR = armL.clone();
  armL.position.set(-1.8, 8, 0); armR.position.set(1.8, 8, 0);
  const legL = outlinedMesh(new THREE.BoxGeometry(.5, 2.2, .5));
  const legR = legL.clone();
  legL.position.set(-.6, 5, 0); legR.position.set(.6, 5, 0);
  const stringMaterial = new THREE.LineBasicMaterial({ color: mono.ink, transparent: true, opacity: .85 });
  const makeString = (a, b) => {
    const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(...a), new THREE.Vector3(...b)]);
    const string = new THREE.Line(geometry, stringMaterial);
    puppet.add(string);
    return { string, a, b };
  };
  const strings = [
    makeString([-2.5, 14.9, 0], [0, 10.5, 0]),
    makeString([-2.5, 14.9, 0], [-1.8, 9, 0]),
    makeString([2.5, 14.9, 0], [1.8, 9, 0])
  ];
  puppet.userData.parts = { armL, armR, bar, strings };
  puppet.add(torso, head, armL, armR, legL, legR);
  scene.add(puppet);
  return puppet;
}

const puppetA = createPuppet("Puppet A", -6.4);
const puppetB = createPuppet("Puppet B", 6.4);
const ball = new THREE.Mesh(new THREE.SphereGeometry(.52, 20, 14), ballMaterial);
scene.add(ball);

let audioContext;
let csound;
let Csound;
const orchestra = `sr=48000\nksmps=64\nnchnls=2\n0dbfs=1\nmassign 0,1\ninstr 1\n iFreq=cpsmidinn(p4)\n aEnv expon .45,.12,.001\n aSig oscili(aEnv,iFreq)\n outs aSig,aSig\nendin`;
async function enableAudio() {
  if (csound) return;
  audioContext = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: "interactive" });
  await audioContext.resume();
  Csound ??= (await import("@csound/browser")).default;
  csound = await Csound({ audioContext, autoConnect: false, useWorker: false });
  await csound.setOption("-odac");
  await csound.setOption("-m0");
  await csound.compileOrc(orchestra);
  const node = await csound.getNode();
  node.connect(audioContext.destination);
  await csound.start();
  audioButton.textContent = "Sound aktiv";
}
async function hitSound() {
  if (!csound) return;
  const note = 66 + Math.round(Math.min(12, Math.abs(ballBody.velocity.x)));
  await csound.midiMessage(0x90, note, 108);
  window.setTimeout(() => csound?.midiMessage(0x80, note, 0), 110);
}
audioButton?.addEventListener("click", () => enableAudio().catch(() => { audioButton.textContent = "Sound nicht verfügbar"; }));

let dragStart;
stage.addEventListener("pointerdown", event => {
  if (event.target === audioButton) return;
  dragStart = { x: event.clientX, y: event.clientY, azimuth: cameraAzimuth, elevation: cameraElevation };
  stage.classList.add("is-dragging");
  stage.setPointerCapture(event.pointerId);
});
stage.addEventListener("pointermove", event => {
  if (!dragStart) return;
  cameraAzimuth = dragStart.azimuth - (event.clientX - dragStart.x) * .012;
  cameraElevation = Math.max(.2, Math.min(1.3, dragStart.elevation + (event.clientY - dragStart.y) * .008));
  updateCamera();
});
function stopDrag(event) {
  dragStart = undefined;
  stage.classList.remove("is-dragging");
  if (event.pointerId !== undefined && stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
}
stage.addEventListener("pointerup", stopDrag);
stage.addEventListener("pointercancel", stopDrag);
stage.addEventListener("keydown", event => {
  const step = event.shiftKey ? .18 : .08;
  if (event.key === "ArrowLeft") cameraAzimuth -= step;
  else if (event.key === "ArrowRight") cameraAzimuth += step;
  else if (event.key === "ArrowUp") cameraElevation = Math.min(1.3, cameraElevation + step);
  else if (event.key === "ArrowDown") cameraElevation = Math.max(.2, cameraElevation - step);
  else return;
  event.preventDefault();
  updateCamera();
});

function resize() {
  const width = stage.clientWidth || 640;
  const height = stage.clientHeight || 360;
  const aspect = width / height;
  camera.left = -20 * aspect; camera.right = 20 * aspect; camera.top = 20; camera.bottom = -20;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

let lastHitDirection = 0;
function animate() {
  const time = performance.now() / 1000;
  // Teatro's configured motion: sway 2.0 @ .7 Hz, vertical motion .5 @ .9 Hz,
  // with a subtle strength-1 drift applied to the suspended bodies.
  const sway = Math.sin(time * .7) * 2.0;
  const upDown = Math.sin(time * .9) * .5;
  const wind = Math.sin(time * .75) * .12;
  world.step(1 / 60);
  ballBody.applyForce(new CANNON.Vec3(wind, 0, Math.cos(time * .53) * .035), ballBody.position);
  if (ballBody.position.x < -11.0 || ballBody.position.x > 11.0) {
    ballBody.velocity.x *= -1;
    ballBody.position.x = Math.max(-11.0, Math.min(11.0, ballBody.position.x));
    if (Math.sign(ballBody.velocity.x) !== lastHitDirection) {
      lastHitDirection = Math.sign(ballBody.velocity.x);
      void hitSound();
    }
  }
  if (ballBody.position.z < -8.0 || ballBody.position.z > 8.0) {
    ballBody.velocity.z *= -1;
    ballBody.position.z = Math.max(-8.0, Math.min(8.0, ballBody.position.z));
  }
  ball.position.copy(ballBody.position);
  ball.rotation.x += .02;
  ball.rotation.z += .015;
  for (const puppet of [puppetA, puppetB]) {
    const phase = puppet.userData.windPhase;
    const puppetSway = Math.sin(time * .7 + phase) * .06 + wind;
    puppet.position.x = puppet.userData.baseX + sway;
    puppet.position.y = upDown;
    puppet.userData.parts.bar.position.x = Math.sin(time * .7 + phase) * .12;
    puppet.userData.parts.bar.position.y = 15 + upDown;
    puppet.rotation.z = puppetSway;
    puppet.rotation.y = Math.sin(time * .42 + phase) * .04;
    puppet.userData.parts.armL.rotation.z = puppetSway * 2;
    puppet.userData.parts.armR.rotation.z = puppetSway * 2;
    for (const { string, a, b } of puppet.userData.parts.strings) {
      const start = new THREE.Vector3(a[0], a[1], a[2]);
      const end = new THREE.Vector3(b[0], b[1], b[2]);
      start.x += puppet.userData.parts.bar.position.x;
      start.y = puppet.userData.parts.bar.position.y - .1;
      string.geometry.setFromPoints([start, end]);
    }
  }
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

new ResizeObserver(resize).observe(stage);
resize();
animate();
