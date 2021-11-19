import {
  buildProgramFromSources,
  loadShadersFromURLS,
  setupWebGL,
} from "../../libs/utils.js";
import { ortho, lookAt, flatten } from "../../libs/MV.js";
import {
  modelView,
  loadMatrix,
  multMatrix,
  multRotationY,
  multScale,
  pushMatrix,
  popMatrix,
  multTranslation,
  multRotationZ,
} from "../../libs/stack.js";

import * as SPHERE from "../../libs/sphere.js";
import * as CUBE from "../../libs/cube.js";
import * as TORUS from "../../libs/torus.js";

/** @type WebGLRenderingContext */
let gl;

let time = 0; // Global simulation time in days
let speed = 1 / 60; // Speed (how many days added to time on each render pass
let mode; // Drawing mode (gl.LINES or gl.TRIANGLES)
let animation = true; // Animation is running

/* const PLANET_SCALE = 10; // scale that will apply to each planet and satellite

const SUN_DIAMETER = 1391900;
const SUN_DAY = 24.47; // At the equator. The poles are slower as the sun is gaseous

const MERCURY_DIAMETER = 4866 * PLANET_SCALE;
const MERCURY_ORBIT = 57950000 * ORBIT_SCALE;
const MERCURY_YEAR = 87.97;
const MERCURY_DAY = 58.646;

const VENUS_DIAMETER = 12106 * PLANET_SCALE;
const VENUS_ORBIT = 108110000 * ORBIT_SCALE;
const VENUS_YEAR = 224.7;
const VENUS_DAY = 243.018;

const EARTH_DIAMETER = 12742 * PLANET_SCALE;

const EARTH_YEAR = 365.26;
const EARTH_DAY = 0.99726968;

const MOON_DIAMETER = 3474 * PLANET_SCALE;
const MOON_ORBIT = 363396 * ORBIT_SCALE;
const MOON_YEAR = 28;
const MOON_DAY = 0;
*/

const VP_DISTANCE = 2;

function setup(shaders) {
  let canvas = document.getElementById("gl-canvas");
  let aspect = canvas.width / canvas.height;

  gl = setupWebGL(canvas);

  let program = buildProgramFromSources(
    gl,
    shaders["shader.vert"],
    shaders["shader.frag"]
  );

  let mProjection = ortho(
    -VP_DISTANCE * aspect,
    VP_DISTANCE * aspect,
    -VP_DISTANCE,
    VP_DISTANCE,
    -3 * VP_DISTANCE,
    3 * VP_DISTANCE
  );

  mode = gl.TRIANGLES;

  resize_canvas();
  window.addEventListener("resize", resize_canvas);

  document.onkeydown = function (event) {
    switch (event.key) {
      case "w":
        mode = gl.LINES;
        break;
      case "s":
        mode = gl.TRIANGLES;
        break;
      case "p":
        animation = !animation;
        break;
      case "+":
        if (animation) speed *= 1.1;
        break;
      case "-":
        if (animation) speed /= 1.1;
        break;
    }
  };

  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  SPHERE.init(gl);
  CUBE.init(gl);
  TORUS.init(gl);

  gl.enable(gl.DEPTH_TEST); // Enables Z-buffer depth test

  window.requestAnimationFrame(render);

  function resize_canvas(event) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    aspect = canvas.width / canvas.height;

    gl.viewport(0, 0, canvas.width, canvas.height);
    mProjection = ortho(
      -VP_DISTANCE * aspect,
      VP_DISTANCE * aspect,
      -VP_DISTANCE,
      VP_DISTANCE,
      -3 * VP_DISTANCE,
      3 * VP_DISTANCE
    );
  }

  function uploadModelView() {
    gl.uniformMatrix4fv(
      gl.getUniformLocation(program, "mModelView"),
      false,
      flatten(modelView())
    );
  }

  function floor() {
    for (let x = -10; x <= 20; x += 0.5) {
      for (let z = -10; z <= 20; z += 0.5) {
        pushMatrix();
        multTranslation([x, -0.15 / 2, z]);
        multScale([1, 0.15, 1]);
        uploadModelView();
        CUBE.draw(gl, program, mode);
        popMatrix();
      }
    }
  }

  function wheels() {
    multTranslation([0, 0, 1.3 / 2 + 0.1]);
    multScale([0.5, 0.5, 0.5]);
    multRotationY(90);
    multRotationZ(90);
    uploadModelView();
    TORUS.draw(gl, program, mode);
  }

  function tank() {
    multScale([2, 1 / 2, 1.3])
    uploadModelView();
    CUBE.draw(gl, program, mode);
  }

  function render() {
    if (animation) time += speed;
    window.requestAnimationFrame(render);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(program);

    gl.uniformMatrix4fv(
      gl.getUniformLocation(program, "mProjection"),
      false,
      flatten(mProjection)
    );

    loadMatrix(lookAt([VP_DISTANCE, VP_DISTANCE, VP_DISTANCE], [0, 0, 0], [0, 1, 0]));

    pushMatrix();
    {
      /* floor(); */
    }
    popMatrix();
    pushMatrix();
    {
      pushMatrix();
      tank();
      popMatrix();
      pushMatrix();
      wheels();
      popMatrix();
    }
    popMatrix();
  }
}
const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then((shaders) => setup(shaders));

