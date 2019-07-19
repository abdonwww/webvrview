// import WebVRPolyfill from 'webvr-polyfill';
import Stats from "stats.js";
import * as THREE from 'three';
import TWEEN from '@tweenjs/tween.js';
import WEBVR from './three.webvr';

// new WebVRPolyfill();
const stats = new Stats();

const showStats = () => {
  stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
  // Align bottom-left.
  stats.dom.style.position = 'absolute';
  stats.dom.style.left = '0px';
  stats.dom.style.bottom = '0px';
  document.body.appendChild(stats.dom);
}
showStats();

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: false });
renderer.setPixelRatio( window.devicePixelRatio );
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.vr.enabled = true; // this changes camera position (x: 0, y: 1.6, z: 0) https://github.com/mrdoob/three.js/issues/14994

document.body.appendChild(renderer.domElement);
document.body.appendChild(WEBVR.createButton(renderer));

const geometry = new THREE.BoxGeometry( 1, 1, 1 );
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
const cube = new THREE.Mesh(geometry, material);
cube.position.set( 0, 1.6, -5 ); // Test

scene.add(cube);

const loop = (time: number) => {
  console.log('position', camera.position);
  stats.begin();
  TWEEN.update(time);
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;
  renderer.render( scene, camera );
  stats.end();
};

renderer.setAnimationLoop(loop);

