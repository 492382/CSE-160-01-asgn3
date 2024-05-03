import {make_translation_matrix, make_rotation_rotor, rotor_multiply, normalize_vec_or_bivec, rotor_to_matrix, matrix_multiply, make_scale_matrix, matrix_list_multiply} from "./math_stuff.js";

window.onload = main;

let gl;
let program;
let u_GlobalMatrix;
let u_ModelMatrix;
let u_Color;
let a_Position;

let global_rotor = make_rotation_rotor(0, [0, 0, 1]);
let d_theta = 0.077;

let is_mouse_down = false;
let mouse_old_x = undefined;
let mouse_old_y = undefined;
let mouse_dx = 0.01;
let mouse_dy = 0.04;

let cube_buffer;
let circle_buffer;

function main() {
    let canvas = document.getElementById("andy_canvas");
    setupWebGL(canvas);
    connectVariablesToGLSL();
    addUiCallbacks();

    let animation_loop = (timestamp_milis) => {
	render(timestamp_milis);
	requestAnimationFrame(animation_loop);
    };
    requestAnimationFrame(animation_loop);
}

function addUiCallbacks() {
    let canvas = document.getElementById("andy_canvas");

    canvas.addEventListener("mousedown", function (event) {
	if (event.shiftKey) {
	    do_poke_animation = true;
	    setTimeout(() => {
		do_poke_animation = false;
	    }, 2000);
	}

	is_mouse_down = true;

	let x = event.clientX;
	let y = event.clientY;

	let rect = event.target.getBoundingClientRect();
	x = (x - rect.left - canvas.width / 2) / (canvas.width / 2);
	y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);

	mouse_old_x = x;
	mouse_old_y = y;
	mouse_dx = 0;
	mouse_dy = 0;
    });

    canvas.addEventListener("mouseup", function () {
	is_mouse_down = false;
    });

    canvas.addEventListener("mousemove", function (event) {
	if (!is_mouse_down) {
	    return;
	}
	let x = event.clientX;
	let y = event.clientY;

	let rect = event.target.getBoundingClientRect();
	x = (x - rect.left - canvas.width / 2) / (canvas.width / 2);
	y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);

	mouse_dx = x - mouse_old_x;
	mouse_dy = y - mouse_old_y;

	d_theta = Math.sqrt(mouse_dx * mouse_dx + mouse_dy * mouse_dy);

	mouse_old_x = x;
	mouse_old_y = y;
    });
}

function connectVariablesToGLSL() {
    u_GlobalMatrix = gl.getUniformLocation(program, "global_matrix");
    u_ModelMatrix = gl.getUniformLocation(program, "model_matrix");
    u_Color = gl.getUniformLocation(program, "color");
    a_Position = gl.getAttribLocation(program, "attribute_model_position");
}

function setupWebGL(canvas) {
    gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });

    //https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/By_example/Hello_GLSL
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, ANDY_VERTEX_SHADER_SOURCE);
    gl.compileShader(vertexShader);

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, ANDY_FRAGMENT_SHADER_SOURCE);
    gl.compileShader(fragmentShader);

    program = gl.createProgram();

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);

    gl.linkProgram(program);

    gl.detachShader(program, vertexShader);
    gl.detachShader(program, fragmentShader);

    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
	const linkErrLog = gl.getProgramInfoLog(program);
	console.error(
	    "Shader program did not link successfully. Error log: ",
	    linkErrLog,
	);
	return null;
    }

    let a_Position = gl.getAttribLocation(program, "attribute_model_position");
    gl.enableVertexAttribArray(a_Position);

    cube_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cube_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, CUBE_VERTS, gl.DYNAMIC_DRAW);

    let circle_verts = Array(NUM_CIRCLE_SEGMENTS + 1)
	.fill()
	.flatMap((_, index) => {
	    let radians = (index / NUM_CIRCLE_SEGMENTS) * TAU;
	    return [Math.cos(radians), Math.sin(radians), 0];
	});
    circle_verts.unshift(0, 0, 0);
    circle_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, circle_buffer);
    gl.bufferData(
	gl.ARRAY_BUFFER,
	new Float32Array(circle_verts),
	gl.DYNAMIC_DRAW,
    );

    gl.useProgram(program);

    gl.clearColor(0.2, 0.3, 0.5, 1.0);
    gl.enable(gl.DEPTH_TEST);
}

function render(_milis) {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (mouse_dx * mouse_dx + mouse_dy * mouse_dy > 0) {
	//negate the dy because on the canvas positive Y is down instead of up
	global_rotor = rotor_multiply(
	    make_rotation_rotor(
		d_theta,
		normalize_vec_or_bivec([mouse_dy, -mouse_dx, 0]),
	    ),
	    global_rotor,
	);
    }

    let rot_mat = rotor_to_matrix(global_rotor);
    set_matrix(
	u_GlobalMatrix,
	matrix_multiply(rot_mat, make_scale_matrix(0.2, 0.2, 0.2)),
    );

    gl.uniform4fv(u_Color, new Float32Array([0.0, 0.5, 0.5, 1.0]));
    let matrix = make_scale_matrix(1, 1, 11);
    draw_cube(matrix);
}


function draw_circle(model_matrix) {
    set_matrix(u_ModelMatrix, model_matrix);
    gl.bindBuffer(gl.ARRAY_BUFFER, circle_buffer);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLE_FAN, 0, NUM_CIRCLE_SEGMENTS + 2);
}

function draw_cube(model_matrix) {
    set_matrix(
	u_ModelMatrix,
	matrix_multiply(model_matrix, make_translation_matrix(-0.5, -0.5, -0.5)),
    );
    gl.bindBuffer(gl.ARRAY_BUFFER, cube_buffer);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, NUM_CUBE_VERTS);
}

function set_matrix(unif, matrix) {
    let flattened_matrix = Array(16)
	.fill()
	.map((_, index) => {
	    return matrix[index % 4][Math.trunc(index / 4)];
	});

    gl.uniformMatrix4fv(unif, false, flattened_matrix);
}

const CUBE_VERTS = new Float32Array([
    0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0,
    1.0, 1.0, 0.0,

    0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0,
    0.0, 1.0, 1.0,

    0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0,
    0.0, 0.0, 1.0,

    1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 0.0, 1.0, 0.0,
    1.0, 1.0, 0.0,

    1.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 0.0,
    0.0, 1.0, 1.0,

    1.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0,
    1.0, 1.0, 1.0,
]);

const NUM_CUBE_VERTS = CUBE_VERTS.length / 3;
let NUM_CIRCLE_SEGMENTS = 10;

let ANDY_VERTEX_SHADER_SOURCE = `
uniform mat4 global_matrix;
uniform mat4 model_matrix;
attribute vec3 attribute_model_position;
varying vec3 model_pos;
varying vec3 world_pos;
void main() {
gl_Position = global_matrix * model_matrix * vec4(attribute_model_position, 1.0);
world_pos = vec3(global_matrix * model_matrix * vec4(attribute_model_position, 1.0));
model_pos = attribute_model_position;
}`;

let ANDY_FRAGMENT_SHADER_SOURCE = `
precision mediump float;
uniform vec4 color;
varying vec3 world_pos;
varying vec3 model_pos;
void main() {
vec4 skin_color = mix(color, vec4(1.0, 1.0, 1.0, 1.0), clamp(model_pos.y/2.0, 0.0, 1.0));
gl_FragColor = mix(skin_color, vec4(0.0, 0.0, 0.0, 1.0), clamp(-world_pos.y*1.5, 0.0, 1.0));
}`;


let TAU = Math.PI * 2;
