import {make_rotation_rotor, rotor_multiply, normalize_vec_or_bivec, rotor_to_matrix, matrix_multiply, make_scale_matrix} from "./math_stuff.js";

import {AndyScene} from "./webgl_stuff.js";

window.onload = main;

let scene: AndyScene;

let global_rotor = make_rotation_rotor(0, [0, 0, 1]);
let d_theta = 0.077;



let is_mouse_down = false;
let mouse_old_x: number | null = null;
let mouse_old_y: number | null = null;
let mouse_dx = 0.01;
let mouse_dy = 0.04;

function main() {
  let canvas: HTMLCanvasElement = document.getElementById("andy_canvas") as HTMLCanvasElement;

  scene = new AndyScene(canvas, ANDY_VERTEX_SHADER_SOURCE, ANDY_FRAGMENT_SHADER_SOURCE);
  addUiCallbacks();

  let animation_loop = (timestamp_milis: number) => {
    render(timestamp_milis);
    requestAnimationFrame(animation_loop);
  };
  requestAnimationFrame(animation_loop);
}

function addUiCallbacks() {
  let canvas: HTMLCanvasElement = document.getElementById("andy_canvas") as HTMLCanvasElement;

  canvas.addEventListener("mousedown", function (event) {
    is_mouse_down = true;

    let x = event.clientX;
    let y = event.clientY;

    let rect = (event.target as HTMLElement).getBoundingClientRect();
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

    let rect = (event.target as HTMLElement).getBoundingClientRect();
    x = (x - rect.left - canvas.width / 2) / (canvas.width / 2);
    y = (canvas.height / 2 - (y - rect.top)) / (canvas.height / 2);

    mouse_dx = x - mouse_old_x;
    mouse_dy = y - mouse_old_y;

    d_theta = Math.sqrt(mouse_dx * mouse_dx + mouse_dy * mouse_dy);

    mouse_old_x = x;
    mouse_old_y = y;
  });
}

function render(_milis: number) {
  scene.gl.clear(scene.gl.COLOR_BUFFER_BIT | scene.gl.DEPTH_BUFFER_BIT);

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
  scene.set_matrix(
    scene.u_GlobalMatrix,
    matrix_multiply(rot_mat, make_scale_matrix(0.2, 0.2, 0.2)),
  );

  scene.gl.uniform4fv(scene.u_Color, new Float32Array([0.0, 0.5, 0.5, 1.0]));
  let matrix = make_scale_matrix(1, 1, 11);
  scene.draw_cube(matrix);
}







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


