import {
  buildProgramFromSources,
  loadShadersFromURLS,
  setupWebGL,
} from "../../libs/utils.js";
import {
  ortho,
  lookAt,
  flatten
} from "../../libs/MV.js";
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
  multRotationX,
} from "../../libs/stack.js";

import * as SPHERE from "../../libs/sphere.js";
import * as CUBE from "../../libs/cube.js";
import * as TORUS from "../../libs/torus.js";
import * as CYLINDER from "../../libs/cylinder.js";
import * as PYRAMID from "../../libs/pyramid.js";
import * as PRISM from "../../libs/prism.js";

/** @type WebGLRenderingContext */
let gl;

let time = 0; // Global simulation time in days
let speed = 1 / 60; // Speed (how many days added to time on each render pass
let mode; // Drawing mode (gl.LINES or gl.TRIANGLES)
let animation = true; // Animation is running
let view;

let VP_DISTANCE = 4;
const TORUS_RADIUS = 0.7;

// FLOOR
const HEIGHT_FLOOR = 0.15;

// WHEELS
let rotateWheels = 0;
const WHEELS_ROTATION_ANGLE = 3;
const WHEELS_RIGHT_OF_TANK = 1.3 / 2 + 0.1;
const WHEELS_LEFT_OF_TANK = -1.3 / 2 - 0.1;
const WHEELS_HEIGHT_FROM_TANK = 0.1;
const FIRST_ROW_WHEELS = 0.9;
const SECOND_ROW_WHEELS = 0.3;
const THIRD_ROW_WHEELS = -0.3;
const FOURTH_ROW_WHEELS = -0.9;

// CANNON
let rotateCannon;
const CANNON_ROTATION_ANGLE = 1;

// VIEWS
const FRONT_VIEW  = lookAt([1, 0, 0], [0, 0, 0], [0, 1, 0]);
const TOP_VIEW = lookAt([0, 1, 0], [0, 0, 0], [0, 0, -1]);
const SIDE_VIEW = lookAt([0, 0, 1], [0, 0, 0], [0, 1, 0]);
const AXON_VIEW = lookAt([1, 1, 1], [0, 0, 0], [0, 1, 0]);


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

  mode = gl.LINES;
  view = AXON_VIEW;

  resize_canvas();
  window.addEventListener("resize", resize_canvas);

  document.onkeydown = function (event) {
    switch (event.key) {
      case "ArrowUp":
        rotateWheels -= WHEELS_ROTATION_ANGLE;
        break;
      case "ArrowDown":
        rotateWheels += WHEELS_ROTATION_ANGLE;
        break;
      case "w":
        rotateCannon += CANNON_ROTATION_ANGLE ;
        break;
      case "W":
        mode = gl.LINES;
        break;
      case "s":
        rotateCannon += CANNON_ROTATION_ANGLE ;
        break;
      case "S":
        mode = gl.TRIANGLES;
        break;
      case "p":
        animation = !animation;
        break;
      case "+":
        VP_DISTANCE += 0.1;
        break;
      case "-":
        VP_DISTANCE -= 0.1;
        break;
      case '1':
        view = FRONT_VIEW;
        break;
      case '2':
        view = TOP_VIEW;
        break;
      case '3':
        view = SIDE_VIEW;
        break;
      case '4':
        view = AXON_VIEW;
        break;
    }
  };

  gl.clearColor(0.9, 0.7, 0.8, 1);

  SPHERE.init(gl);
  CUBE.init(gl);
  TORUS.init(gl);
  PYRAMID.init(gl);
  CYLINDER.init(gl);
  PRISM.init(gl);

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

  // CAMERAS, CHANGE THIS IN THE RENDER FUNCTION TO SEE THE TANK FROM
  // DIFFERENT VIEWS.
  /*
  function lookFromSideWhileFloating() {
    loadMatrix(lookAt([VP_DISTANCE, VP_DISTANCE, VP_DISTANCE], [0, 0, 0], [0, 1, 0]));
  }

  function lookFromFront() {
    loadMatrix(lookAt([0, 0, VP_DISTANCE], [0, 0, 0], [0, 1, 0]));
  }

  function lookFromBack() {
    loadMatrix(lookAt([0, 0, -VP_DISTANCE], [0, 0, 0], [0, 1, 0]));
  }

  function lookFromSideX() {
    loadMatrix(lookAt([VP_DISTANCE * 2, 0, 0], [0, 0, 0], [0, 1, 0]));
  }

  function lookFromSideNegativeX() {
    loadMatrix(lookAt([-VP_DISTANCE * 2, 0, 0], [0, 0, 0], [0, 1, 0]));
  }

  function lookFromSideXWhileFloating() {
    loadMatrix(lookAt([VP_DISTANCE, VP_DISTANCE, 0], [0, 0, 0], [0, 1, 0]));
  }

  function lookFromUP() {
    loadMatrix(lookAt([VP_DISTANCE, VP_DISTANCE, 0], [0, 0, 0], [0, -1, 0]));
  }
  */

  // This function takes an array of 3 elements and activates the color in the
  // fragment shader
  function activateColor(color) {
    let uColor = gl.getUniformLocation(program, "fColor");
    gl.uniform3fv(uColor, flatten(color));
    let hasColor = gl.getUniformLocation(program, "hasColor");
    gl.uniform1f(hasColor, 1.0);
  }

  // This function deactivates the color
  function deactivateColor() {
    let hasColor = gl.getUniformLocation(program, "hasColor");
    gl.uniform1f(hasColor, 0.0);
  }

  // This function draws our floor in a 20x20 grid
  function floor() {
    for (let x = -10; x <= 10; x += 1) {
      for (let z = -10; z <= 10; z += 1) {
        // We save the matrix before drawing every cube so that we don't start
        // adding up the transformations
        pushMatrix();
        {
          // We scale down the height of each cube to make it a rectangle
          // we can use to make the floor
          multScale([1, HEIGHT_FLOOR, 1]);

          // Here we have the cubes at the centre of our scene.
          // We want to move this cube to the point (x, y, z) where
          // x and z were determined from the two for's we are in.
          // Our y is actually HALF the height of our rectangles because
          // we want the surface of our floor to be at y = 0
          multTranslation([x, 0, z]);

          uploadModelView();
          // Here we (attempt to) color the grid
          let colors;
          if ((x + z) % 2 == 0) {
            colors = [1, 0.8, 0.9];
          } else {
            colors = [1, 0.9, 1];
          }
          activateColor(colors);
          CUBE.draw(gl, program, mode);
          deactivateColor();
        }
        popMatrix();
      }
    }
  }

  // This function draws exactly one wheel at x = X and z = depth
  function wheel(X, depth) {
    // We place our wheel where it's supposed to be
    multTranslation([X, -WHEELS_HEIGHT_FROM_TANK, depth]);
    // We rotate the wheel according to it's movement (rotateWheels tells us
    // the angle that the wheel has moved so far)
    multRotationZ(rotateWheels);

    // These two rotations take our wheel from the XZ plane to the XY plane
    multRotationY(90);
    multRotationZ(90);

    // We push the matrix because we want to do different transformations
    // for the decoration of our wheels
    pushMatrix();
    {
      // Scale the wheel properly
      multScale([0.4, 0.4, 0.4]);
      uploadModelView();
      activateColor([0, 0, 0]);
      TORUS.draw(gl, program, mode);
      deactivateColor();
    }
    popMatrix();

    // Draw the decorations for each wheel
    wheelRims(depth);
  }

  // This function draws the interior of the wheel, or the rim of the wheel
  function wheelRims(depth) {
    pushMatrix();
    {
      multScale([0.3, 0.05, 0.05]);
      // We want to push out this sphere/cube? a bit so it's more noticeable
      multTranslation([0, depth / 4, 0]);
      uploadModelView();
      activateColor([0.1, 0.1, 0.1]);
      CUBE.draw(gl, program, mode);
      deactivateColor();
    }
    popMatrix();

    pushMatrix();
    {
      multScale([0.05, 0.05, 0.3]);

      // We want to push out this sphere/cube? a bit so it's more noticeable
      multTranslation([0, depth / 4, 0]);
      uploadModelView();
      activateColor([0.1, 0.1, 0.1]);
      CUBE.draw(gl, program, mode);
      deactivateColor();
    }
    popMatrix();

    pushMatrix();
    {
      // This is so the wheel isn't see through, we make a thing rectangle and
      // place it inside the wheel to hide the tank
      multScale([0.3, 0.01, 0.3]);
      uploadModelView();
      activateColor([0.2, 0.2, 0.2]);
      CUBE.draw(gl, program, mode);
      deactivateColor();
    }
    popMatrix();
    /*  multScale([0.15, 0.05, 0.15]);
    multTranslation([0, depth / 3, 0]);
    uploadModelView();
    CUBE.draw(gl, program, mode); */
  }

  // This function draws the wheels according to what side of the tank they
  // should be.
  function drawWheels(ORIENTATION) {
    pushMatrix();
    wheel(FOURTH_ROW_WHEELS, ORIENTATION);
    popMatrix();
    pushMatrix();
    wheel(THIRD_ROW_WHEELS, ORIENTATION);
    popMatrix();
    pushMatrix();
    wheel(SECOND_ROW_WHEELS, ORIENTATION);
    popMatrix();
    wheel(FIRST_ROW_WHEELS, ORIENTATION);
  }

  // This function draws both sides of the wheels
  function wheels() {
    pushMatrix();
    {
      drawWheels(WHEELS_LEFT_OF_TANK);
    }
    popMatrix();
    drawWheels(WHEELS_RIGHT_OF_TANK);
  }

  // This function draws the rectangle that will act as the centre of our
  // tank and where will connect all of our parts
  function tank() {
    // MAIN CUBE
    pushMatrix();
    {
      multScale([2.5, 0.5, 1.35]);

      uploadModelView();
      activateColor([0.8, 0.3, 0.4]);
      CUBE.draw(gl, program, mode);
      deactivateColor();
    }
    popMatrix();

    // POINTY SIDES
    pushMatrix();
    {
      multScale([0.5, 0.5/2, 1.7]);
      multRotationX(90);
      multRotationZ(90);
      multTranslation([0, 3, 0.5]);

      uploadModelView();
      activateColor([0.9, 0.4, 0.5]);
      PRISM.draw(gl, program, mode);
      deactivateColor();
    }
    popMatrix();
    pushMatrix();
    {
      multScale([0.5, 0.5/2, 1.7]);
      multRotationX(-90);
      multRotationZ(90);
      multTranslation([0, 3, 0.5]);

      uploadModelView();
      activateColor([1, 0.5, 0.6]);
      PRISM.draw(gl, program, mode);
      deactivateColor();
    }
    popMatrix();
    pushMatrix();
    {
      multScale([0.5, 0.5/2, 1.7]);
      multRotationX(90);
      multRotationZ(-90);
      multRotationY(180);
      multTranslation([0, 3, 0.5]);

      uploadModelView();
      activateColor([1, 0.5, 0.6]);
      PRISM.draw(gl, program, mode);
      deactivateColor();
    }
    popMatrix();
    pushMatrix();
    {
      multScale([0.5, 0.5/2, 1.7]);
      multRotationX(-90);
      multRotationZ(-90);
      multRotationY(-180);
      multTranslation([0, 3, 0.5]);

      uploadModelView();
      activateColor([0.9, 0.4, 0.5]);
      PRISM.draw(gl, program, mode);
      deactivateColor();
    }
    popMatrix();
    {
      multScale([0.5, 0.5/2, 1.7]);
      multRotationX(-90);
      multRotationZ(-90);
      multRotationY(-180);
      multTranslation([0, 3, 0.5]);

      uploadModelView();
      activateColor([0.9, 0.4, 0.5]);
      PRISM.draw(gl, program, mode);
      deactivateColor();
    }
    popMatrix();


    // WHEEL COVERS
    pushMatrix();
    {
      multTranslation([0, 0.25/2, 0.85]);
      multScale([2.5, 0.25, 0]);

      uploadModelView();
      activateColor([1, 0.5, 0.6]);
      CUBE.draw(gl, program, mode);
      deactivateColor();
    }
    popMatrix();
    pushMatrix();
    {
      multTranslation([0, 0.25/2, -0.85]);
      multScale([2.5, 0.25, 0]);

      uploadModelView();
      activateColor([1, 0.5, 0.6]);
      CUBE.draw(gl, program, mode);
      deactivateColor();
    }
    popMatrix();
    pushMatrix();
    {
      multTranslation([0, -0.25/2, 0.85]);
      multScale([2.5, 0.25, 0]);

      uploadModelView();
      activateColor([0.9, 0.4, 0.5]);
      CUBE.draw(gl, program, mode);
      deactivateColor();
    }
    popMatrix();
    pushMatrix();
    {
      multTranslation([0, -0.25/2, -0.85]);
      multScale([2.5, 0.25, 0]);

      uploadModelView();
      activateColor([0.9, 0.4, 0.5]);
      CUBE.draw(gl, program, mode);
      deactivateColor();
    }
    popMatrix();


    // SLANTED EDGES
    pushMatrix();
    {
      multScale([2.5, 0.5, 1.7]);
      multTranslation([0, 1, 0]);

      uploadModelView();
      activateColor([1, 0.55, 0.65]);
      PYRAMID.draw(gl, program, mode);
      deactivateColor();
    }
    popMatrix();

    // TOP PLATFORM
    pushMatrix();
    {
      multScale([2, 0.25 , 1]);
      multTranslation([0, 2 - 0.1, 0])

      uploadModelView();
      activateColor([1, 0.6, 0.7]);
      CUBE.draw(gl, program, mode);
      deactivateColor();
    }
    popMatrix();
    pushMatrix();
    {
      multTranslation([0, 0.6, 0]);
      multScale([2, 0.009 , 1]);


      uploadModelView();
      activateColor([1, 0.65, 0.75]);
      CUBE.draw(gl, program, mode);
      deactivateColor();
    }
    popMatrix();
    pushMatrix();
    {
      multTranslation([1+0.009, 0.5-0.01, 0]);
      multScale([0.009, 0.25 , 1]);


      uploadModelView();
      activateColor([1, 0.7, 0.8]);
      CUBE.draw(gl, program, mode);
      deactivateColor();
    }
    popMatrix();

    top();
  }

  function top() {
    // SHOOTER RIM
    pushMatrix();
    {
      multScale([1.25, 0.1, 0.8]);
      multTranslation([0, 3.25, 0]);
      multTranslation([0, 3.25, 0]);

      uploadModelView();
      activateColor([1, 0.7, 0.9]);
      CYLINDER.draw(gl, program, mode);
      deactivateColor();
    }
    popMatrix();
    // CABIN
    pushMatrix();
    {
      multScale([1.05, 0.4, 0.6]);
      multTranslation([0, 2, 0]);

      uploadModelView();
      activateColor([0.9, 0.4, 0.5]);
      CYLINDER.draw(gl, program, mode);
      deactivateColor();
    }
    popMatrix();
    pushMatrix();
    {
      multTranslation([0, 1+(0.009/2), 0]);
      multScale([1.05, 0.009, 0.6]);


      uploadModelView();
      activateColor([0.95, 0.45, 0.55]);
      CYLINDER.draw(gl, program, mode);
      deactivateColor();
    }
    popMatrix();

    heart();

    cannon();
  }

  function cannon() {
    pushMatrix(); // BASE
    {
      multTranslation([0.5, 0.8, 0]);
      multRotationX(90);
      multRotationZ(90);
      multScale([0.15, 0.5, 0.15]);

      uploadModelView();
      activateColor([0.8, 0.3, 0.4]);
      CYLINDER.draw(gl, program, mode);
      deactivateColor();
    }
    popMatrix();
    pushMatrix(); // SHADOW BASE
    {
      multTranslation([0.75+(0.009/2), 0.8, 0]);
      multRotationX(90);
      multRotationZ(90);
      multScale([0.15, 0.009, 0.15]);

      uploadModelView();
      activateColor([0.6, 0.1, 0.2]);
      CYLINDER.draw(gl, program, mode);
      deactivateColor();
    }
    popMatrix();
    pushMatrix();  // PIPE
    {
      multTranslation([1, 0.8, 0]);
      multRotationX(90);
      multRotationZ(90);
      multScale([0.1, 1.5, 0.1]);

      uploadModelView();
      activateColor([0.7, 0.2, 0.3]);
      CYLINDER.draw(gl, program, mode);
      deactivateColor();
    }
    popMatrix();
    pushMatrix();  // MUZZLE
    {
      multTranslation([1.5 + (0.25/2), 0.8, 0]);
      multRotationX(90);
      multRotationZ(90);
      multScale([0.125, 0.25, 0.125]);

      uploadModelView();
      activateColor([0.8, 0.3, 0.4]);
      CYLINDER.draw(gl, program, mode);
      deactivateColor();
    }
    popMatrix();
    pushMatrix(); // HOLE
    {
      multTranslation([1.75 + (0.009/2), 0.8, 0]);
      multRotationX(90);
      multRotationZ(90);
      multScale([0.08, 0.009, 0.08]);

      uploadModelView();
      activateColor([0.2, 0.2, 0.2]);
      CYLINDER.draw(gl, program, mode);
      deactivateColor();
    }
    popMatrix();
  }

  function heart() {
    pushMatrix();
    {
      multScale([0.15, 0.05, 0.15]);
      multTranslation([-0.5, 10.25*2, 0.5]);

      uploadModelView();
      activateColor([1, 0.7, 0.9]);
      CYLINDER.draw(gl, program, mode);
      deactivateColor();
    }
    popMatrix();
    pushMatrix();
    {
      multScale([0.15, 0.05, 0.15]);
      multTranslation([-0.5, 10.25*2, -0.5]);

      uploadModelView();
      activateColor([1, 0.7, 0.9]);
      CYLINDER.draw(gl, program, mode);
      deactivateColor();
    }
    popMatrix();
    pushMatrix();
    {
      multScale([0.15, 0.05, 0.15]);
      multRotationY(45);
      multTranslation([0, 10.25*2, 0]);

      uploadModelView();
      activateColor([1, 0.7, 0.9]);
      CUBE.draw(gl, program, mode);
      deactivateColor();
    }
    popMatrix();
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

    // CAMERA SETTING
    loadMatrix(view);

    // We know that the distance that a wheel travels after 360 degrees
    // is 2 * pi * radius, so if we want to know how much it travels with
    // rotateWheels degrees we need to turn that into radians multiply it
    // by the radius of our wheels. This isn't completely accurate because
    // actually we've shrunk our wheels and therefore the radius has also
    // changed.
    let debug = -((rotateWheels * Math.PI) / 180) * TORUS_RADIUS;
    // This moves our tank forward or backward, according to the distance
    // traveled and also places the base of it, aka the wheels, above the

    floor();
    multTranslation([debug, WHEELS_HEIGHT_FROM_TANK + TORUS_RADIUS / 2, 0]);
    pushMatrix();
      tank();
    popMatrix();
    wheels();

    /*pushMatrix();
    {
      uploadModelView();
      activateColor([1, 0, 0]);
      CYLINDER.draw(gl, program, mode);
      deactivateColor();
    }
    popMatrix();*/

  }
}
const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then((shaders) => setup(shaders));
