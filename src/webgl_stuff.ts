import {Matrix, matrix_multiply, make_translation_matrix} from "./math_stuff.js";


export class AndyScene {
  gl: WebGLRenderingContext;
  program: WebGLProgram;
  u_GlobalMatrix: WebGLUniformLocation;
  u_ModelMatrix: WebGLUniformLocation;
  u_Color: WebGLUniformLocation;
  a_Position: GLint;
  cube_buffer: WebGLBuffer;
  circle_buffer: WebGLBuffer;


  constructor(canvas: HTMLCanvasElement, vertex_shader_src: string, frag_shader_src: string) {
    [this.gl, this.program, this.cube_buffer, this.circle_buffer] = setupWebGL(canvas, vertex_shader_src, frag_shader_src);


    this.u_GlobalMatrix = this.gl.getUniformLocation(this.program, "global_matrix");
    this.u_ModelMatrix = this.gl.getUniformLocation(this.program, "model_matrix");
    this.u_Color = this.gl.getUniformLocation(this.program, "color");
    this.a_Position = this.gl.getAttribLocation(this.program, "attribute_model_position");
  }

  set_matrix(unif: WebGLUniformLocation, matrix: Matrix) {
  let flattened_matrix = Array(16)
    .fill(undefined)
    .map((_, index) => {
      return matrix[index % 4][Math.trunc(index / 4)];
    });

    this.gl.uniformMatrix4fv(unif, false, flattened_matrix);
  }

  
  draw_cube(model_matrix: Matrix) {
    this.set_matrix(
      this.u_ModelMatrix,
      matrix_multiply(model_matrix, make_translation_matrix(-0.5, -0.5, -0.5)),
    );
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cube_buffer);
    this.gl.vertexAttribPointer(this.a_Position, 3, this.gl.FLOAT, false, 0, 0);
    this.gl.drawArrays(this.gl.TRIANGLES, 0, NUM_CUBE_VERTS);
  }
  draw_circle(model_matrix: Matrix) {
    this.set_matrix(this.u_ModelMatrix, model_matrix);
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.circle_buffer);
    this.gl.vertexAttribPointer(this.a_Position, 3, this.gl.FLOAT, false, 0, 0);
    this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, NUM_CIRCLE_SEGMENTS + 2);
  }
}
 

function setupWebGL(canvas: HTMLCanvasElement, vertex_shader_src: string, frag_shader_src: string): [WebGLRenderingContext, WebGLProgram, WebGLBuffer, WebGLBuffer] {
  let gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });

  //https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/By_example/Hello_GLSL
  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, vertex_shader_src);
  gl.compileShader(vertexShader);

  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, frag_shader_src);
  gl.compileShader(fragmentShader);

  let program = gl.createProgram();

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
    throw new Error("Shader didn't link");
  }

  let a_Position = gl.getAttribLocation(program, "attribute_model_position");
  gl.enableVertexAttribArray(a_Position);

  let cube_buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cube_buffer);
  gl.bufferData(gl.ARRAY_BUFFER, CUBE_VERTS, gl.DYNAMIC_DRAW);

  let circle_verts = Array(NUM_CIRCLE_SEGMENTS + 1)
    .fill(undefined)
    .flatMap((_, index) => {
      let radians = (index / NUM_CIRCLE_SEGMENTS) * TAU;
      return [Math.cos(radians), Math.sin(radians), 0];
    });
  circle_verts.unshift(0, 0, 0);

  let circle_buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, circle_buffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(circle_verts),
    gl.DYNAMIC_DRAW,
  );

  gl.useProgram(program);

  gl.clearColor(0.2, 0.3, 0.5, 1.0);
  gl.enable(gl.DEPTH_TEST);


  return [gl, program, cube_buffer, circle_buffer];
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

const NUM_CIRCLE_SEGMENTS = 10;

const TAU = Math.PI * 2;
