 import {invert_rotor, matrix_mul_vec, make_rotation_rotor, rotor_multiply, normalize_vec_or_bivec, rotor_to_matrix, matrix_multiply, make_scale_matrix, make_translation_matrix, matrix_list_multiply, Rotor} from "./math_stuff.js";

import {FractalBrownianMotion} from "./perlin_noise.js";

import {AndyScene} from "./webgl_stuff.js";

window.onload = main;

const WORLD_X_SIZE = 32;
const WORLD_Y_SIZE = 16;
const WORLD_Z_SIZE = 32;

let scene: AndyScene;

let global_rotor: Rotor = make_rotation_rotor(0.5, [1, 0, 0]);
let d_theta = 0.077;

let mouse_old_x: number | null = null;
let mouse_old_y: number | null = null;
let mouse_dx = 0.0;
let mouse_dy = 0.0;

let camera_pos = [WORLD_X_SIZE / 2, WORLD_Y_SIZE , WORLD_Z_SIZE / 2];

type BlockType = "dirt" | "air";

let water_level = 2;
let world_blocks: BlockType[][][] =
  new Array(WORLD_Z_SIZE).fill(null).map(() => new Array(WORLD_Y_SIZE).fill(null).map(() => new Array(WORLD_X_SIZE).fill("air")));

async function main() {
  let canvas: HTMLCanvasElement = document.getElementById("andy_canvas") as HTMLCanvasElement;

  let vertex_src: string = await (await fetch('shaders/shader.vert')).text();
  let fragment_src: string = await (await fetch('shaders/shader.frag')).text();
  
  scene = new AndyScene(canvas, vertex_src, fragment_src);
  await scene.load_texture("textures/dirt.png", scene.gl.TEXTURE0);
  await scene.load_texture("textures/grass.jpg", scene.gl.TEXTURE1);
  await scene.load_texture("textures/sky.jpg", scene.gl.TEXTURE2);

  addUiCallbacks();

  for(let z = 0; z < WORLD_Z_SIZE; z++){
    for(let x = 0; x < WORLD_X_SIZE; x++){
      let height = Math.floor(FractalBrownianMotion((x/WORLD_X_SIZE) * 256.0, (z/WORLD_Z_SIZE) * 256.0, 3) * WORLD_Y_SIZE);

      height = Math.min(height, WORLD_Y_SIZE);//sometimes it goes too high idk why
      
      for(let i = 0; i < height; i++){
	world_blocks[z][i][x] = "dirt";
      }
    }
  }
  

  let animation_loop = (timestamp_milis: number) => {
    render(timestamp_milis);
    requestAnimationFrame(animation_loop);
  };
  requestAnimationFrame(animation_loop);
}

function addUiCallbacks() {
  let canvas: HTMLCanvasElement = document.getElementById("andy_canvas") as HTMLCanvasElement;

  canvas.addEventListener("mousedown", function (event) {
    
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

  
  canvas.addEventListener("mousemove", function (event) {
    if ((event.buttons & 1) != 1) {
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


  document.addEventListener("keydown", function (event){
    let rot_mat = rotor_to_matrix(invert_rotor(global_rotor));
    let camera_forward = matrix_mul_vec(rot_mat, [0, 0, -1]);
    let camera_right = matrix_mul_vec(rot_mat, [1, 0, 0]);
    if(event.code == "KeyW"){
      camera_pos[0] += camera_forward[0] * 0.5;
      camera_pos[1] += camera_forward[1] * 0.5;
      camera_pos[2] += camera_forward[2] * 0.5;
    }
    if(event.code == "KeyS"){
      camera_pos[0] -= camera_forward[0] * 0.5;
      camera_pos[1] -= camera_forward[1] * 0.5;
      camera_pos[2] -= camera_forward[2] * 0.5;
    }
    if(event.code == "KeyD"){
      camera_pos[0] += camera_right[0] * 0.5;
      camera_pos[1] += camera_right[1] * 0.5;
      camera_pos[2] += camera_right[2] * 0.5;
    }
    if(event.code == "KeyA"){
      camera_pos[0] -= camera_right[0] * 0.5;
      camera_pos[1] -= camera_right[1] * 0.5;
      camera_pos[2] -= camera_right[2] * 0.5;
    }
    if(event.code == "KeyE"){
      global_rotor = rotor_multiply(
	make_rotation_rotor(
	  0.1,
	  normalize_vec_or_bivec([0, 1, 0]),
	),
	global_rotor,
      );
    }
    if(event.code == "KeyQ"){
      global_rotor = rotor_multiply(
	make_rotation_rotor(
	  -0.1,
	  normalize_vec_or_bivec([0, 1, 0]),
	),
	global_rotor,
      );
    }
    if(event.code == "Space"){
      water_level = Math.min(WORLD_Y_SIZE-1, water_level + 1);
    }
    if(event.code == "KeyH"){
      water_level = Math.max(-1, water_level - 1);//-1 for no water
    }
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
    scene.u_CameraMatrix,
    matrix_list_multiply([rot_mat, make_scale_matrix(0.2, 0.2, 0.2), make_translation_matrix(-camera_pos[0], -camera_pos[1], -camera_pos[2])]),
  );

  scene.gl.uniform4fv(scene.u_Color, new Float32Array([0.0, 0.5, 0.5, 0.5]));

  for(let z = 0; z < WORLD_Z_SIZE; z++){
    for(let y = 0; y < WORLD_Y_SIZE; y++){
      for(let x = 0; x < WORLD_X_SIZE; x++){
	switch(world_blocks[z][y][x]){
	  case "air":
	    if(y == water_level){
	      scene.draw_plane(make_translation_matrix(x, y - 0.4, z), 0);
	    }
	    break;
	  case "dirt":
	    scene.draw_cube(make_translation_matrix(x, y, z), 1);
	    break;
	  default:
	    console.error("unknown block");
	}
      }
    }
  }

  
  let ground_matrix = matrix_multiply(
    make_translation_matrix(0, -0.5, 0),
    make_scale_matrix(WORLD_X_SIZE, 0.05, WORLD_Z_SIZE));
  scene.draw_cube(ground_matrix, 2);


  let sky_matrix = matrix_multiply(
    make_translation_matrix(0, -0.5, 0),
    make_scale_matrix(WORLD_X_SIZE, 50, WORLD_Z_SIZE));

  scene.draw_cube(sky_matrix, 3);
}
