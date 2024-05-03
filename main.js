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

let do_animation = true;
let do_poke_animation = false;

function main() {
  let canvas = document.getElementById("andy_canvas");
  setupWebGL(canvas);
  connectVariablesToGLSL();
  addUiCallbacks();

  let fps_counter = document.getElementById("fps_counter");
  let last_5_frame_times = [0, 0, 0, 0, 0];
  let animation_loop = (timestamp_milis) => {
    render(timestamp_milis);
    requestAnimationFrame(animation_loop);
    last_5_frame_times.shift();
    last_5_frame_times.push(timestamp_milis);

    let avg_milis_per_frame =
      last_5_frame_times.slice(1).reduce((total, time, index) => {
        return total + (time - last_5_frame_times[index]);
      }, 0) / 4;

    let avg_fps = 1000.0 / avg_milis_per_frame;

    fps_counter.innerText = `Avg fps in last 5 frames: ${avg_fps}`;
  };
  requestAnimationFrame(animation_loop);
}

function addUiCallbacks() {
  let radians_counter = document.getElementById("radians_counter");

  document
    .getElementById("angle_slider")
    .addEventListener("input", function (event) {
      let radians = parseFloat(event.target.value);
      radians_counter.innerText = radians;
      make_global_rotor_from_sliders();
    });
  document.getElementById("yz_input").addEventListener("input", function () {
    make_global_rotor_from_sliders();
  });
  document.getElementById("zx_input").addEventListener("input", function () {
    make_global_rotor_from_sliders();
  });
  document.getElementById("xy_input").addEventListener("input", function () {
    make_global_rotor_from_sliders();
  });

  let checkbox = document.getElementById("animation_checkbox");

  checkbox.addEventListener("input", function (event) {
    do_animation = event.target.checked;
  });

  SLIDER_IDS.forEach((elem_id) => {
    document.getElementById(elem_id).addEventListener("input", function () {
      checkbox.checked = false;
      do_animation = false;
    });
  });

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

function render(milis) {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  let animation_percent = (milis % 3000) / 3000;

  if (mouse_dx * mouse_dx + mouse_dy * mouse_dy > 0) {
    //negate the dy because on the canvas positive Y is down instead of up
    global_rotor = rotor_multiply(
      make_rotation_rotor(
        d_theta,
        normalize_vec_or_bivec([mouse_dy, -mouse_dx, 0]),
      ),
      global_rotor,
    );
    update_sliders();
  }

  let rot_mat = rotor_to_matrix(global_rotor);
  set_matrix(
    u_GlobalMatrix,
    matrix_multiply(rot_mat, make_scale_matrix(0.2, 0.2, 0.2)),
  );

  draw_animal(animation_percent);
}

function draw_animal(animation_percent) {
  let angles;
  if (do_animation) {
    angles = get_angles_animation(animation_percent);
    set_angle_sliders(angles);
  } else {
    angles = get_angles_sliders();
  }

  gl.uniform4fv(u_Color, new Float32Array([1.0, 0.5, 0.5, 1.0]));
  let body_matrix = draw_body(IDENTITY_MATRIX, angles[0]);

  let top_fin_matrix_1 = draw_top_fin_1(body_matrix, angles[1], angles[2]);
  let _top_fin_matrix_2 = draw_top_fin_2(
    top_fin_matrix_1,
    angles[3],
    angles[4],
  );

  let tail_matrix_1 = draw_tail_1(body_matrix, angles[5]);
  let tail_matrix_2 = draw_tail_2(tail_matrix_1, angles[6]);
  let _tail_matrix_3 = draw_tail_3(tail_matrix_2, angles[7]);

  let head_matrix = draw_head(body_matrix, angles[8]);
  let mouth_matrix_1 = draw_mouth_1(head_matrix);
  let _mouth_matrix_2 = draw_mouth_2(mouth_matrix_1);

  let _right_fin_matrix = draw_right_fin(body_matrix, angles[9], angles[10]);
  let _left_fin_matrix = draw_left_fin(body_matrix, angles[9], angles[10]);

  gl.uniform4fv(u_Color, new Float32Array([0.0, 0.0, 0.0, 1.0]));

  let _right_eye_matrix = draw_right_eye(head_matrix);
  let _left_eye_matrix = draw_left_eye(head_matrix);
}

function draw_right_eye(matrix_stack) {
  let everything_except_scale = matrix_list_multiply([
    matrix_stack,
    make_translation_matrix(0.2, 0.2, -0.41),
  ]);

  let matrix = matrix_multiply(
    everything_except_scale,
    make_scale_matrix(0.1, 0.1, 1),
  );

  draw_circle(matrix);

  return everything_except_scale;
}

function draw_left_eye(matrix_stack) {
  return draw_right_eye(
    matrix_multiply(make_scale_matrix(1, 1, -1), matrix_stack),
  );
}

function draw_right_fin(matrix_stack, angle1, angle2) {
  let everything_except_scale = matrix_list_multiply([
    matrix_stack,
    make_translation_matrix(0.8, -0.5, -0.5),
    rotor_to_matrix(
      rotor_multiply(
        make_rotation_rotor(angle1, [0, 0, 1]),
        make_rotation_rotor(angle2, [1, 0, 0]),
      ),
    ),
    make_translation_matrix(0, -0.5, 0),
  ]);

  let matrix = matrix_multiply(
    everything_except_scale,
    make_scale_matrix(0.3, 1, 0.08),
  );

  draw_cube(matrix);

  return everything_except_scale;
}

function draw_left_fin(matrix_stack, angle1, angle2) {
  return draw_right_fin(
    matrix_multiply(make_scale_matrix(1, 1, -1), matrix_stack),
    angle1,
    angle2,
  );
}

function draw_body(matrix_stack, angle) {
  let everything_except_scale = matrix_list_multiply([
    matrix_stack,
    rotor_to_matrix(make_rotation_rotor(angle, [0, 0, 1])),
  ]);

  let matrix = matrix_multiply(
    everything_except_scale,
    make_scale_matrix(2.5, 1, 1),
  );

  draw_cube(matrix);

  return everything_except_scale;
}

function draw_top_fin_1(matrix_stack, angle1, angle2) {
  let everything_except_scale = matrix_list_multiply([
    matrix_stack,
    make_translation_matrix(-0.7, 0.6, 0),
    rotor_to_matrix(
      rotor_multiply(
        make_rotation_rotor(angle1, [0, 0, 1]),
        make_rotation_rotor(angle2, [1, 0, 0]),
      ),
    ),
  ]);

  let matrix = matrix_multiply(
    everything_except_scale,
    make_scale_matrix(0.5, 0.5, 0.1),
  );

  draw_cube(matrix);

  return everything_except_scale;
}

function draw_top_fin_2(matrix_stack, angle1, angle2) {
  let everything_except_scale = matrix_list_multiply([
    matrix_stack,
    make_translation_matrix(-0.2, 0.4, 0),
    rotor_to_matrix(
      rotor_multiply(
        make_rotation_rotor(angle1, [0, 0, 1]),
        make_rotation_rotor(angle2, [1, 0, 0]),
      ),
    ),
  ]);

  let matrix = matrix_multiply(
    everything_except_scale,
    make_scale_matrix(0.2, 0.5, 0.08),
  );

  draw_cube(matrix);

  return everything_except_scale;
}

function draw_tail_1(matrix_stack, angle) {
  let everything_except_scale = matrix_list_multiply([
    matrix_stack,
    make_translation_matrix(-1.4, 0, 0),
    rotor_to_matrix(make_rotation_rotor(angle, [0, 0, 1])),
    make_translation_matrix(-0.5, 0, 0),
  ]);

  let matrix = matrix_multiply(
    everything_except_scale,
    make_scale_matrix(1.5, 0.6, 0.8),
  );

  draw_cube(matrix);

  return everything_except_scale;
}

function draw_tail_2(matrix_stack, angle) {
  let everything_except_scale = matrix_list_multiply([
    matrix_stack,
    make_translation_matrix(-0.7, 0, 0),
    rotor_to_matrix(make_rotation_rotor(angle, [0, 0, 1])),
    make_translation_matrix(-0.5, 0, 0),
  ]);

  let matrix = matrix_multiply(
    everything_except_scale,
    make_scale_matrix(1, 0.4, 0.6),
  );

  draw_cube(matrix);

  return everything_except_scale;
}

function draw_tail_3(matrix_stack, angle) {
  let everything_except_scale = matrix_list_multiply([
    matrix_stack,
    make_translation_matrix(-0.5, 0, 0),
    rotor_to_matrix(make_rotation_rotor(angle, [0, 0, 1])),
    make_translation_matrix(-0.5, 0, 0),
  ]);

  let matrix = matrix_multiply(
    everything_except_scale,
    make_scale_matrix(1, 0.2, 2),
  );

  draw_cube(matrix);

  return everything_except_scale;
}

function draw_head(matrix_stack, angle) {
  let everything_except_scale = matrix_list_multiply([
    matrix_stack,
    make_translation_matrix(1, 0, 0),
    rotor_to_matrix(make_rotation_rotor(angle, [0, 0, 1])),
    make_translation_matrix(0.5, 0, 0),
  ]);

  let matrix = matrix_multiply(
    everything_except_scale,
    make_scale_matrix(1, 0.8, 0.8),
  );

  draw_cube(matrix);

  return everything_except_scale;
}

function draw_mouth_1(matrix_stack) {
  let everything_except_scale = matrix_list_multiply([
    matrix_stack,
    make_translation_matrix(0.5, -0.1, 0),
  ]);

  let matrix = matrix_multiply(
    everything_except_scale,
    make_scale_matrix(0.8, 0.3, 0.4),
  );

  draw_cube(matrix);

  return everything_except_scale;
}

function draw_mouth_2(matrix_stack) {
  let everything_except_scale = matrix_list_multiply([
    matrix_stack,
    make_translation_matrix(0.3, 0, 0),
  ]);

  let matrix = matrix_multiply(
    everything_except_scale,
    make_scale_matrix(1, 0.2, 0.2),
  );

  draw_cube(matrix);

  return everything_except_scale;
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

function make_translation_matrix(dx, dy, dz) {
  return [
    [1.0, 0.0, 0.0, dx],
    [0.0, 1.0, 0.0, dy],
    [0.0, 0.0, 1.0, dz],
    [0.0, 0.0, 0.0, 1.0],
  ];
}

function make_scale_matrix(x, y, z) {
  return [
    [x, 0.0, 0.0, 0],
    [0.0, y, 0.0, 0],
    [0.0, 0.0, z, 0],
    [0.0, 0.0, 0.0, 1.0],
  ];
}

function normalize_vec_or_bivec(vec) {
  let magnitude = Math.sqrt(
    vec.map((x) => x * x).reduce((acc, x) => acc + x),
    0,
  );
  return vec.map((x) => x / magnitude);
}

function matrix_multiply(mat1, mat2) {
  return Array(4)
    .fill()
    .map((_, row) => {
      return Array(4)
        .fill()
        .map((_, col) => {
          let sum = 0;
          for (let i = 0; i < 4; i++) {
            sum += mat1[row][i] * mat2[i][col];
          }
          return sum;
        });
    });
}

function matrix_list_multiply(mats) {
  return mats.reduce((acc, next) => {
    return matrix_multiply(acc, next);
  }, IDENTITY_MATRIX);
}

function rotor_multiply([real1, bivector1], [real2, bivector2]) {
  let real =
    real1 * real2 -
    bivector1[0] * bivector2[0] -
    bivector1[1] * bivector2[1] -
    bivector1[2] * bivector2[2];
  let yz =
    real1 * bivector2[0] +
    bivector1[0] * real2 +
    bivector1[1] * bivector2[2] -
    bivector1[2] * bivector2[1];
  let zx =
    real1 * bivector2[1] +
    bivector1[1] * real2 +
    bivector1[2] * bivector2[0] -
    bivector1[0] * bivector2[2];
  let xy =
    real1 * bivector2[2] +
    bivector1[2] * real2 +
    bivector1[0] * bivector2[1] -
    bivector1[1] * bivector2[0];

  return [real, [yz, zx, xy]];
}

function make_rotation_rotor(radians, normalized_bivector_plane) {
  let real = Math.cos(radians / 2.0);
  let bivector = normalized_bivector_plane.map(
    (num) => Math.sin(radians / 2.0) * num,
  );

  return [real, bivector];
}

function rotor_to_matrix([real, bivector]) {
  let w = real;
  let yz = bivector[0];
  let zx = bivector[1];
  let xy = bivector[2];
  // https://gabormakesgames.com/blog_quats_to_matrix.html
  return [
    [
      w * w + yz * yz - zx * zx - xy * xy,
      2 * yz * zx - 2 * w * xy,
      2 * yz * xy + 2 * w * zx,
      0,
    ],
    [
      2 * yz * zx + 2 * w * xy,
      w * w - yz * yz + zx * zx - xy * xy,
      2 * zx * xy - 2 * w * yz,
      0,
    ],
    [
      2 * yz * xy - 2 * w * zx,
      2 * zx * xy + 2 * w * yz,
      w * w - yz * yz - zx * zx + xy * xy,
      0,
    ],
    [0, 0, 0, w * w + yz * yz + zx * zx + xy * xy],
  ];
}

function update_sliders() {
  let [real, bivector] = global_rotor;
  let angle = 2 * Math.acos(real);
  document.getElementById("angle_slider").value = angle;
  document.getElementById("radians_counter").innerText = angle;
  document.getElementById("yz_input").value = bivector[0] / Math.sin(angle / 2);
  document.getElementById("zx_input").value = bivector[1] / Math.sin(angle / 2);
  document.getElementById("xy_input").value = bivector[2] / Math.sin(angle / 2);
}

function make_global_rotor_from_sliders() {
  d_theta = 0;

  let global_rotation_angle = parseFloat(
    document.getElementById("angle_slider").value,
  );
  let yz = parseFloat(document.getElementById("yz_input").value);
  let zx = parseFloat(document.getElementById("zx_input").value);
  let xy = parseFloat(document.getElementById("xy_input").value);

  let global_rotation_plane = normalize_vec_or_bivec([yz, zx, xy]);
  global_rotor = make_rotation_rotor(
    global_rotation_angle,
    global_rotation_plane,
  );
}

function get_angles_animation(animation_percent) {
  if (do_poke_animation) {
    return [
      //body1
      Math.sin(animation_percent * 2 * TAU),
      //top fin 1
      Math.sin(animation_percent * 2 * TAU) / 4 + 1 / 8,
      Math.sin(animation_percent * 2 * TAU) / 2,
      //top fin 2
      Math.sin(animation_percent * 2 * TAU) / 4 + 0.54,
      Math.sin(animation_percent * 2 * TAU) / 2,
      //tail1
      -Math.sin(animation_percent * 4 * TAU),
      //tail2
      Math.sin(animation_percent * 4 * TAU) * 2,
      //tail3
      Math.sin(animation_percent * 4 * TAU) * 2,
      //head
      Math.sin(animation_percent * 8 * TAU),
      //fins
      Math.sin(animation_percent * TAU) / 8 - 0.7,
      Math.sin(animation_percent * TAU) / 4 + 0.6,
    ];
  } else {
    return [
      //body1
      Math.sin(animation_percent * TAU) / 4,
      //top fin 1
      Math.sin(animation_percent * TAU) / 8 + 1 / 8,
      Math.sin(animation_percent * TAU) / 4,
      //top fin 2
      Math.sin(animation_percent * TAU) / 8 + 0.54,
      Math.sin(animation_percent * TAU) / 4,
      //tail1
      -Math.sin(animation_percent * TAU) / 2,
      //tail2
      Math.sin(animation_percent * 2 * TAU) / 2,
      //tail3
      Math.sin(animation_percent * 2 * TAU) / 2,
      //head
      Math.sin(animation_percent * 4 * TAU) / 6,
      //fins
      Math.sin(animation_percent * TAU) / 8 - 0.7,
      Math.sin(animation_percent * TAU) / 4 + 0.6,
    ];
  }
}

function set_angle_sliders(angles) {
  SLIDER_IDS.forEach((elem_id, index) => {
    document.getElementById(elem_id).value = angles[index];
  });
}

function get_angles_sliders() {
  return SLIDER_IDS.map((elem_id) => {
    return parseFloat(document.getElementById(elem_id).value);
  });
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

let IDENTITY_MATRIX = make_translation_matrix(0, 0, 0);

let TAU = Math.PI * 2;

let SLIDER_IDS = [
  "body1_input",
  "top_fin1_angle1_input",
  "top_fin1_angle2_input",
  "top_fin2_angle1_input",
  "top_fin2_angle2_input",
  "tail1_input",
  "tail2_input",
  "tail3_input",
  "head_input",
  "fins_angle1_input",
  "fins_angle2_input",
];
