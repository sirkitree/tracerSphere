import * as THREE from "three";
import { Tween, Ease } from "@createjs/tweenjs";
const OrbitControls = require("three-orbit-controls")(THREE);

// The number of spheres to render.
const spheres = 89;

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color("white");

// Camera setup
const wh = window.innerWidth / window.innerHeight;
const camera = new THREE.PerspectiveCamera(45, wh, 1, 8000);
camera.position.set(0, 0, -4);

// Line setup
const lineMaterial = new THREE.ShaderMaterial({
  uniforms: {
    t: new THREE.Uniform(0.0)
  },
  vertexShader: `
attribute float linePosition;
varying float vLinePosition;
void main() {
  vLinePosition = linePosition;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`,
  fragmentShader: `
uniform float t;
varying float vLinePosition;
void main() {
  float opacity = ceil(t - vLinePosition);
  gl_FragColor = vec4(0.0, 0.0, 0.0, opacity);
}
`,
  transparent: true
});

// Renderer setup
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

const app = document.getElementById("app");
app.appendChild(renderer.domElement);

// Camera controls setup
const cameraControls = new OrbitControls(camera, renderer.domElement);
cameraControls.target.set(0, 0, 0);

/**
 * Utility to calculate the position of a given number of spheres.
 *
 * @param {int} samples number of spheres to create
 * @param {bool} randomize whether the order should be randomized or uniform
 */
const fibonacciSphere = (samples, randomize) => {
  var rnd = 1;
  if (randomize) {
    rnd = Math.random * samples;
  }
  var coords = [];
  var offset = 2 / samples;
  var increment = Math.PI * (3 - Math.sqrt(5));

  for (let i = 1; i < samples; i++) {
    let y = i * offset - 1 + offset / 2;
    let r = Math.sqrt(1 - Math.pow(y, 2));
    let phi = ((i + rnd) % samples) * increment;
    let x = Math.cos(phi) * r;
    let z = Math.sin(phi) * r;
    coords.push([x, y, z]);
  }
  return coords;
};

/**
 * Utiliy for constructing a THREE sphere.
 *
 * @param {int} radius desired radius of the sphere
 * @param {string} c desired color of the sphere
 */
const createSphere = (radius = 0.1, c = "white") => {
  const material = new THREE.MeshBasicMaterial({ color: c });
  const geometry = new THREE.SphereGeometry(radius, 16, 8);
  const sphere = new THREE.Mesh(geometry, material);
  return sphere;
};

/**
 * Tween animation
 * - attaches to the group of spheres in order to change it's scale.
 *
 * @param {THREE.Object3D}  ball
 */
const changeBallScale = ball => {
  new Tween(ball.scale)
    .to({ x: 0.01, y: 0.01, z: 0.01 })
    .wait(1000)
    .to({ x: 1.0, y: 1.0, z: 1.0 }, 1000, Ease.backOut)
    .wait(15000)
    .to({ x: 0, y: 0, z: 0 }, 1000, Ease.backIn);
};

/**
 * Tween animation
 * - attaches to each individual sphere to change their scale.
 *
 * @param {THREE.Object3D} point
 * @param {int} index
 */
const changeScale = (point, index) => {
  new Tween(point.scale)
    .to(
      {
        x: point.scale.x,
        y: point.scale.y,
        z: point.scale.z
      },
      5000,
      Ease.elasticIn
    )
    .wait(index * 15)
    .to(
      {
        x: point.scale.x * 2,
        y: point.scale.y * 2,
        z: point.scale.z * 2
      },
      150,
      Ease.elasticOut
    )
    .to(
      {
        x: point.scale.x,
        y: point.scale.y,
        z: point.scale.z
      },
      100,
      Ease.elasticIn
    )
    .wait(5000)
    .to(
      {
        x: point.scale.x * 2,
        y: point.scale.y * 2,
        z: point.scale.z * 2
      },
      150,
      Ease.elasticOut
    )
    .to(
      {
        x: point.scale.x,
        y: point.scale.y,
        z: point.scale.z
      },
      100,
      Ease.elasticIn
    );
};

/**
 * Tween animation
 * - attaches to the line material in order to change its opacity.
 *
 * @param {THREE.ShaderMaterial} material
 */
const changeLineOpacity = material => {
  new Tween(material.uniforms.t).wait(7000).to(
    {
      value: 1.0
    },
    1000,
    Ease.cubicIn
  );
};

// Group to contain individual spheres.
const ball = new THREE.Group();
ball.rotation.set(10, 0, 0); // initial rotation position

/**
 * Called manually just before render();
 */
const fillScene = () => {
  const fibonacciSpherePoints = fibonacciSphere(spheres, false);
  const positionArray = [];
  const linePositionArray = [];
  fibonacciSpherePoints.forEach((coords, index, array) => {
    const point = createSphere(0.03, "black");

    point.position.set(...coords);
    // attach Tween animations to each sphere
    changeScale(point, index);

    // add it to the group
    ball.add(point);

    // add a line segment between two fibonacci points to the line array
    const nextIndex = (index + 1) % array.length;
    positionArray.push(...coords, ...array[nextIndex]);

    // add relative position in line to drive the line opacity animation
    linePositionArray.push(
      index / (array.length - 1),
      nextIndex / (array.length - 1)
    );
  });

  // create the line mesh
  const lineGeometry = new THREE.BufferGeometry();
  lineGeometry.addAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array(positionArray), 3)
  );
  lineGeometry.addAttribute(
    "linePosition",
    new THREE.BufferAttribute(new Float32Array(linePositionArray), 1)
  );
  const lineMesh = new THREE.LineSegments(lineGeometry, lineMaterial);

  // attach a Tween animation to modify the line opacity
  changeLineOpacity(lineMaterial);

  // add the line to the group
  ball.add(lineMesh);

  // add the group of spheres and lines to the scene
  scene.add(ball);

  // attach a Tween animation to the group to scale it out of sight
  changeBallScale(ball);
};

/**
 * THREE animation
 * - rotates the overall group of spheres.
 */
const animate = () => {
  ball.rotation.x -= 0.005;
  ball.rotation.y -= 0.005;
};

/**
 * Render function, called manually at the end.
 */
const render = () => {
  // Internal THREE function that handles native animation (not Tween)
  requestAnimationFrame(render);
  animate();
  renderer.render(scene, camera);
};

fillScene();
render();
