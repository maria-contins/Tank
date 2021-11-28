import {
	buildProgramFromSources,
	loadShadersFromURLS,
	setupWebGL,
} from "../../libs/utils.js";
import {
	ortho,
	lookAt,
	flatten,
	inverse,
	scale,
	mult,
	normalMatrix,
	vec4,
	add,
} from "../../libs/MV.js";
import {
	modelView,
	loadMatrix,
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
let mView;

// VIEWS
const FRONT_VIEW = lookAt([1, 0, 0], [0, 0, 0], [0, 1, 0]);
const TOP_VIEW = lookAt([0, 1, 0], [0, 0, 0], [0, 0, -1]);
const SIDE_VIEW = lookAt([0, 0, 1], [0, 0, 0], [0, 1, 0]);
const AXON_VIEW = lookAt([1, 1, 1], [0, 0, 0], [0, 1, 0]);
let view; // Current view
let VP_DISTANCE = 4;

// FLOOR
const HEIGHT_FLOOR = 0.15;

// TANK
const TORUS_RADIUS = 0.7;
const TANK_WHEEL_RADIUS = 0.4;
const TANK_WHEELS_CROSS_LENGTH = 0.3;
const TANK_WHEELS_CROSS_WIDTH_HEIGHT = 0.05;
const TANK_LENGTH = 2.5;
const TANK_HEIGHT = 0.5;
const TANK_WIDTH = 1.35;
const TANK_OFFSET = TANK_HEIGHT / 2 + TANK_WHEEL_RADIUS * TORUS_RADIUS;
const BUMPER_HEIGHT = TANK_HEIGHT / 2;
const BUMPER_LENGTH = 0.5;
const BUMPER_TRANSLATION_LENGTH = TANK_LENGTH / 2 + BUMPER_LENGTH / 2;
const BUMPER_FLOATING_HEIGHT = BUMPER_HEIGHT / 2;
const SIDE_SKIRT_GAP = 0.175;
const SIDE_SKIRT_FLOATING_HEIGHT = TANK_HEIGHT / 4;
const SIDE_SKIRT_DISTANCE_FROM_TANK = TANK_WIDTH / 2 + SIDE_SKIRT_GAP;
const SLANTED_EDGES_HEIGHT = 0.6;
const SLANTED_EDGES_FLOATING_HEIGHT = TANK_HEIGHT / 2 + SLANTED_EDGES_HEIGHT / 2;
const SLANTED_EDGES_WIDTH = TANK_WIDTH + 2 * SIDE_SKIRT_GAP;
let distanceMoved;

// WHEELS
const WHEELS_ROTATION_ANGLE = 3;
const WHEELS_RIGHT_OF_TANK = TANK_WIDTH / 2 + SIDE_SKIRT_GAP / 2;
const WHEELS_LEFT_OF_TANK = -TANK_WIDTH / 2 - SIDE_SKIRT_GAP / 2;
const WHEELS_ORDER = [0.9, 0.3, -0.3, -0.9];
let rotateWheels = 0;

// CABIN
const CABIN_HEIGHT = 0.4;
const CABIN_LENGTH_RADIUS = 1.05;
const CABIN_WIDTH_RADIUS = 0.6;
const PLATFORM_LENGTH = 2;
const PLATFORM_HEIGHT = SLANTED_EDGES_HEIGHT - CABIN_HEIGHT / 2;
const PLATFORM_FLOATING_HEIGHT = SLANTED_EDGES_FLOATING_HEIGHT - (SLANTED_EDGES_HEIGHT - PLATFORM_HEIGHT) / 2;
const PLATFORM_WIDTH = 1;
const SHOOTER_RIM_RADIUS = 1;
const SHOOTER_RIM_HEIGHT = 0.1;
const SHOOTER_RIM_FLOATING_HEIGHT = PLATFORM_FLOATING_HEIGHT + PLATFORM_HEIGHT / 2 + SHOOTER_RIM_HEIGHT / 2;
const CABIN_FLOATING_HEIGHT = SHOOTER_RIM_FLOATING_HEIGHT + CABIN_HEIGHT / 2 + SHOOTER_RIM_HEIGHT / 2;
const HEART_RADIUS = 0.15;
const HEART_HEIGHT = 0.05;
const HEART_FLOATING_HEIGHT = CABIN_FLOATING_HEIGHT + CABIN_HEIGHT / 2 + HEART_HEIGHT / 2;
const HEART_DISTANCE_APART = 0.07;

// CANNON / PIPE
const CANNON_ROTATION_ANGLE_HORIZONTAL = 3;
const CANNON_ROTATION_ANGLE_VERTICAL = 1;
const CANNON_BASE_LENGTH = 0.5;
const CANNON_BASE_FLOATING_HEIGHT = CABIN_FLOATING_HEIGHT - 0.05;
const CANNON_PIPE_LENGTH = 0.7;
const CANNON_BASE_RADIUS = 0.15;
const CANNON_PIPE_RADIUS = 0.1;
const CANNON_PIPE_DISTANCE_FROM_CABIN = CANNON_BASE_LENGTH + CANNON_PIPE_LENGTH / 2;
const CANNON_MUZZLE_LENGTH = 0.25;
const CANNON_MUZZLE_DISTANCE_FROM_CABIN = CANNON_PIPE_DISTANCE_FROM_CABIN+ CANNON_PIPE_LENGTH/2+ CANNON_MUZZLE_LENGTH/2;
const CANNON_MUZZLE_RADIUS = 0.125;
const CANNON_HOLE_DISTANCE_FROM_CABIN = CANNON_MUZZLE_DISTANCE_FROM_CABIN + CANNON_MUZZLE_LENGTH / 2;
const CANNON_HOLE_RADIUS = 0.08;
const CANNON_HOLE_LENGTH = 0.009;
const MAX_ANGLE = 30;
const MIN_ANGLE = -10;
let rotateCannonHorizontal = 0;
let rotateCannonVertical = 0;

// COLOR ARRAYS
const DARK_PINK_COLOR = [0.9, 0.4, 0.5];
const LIGHT_PINK_COLOR = [1, 0.5, 0.6];
const LIGHTER_PINK = [1, 0.55, 0.65];
const EVEN_LIGHTER_PINK = [1, 0.6, 0.7];
const ACTUAL_PINK = [1, 0.7, 0.9];
const IDONTKNOW_PINK = [0.8, 0.3, 0.4];

// BULLET
const DELTATIME = 1 / 60;
const BULLET_SPEED = 20;
let bullets = [];
let bulletKey = false;

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
			case "a":
				rotateCannonHorizontal += CANNON_ROTATION_ANGLE_HORIZONTAL;
				rotateCannonHorizontal = rotateCannonHorizontal % 360;
				break;
			case "w":
				if (rotateCannonVertical < MAX_ANGLE) {
					rotateCannonVertical += CANNON_ROTATION_ANGLE_VERTICAL;
					rotateCannonVertical = rotateCannonVertical % 360;
				}
				console.log(rotateCannonVertical);
				break;
			case "W":
				mode = gl.LINES;
				break;
			case "d":
				rotateCannonHorizontal -= CANNON_ROTATION_ANGLE_HORIZONTAL;
				rotateCannonHorizontal = rotateCannonHorizontal % 360;
				break;
			case "s":
				if (rotateCannonVertical > MIN_ANGLE) {
					rotateCannonVertical -= CANNON_ROTATION_ANGLE_VERTICAL;
					rotateCannonVertical = rotateCannonVertical % 360;
				}
				break;
			case "S":
				mode = gl.TRIANGLES;
				break;
			case "p":
				animation = !animation;
				break;
			case "-":
				VP_DISTANCE += 0.5;
				break;
			case "+":
				VP_DISTANCE -= 0.5;
				break;
			case "1":
				view = FRONT_VIEW;
				break;
			case "2":
				view = TOP_VIEW;
				break;
			case "3":
				view = SIDE_VIEW;
				break;
			case "4":
				view = AXON_VIEW;
				break;
			case " ":
				bulletKey = true;
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
					// Here we have the cubes at the centre of our scene.
					// We want to move this cube to the point (x, y, z) where
					// x and z were determined from the two for's we are in.
					// Our y is actually HALF the height of our rectangles because
					// we want the surface of our floor to be at y = 0
					multTranslation([x, -HEIGHT_FLOOR / 2, z]);
					// We scale down the height of each cube to make it a rectangle
					// we can use to make the floor
					multScale([1, HEIGHT_FLOOR, 1]);

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

	function bumper(upordown, frontorback, rx, ry, rz, color) {
		multTranslation([
			frontorback * BUMPER_TRANSLATION_LENGTH,
			upordown * BUMPER_FLOATING_HEIGHT,
			0,
		]);
		multScale([BUMPER_LENGTH, BUMPER_HEIGHT, 1.7]);
		multRotationX(rx);
		multRotationZ(rz);
		if (ry != 0) {
			multRotationY(ry);
		}

		uploadModelView();
		activateColor(color);
		PRISM.draw(gl, program, mode);
		deactivateColor();
	}

	function sideSkirt(upordown, frontorback, color) {
		multTranslation([
			0,
			upordown * SIDE_SKIRT_FLOATING_HEIGHT,
			frontorback * SIDE_SKIRT_DISTANCE_FROM_TANK,
		]);
		multScale([TANK_LENGTH, TANK_HEIGHT / 2, 0]);

		uploadModelView();
		activateColor(color);
		CUBE.draw(gl, program, mode);
		deactivateColor();
	}

	// tank and where will connect all of our parts
	function tank() {
		pushMatrix();
		{
			bumper(-1, -1, 90, 0, 90, DARK_PINK_COLOR);
		}
		popMatrix();
		pushMatrix();
		{
			bumper(1, -1, -90, 0, 90, LIGHT_PINK_COLOR);
		}
		popMatrix();
		pushMatrix();
		{
			bumper(1, 1, 90, 180, -90, LIGHT_PINK_COLOR);
		}
		popMatrix();
		pushMatrix();
		{
			bumper(-1, 1, -90, -180, -90, DARK_PINK_COLOR);
		}
		popMatrix();

		// WHEEL COVERS
		pushMatrix();
		{
			sideSkirt(1, 1, LIGHT_PINK_COLOR);
		}
		popMatrix();
		pushMatrix();
		{
			sideSkirt(1, -1, LIGHT_PINK_COLOR);
		}
		popMatrix();
		pushMatrix();
		{
			sideSkirt(-1, 1, DARK_PINK_COLOR);
		}
		popMatrix();
		pushMatrix();
		{
			sideSkirt(-1, -1, DARK_PINK_COLOR);
		}
		popMatrix();

		// SLANTED EDGES
		pushMatrix();
		{
			multTranslation([0, SLANTED_EDGES_FLOATING_HEIGHT, 0]);
			multScale([TANK_LENGTH, SLANTED_EDGES_HEIGHT, SLANTED_EDGES_WIDTH]);

			uploadModelView();
			activateColor(LIGHTER_PINK);
			PYRAMID.draw(gl, program, mode);
			deactivateColor();
		}
		popMatrix();

		// TOP PLATFORM
		pushMatrix();
		{
			multTranslation([0, PLATFORM_FLOATING_HEIGHT, 0]);
			multScale([PLATFORM_LENGTH, PLATFORM_HEIGHT, PLATFORM_WIDTH]);

			uploadModelView();
			activateColor(EVEN_LIGHTER_PINK);
			CUBE.draw(gl, program, mode);
			deactivateColor();
		}
		popMatrix();
		/*
            pushMatrix();
            {
                multTranslation([0, 0.6, 0]);
                multScale([2, 0.009, 1]);

                uploadModelView();
                activateColor([1, 0.65, 0.75]);
                CUBE.draw(gl, program, mode);
                deactivateColor();
            }
            popMatrix(); */

		/* pushMatrix();
            {
                multTranslation([1 + 0.009, 0.5 - 0.01, 0]);
                multScale([0.009, 0.25, 1]);

                uploadModelView();
                activateColor([1, 0.7, 0.8]);
                CUBE.draw(gl, program, mode);
                deactivateColor();
            }
            popMatrix(); */

		pushMatrix();
		{
			multRotationY(rotateCannonHorizontal);

			top();
		}
		popMatrix();
	}

	function top() {
		// SHOOTER RIM
		pushMatrix();
		{
			multTranslation([0, SHOOTER_RIM_FLOATING_HEIGHT, 0]);
			multScale([SHOOTER_RIM_RADIUS, SHOOTER_RIM_HEIGHT, SHOOTER_RIM_RADIUS]);

			uploadModelView();
			activateColor(ACTUAL_PINK);
			CYLINDER.draw(gl, program, mode);
			deactivateColor();
		}
		popMatrix();
		// CABIN
		pushMatrix();
		{
			multTranslation([0, CABIN_FLOATING_HEIGHT, 0]);
			multScale([CABIN_LENGTH_RADIUS, CABIN_HEIGHT, CABIN_WIDTH_RADIUS]);

			uploadModelView();
			activateColor(DARK_PINK_COLOR);
			CYLINDER.draw(gl, program, mode);
			deactivateColor();
		}
		popMatrix();
		/* pushMatrix();
            {
                multTranslation([0, 1 + 0.009 / 2, 0]);
                multScale([1.05, 0.009, 0.6]);

                uploadModelView();
                activateColor([0.95, 0.45, 0.55]);
                CYLINDER.draw(gl, program, mode);
                deactivateColor();
            }
            popMatrix();*/

		heart();

		pushMatrix();
		{
			multTranslation([
				CABIN_LENGTH_RADIUS / 3,
				CANNON_BASE_FLOATING_HEIGHT,
				0,
			]);
			multRotationZ(rotateCannonVertical);
			cannon();
		}
		popMatrix();
	}

	function cannon() {
		pushMatrix(); // BASE
		{
			multTranslation([CANNON_BASE_LENGTH / 2, 0, 0]);
			multRotationY(90);
			multRotationX(90);
			multScale([CANNON_BASE_RADIUS, CANNON_BASE_LENGTH, CANNON_BASE_RADIUS]);

			uploadModelView();
			activateColor(IDONTKNOW_PINK);
			CYLINDER.draw(gl, program, mode);
			deactivateColor();
		}
		popMatrix();

		/* pushMatrix(); // SHADOW BASE
            {
                multTranslation([0.75 + 0.009 / 2, 0.8, 0]);
                multRotationX(90);
                multRotationZ(90);
                multScale([0.15, 0.009, 0.15]);

                uploadModelView();
                activateColor([0.6, 0.1, 0.2]);
                CYLINDER.draw(gl, program, mode);
                deactivateColor();
            }
            popMatrix(); */

		pushMatrix(); // PIPE
		{
			multTranslation([CANNON_PIPE_DISTANCE_FROM_CABIN, 0, 0]);

			multRotationY(90);
			multRotationX(90);
			multScale([CANNON_PIPE_RADIUS, CANNON_PIPE_LENGTH, CANNON_PIPE_RADIUS]);

			uploadModelView();
			activateColor([0.7, 0.2, 0.3]);
			CYLINDER.draw(gl, program, mode);
			deactivateColor();
		}
		popMatrix();
		pushMatrix(); // MUZZLE
		{
			multTranslation([CANNON_MUZZLE_DISTANCE_FROM_CABIN, 0, 0]);
			multRotationY(90);
			multRotationX(90);
			multScale([
				CANNON_MUZZLE_RADIUS,
				CANNON_MUZZLE_LENGTH,
				CANNON_MUZZLE_RADIUS,
			]);

			uploadModelView();
			activateColor(IDONTKNOW_PINK);
			CYLINDER.draw(gl, program, mode);
			deactivateColor();
		}
		popMatrix();
		pushMatrix(); // HOLE
		{
			multTranslation([CANNON_HOLE_DISTANCE_FROM_CABIN, 0, 0]);
			multRotationY(90);
			multRotationX(90);
			uploadModelView();
			
			if (bulletKey) {
				let model = mult(inverse(mView), modelView());
				let pos = vec4(0, 0, 0, 1);
				let vel = vec4(0, BULLET_SPEED, 0, 0);
				let posInitial = mult(model, pos);
				let velInitial = mult(normalMatrix(model), vel);

				bullets.push({ pos: posInitial, vel: velInitial });
				bulletKey = false;
			}

			multScale([CANNON_HOLE_RADIUS, CANNON_HOLE_LENGTH, CANNON_HOLE_RADIUS]);
			uploadModelView();

			activateColor([0.2, 0.2, 0.2]);
			CYLINDER.draw(gl, program, mode);
			deactivateColor();
		}
		popMatrix();
	}

	function drawBullets() {
		for (let bullet of bullets) {
			pushMatrix();
			
			let newPos = [0, 0, 0];
			if (bullet.pos[1] > 0.05) {
				let velocity = scale(DELTATIME, bullet.vel);
				let acceleration = scale(
					(1 / 2) * Math.pow(DELTATIME, 2),
					vec4(0, -40, 0, 0)
				);
				newPos = add(bullet.pos, add(velocity, acceleration));
				bullet.pos = newPos;
				bullet.vel = add(bullet.vel, scale(DELTATIME, vec4(0, -40, 0, 0)));
				multTranslation([newPos[0], newPos[1], newPos[2]]);
				multScale([0.1, 0.1, 0.1]);
				activateColor([0,0,0]);
				uploadModelView();
				SPHERE.draw(gl, program, mode);
			} else {
				bullets.splice(bullets.indexOf(bullet), 1);
			}
			popMatrix();
		}
	}

	function heart() {
		pushMatrix();
		{
			multTranslation([
				-HEART_DISTANCE_APART,
				HEART_FLOATING_HEIGHT,
				HEART_DISTANCE_APART,
			]);
			multScale([HEART_RADIUS, HEART_HEIGHT, HEART_RADIUS]);

			uploadModelView();
			activateColor(ACTUAL_PINK);
			CYLINDER.draw(gl, program, mode);
			deactivateColor();
		}
		popMatrix();
		pushMatrix();
		{
			multTranslation([
				-HEART_DISTANCE_APART,
				HEART_FLOATING_HEIGHT,
				-HEART_DISTANCE_APART,
			]);
			multScale([HEART_RADIUS, HEART_HEIGHT, HEART_RADIUS]);

			uploadModelView();
			activateColor(ACTUAL_PINK);
			CYLINDER.draw(gl, program, mode);
			deactivateColor();
		}
		popMatrix();
		pushMatrix();
		{
			multTranslation([0, HEART_FLOATING_HEIGHT, 0]);
			multRotationY(45);
			multScale([HEART_RADIUS, HEART_HEIGHT, HEART_RADIUS]);

			uploadModelView();
			activateColor(ACTUAL_PINK);
			CUBE.draw(gl, program, mode);
			deactivateColor();
		}
		popMatrix();
	}

	// This function draws exactly one wheel at x = X and z = depth
	function wheel(X, depth) {
		// We place our wheel where it's supposed to be
		multTranslation([X, -TANK_HEIGHT / 2, depth]);

		multRotationZ(rotateWheels);

		// These two rotations take our wheel from the XZ plane to the XY plane
		multRotationX(90);

		// We push the matrix because we want to do different transformations
		// for the decoration of our wheels
		pushMatrix();
		{
			// Scale the wheel properly
			multScale([TANK_WHEEL_RADIUS, TANK_WHEEL_RADIUS, TANK_WHEEL_RADIUS]);
			uploadModelView();
			activateColor([0, 0, 0]);
			TORUS.draw(gl, program, mode);
			deactivateColor();
		}
		popMatrix();
		// Draw the decorations for each wheel
		wheelRims(depth);
	}

	function wheelsCross(X, Y, Z) {
		multScale([X, Y, Z]);

		uploadModelView();
		activateColor([0.1, 0.1, 0.1]);
		CUBE.draw(gl, program, mode);
		deactivateColor();
	}

	// This function draws the interior of the wheel, or the rim of the wheel
	function wheelRims(depth) {
		pushMatrix();
		{
			wheelsCross(
				TANK_WHEELS_CROSS_LENGTH,
				TANK_WHEELS_CROSS_WIDTH_HEIGHT,
				TANK_WHEELS_CROSS_WIDTH_HEIGHT
			);
		}
		popMatrix();

		pushMatrix();
		{
			wheelsCross(
				TANK_WHEELS_CROSS_WIDTH_HEIGHT,
				TANK_WHEELS_CROSS_WIDTH_HEIGHT,
				TANK_WHEELS_CROSS_LENGTH
			);
		}
		popMatrix();

		pushMatrix();
		{
			// This is so the wheel isn't see through, we make a thing rectangle and
			// place it inside the wheel to hide the tank
			multScale([TANK_WHEEL_RADIUS, 0.01, TANK_WHEEL_RADIUS]);
			uploadModelView();
			activateColor([0.2, 0.2, 0.2]);
			CUBE.draw(gl, program, mode);
			deactivateColor();
		}
		popMatrix();
	}

	// This function draws the wheels according to what side of the tank they
	// should be.
	function drawWheels(ORIENTATION) {
		for (let order of WHEELS_ORDER) {
			pushMatrix();
			wheel(order, ORIENTATION);
			popMatrix();
			pushMatrix();
			axisWheels(order, ORIENTATION);
			popMatrix();
		}
	}

	function axisWheels(order, depth) {
		multTranslation([order, -TANK_HEIGHT / 2, depth / 2]);
		// We rotate the wheel according to it's movement (rotateWheels tells us
		// the angle that the wheel has moved so far)
		multRotationZ(rotateWheels);
		multRotationY(90);
		multScale([
			TANK_WIDTH / 2 + SIDE_SKIRT_GAP / 2,
			TANK_WHEEL_RADIUS / 2,
			TANK_WHEEL_RADIUS / 2,
		]);
		uploadModelView();
		activateColor(IDONTKNOW_PINK);
		CUBE.draw(gl, program, mode);
		deactivateColor();
	}

	// This function draws both sides of the wheels
	function wheels() {
		pushMatrix();
		{
			drawWheels(WHEELS_LEFT_OF_TANK);
		}
		popMatrix();
		pushMatrix();
		drawWheels(WHEELS_RIGHT_OF_TANK);
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

		mProjection = ortho(
			-VP_DISTANCE * aspect,
			VP_DISTANCE * aspect,
			-VP_DISTANCE,
			VP_DISTANCE,
			-3 * VP_DISTANCE,
			3 * VP_DISTANCE
		);

		// CAMERA SETTING
		loadMatrix(view);
		mView = modelView();

		// This moves our tank forward or backward, according to the distance
		// traveled and also places the base of it, aka the wheels, above the

		distanceMoved = -((rotateWheels * Math.PI) / 180) * TORUS_RADIUS;

		pushMatrix();
		{
			floor();
			multTranslation([distanceMoved, TANK_OFFSET, 0]);
			pushMatrix();
			tank();
			popMatrix();

			pushMatrix();
			wheels();
			popMatrix();
		}
		popMatrix();

		pushMatrix();
		drawBullets();
		popMatrix();
	}
}
const urls = ["shader.vert", "shader.frag"];
loadShadersFromURLS(urls).then((shaders) => setup(shaders));