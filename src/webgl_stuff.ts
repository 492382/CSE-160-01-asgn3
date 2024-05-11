import {Matrix} from "./math_stuff.js";

export class AndyScene {
  gl: WebGL2RenderingContext;
  program: WebGLProgram;
  u_CameraMatrix: WebGLUniformLocation;
  u_ModelMatrix: WebGLUniformLocation;
  u_Color: WebGLUniformLocation;
  u_TextureEnum: WebGLUniformLocation;
  u_ProjMatrix: WebGLUniformLocation;
  a_Position: GLint;
  a_TexCoord: GLint;
  cube_buffer: WebGLBuffer;
  cube_tex_buffer: WebGLBuffer;
  plane_buffer: WebGLBuffer;
  plane_tex_buffer: WebGLBuffer;

  u_Sampler0: WebGLUniformLocation;
  u_Sampler1: WebGLUniformLocation;
  u_Sampler2: WebGLUniformLocation;

  constructor(canvas: HTMLCanvasElement, vertex_shader_src: string, frag_shader_src: string) {
    [this.gl, this.program, this.cube_buffer, this.cube_tex_buffer, this.plane_buffer, this.plane_tex_buffer] = setupWebGL(canvas, vertex_shader_src, frag_shader_src);
    

    this.u_CameraMatrix = this.gl.getUniformLocation(this.program, "camera_matrix");
    this.u_ModelMatrix = this.gl.getUniformLocation(this.program, "model_matrix");
    this.u_Color = this.gl.getUniformLocation(this.program, "color");
    this.u_TextureEnum = this.gl.getUniformLocation(this.program, "texture_enum");
    this.u_ProjMatrix = this.gl.getUniformLocation(this.program, "proj_matrix");
    
    this.a_Position = this.gl.getAttribLocation(this.program, "attribute_model_position");
    this.a_TexCoord = this.gl.getAttribLocation(this.program, "attribute_tex_coord");
    

    this.u_Sampler0 = this.gl.getUniformLocation(this.program, "uSampler0");
    this.u_Sampler1 = this.gl.getUniformLocation(this.program, "uSampler1");
    this.u_Sampler2 = this.gl.getUniformLocation(this.program, "uSampler2");

    this.gl.uniform1i(this.u_Sampler0, 0);
    this.gl.uniform1i(this.u_Sampler1, 1);
    this.gl.uniform1i(this.u_Sampler2, 2);
    
    let r = 2;
    let l = -2;
    let t = 1;
    let b = -1;

    let f = -1;
    let n = 1;
    
    this.set_matrix(this.u_ProjMatrix, 
      [[(2*n)/(r-l), 0          , (r+l)/(r-l), 0],
	[0,           (2*n)/(t-b), (t+b)/(t-b), 0],
	[0,           0          , (n+f)/(n-f), (2*n*f)/(n-f)],
	[0          , 0          , -1          , 0]]
      
    );
  }

  set_matrix(unif: WebGLUniformLocation, matrix: Matrix) {
    let flattened_matrix = Array(16)
      .fill(undefined)
      .map((_, index) => {
	return matrix[index % 4][Math.trunc(index / 4)];
      });

    this.gl.uniformMatrix4fv(unif, false, flattened_matrix);
  }

  
  draw_cube(model_matrix: Matrix, texture_enum: GLint) {
    this.gl.uniform1ui(this.u_TextureEnum, texture_enum);
    
    this.set_matrix(
      this.u_ModelMatrix,
      model_matrix
    );
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cube_buffer);
    this.gl.vertexAttribPointer(this.a_Position, 3, this.gl.FLOAT, false, 0, 0);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cube_tex_buffer);
    this.gl.vertexAttribPointer(this.a_TexCoord, 2, this.gl.FLOAT, false, 0, 0);
    
    this.gl.drawArrays(this.gl.TRIANGLES, 0, NUM_CUBE_VERTS);
  }

  draw_plane(model_matrix: Matrix, texture_enum: GLint) {//water or something
    this.gl.uniform1ui(this.u_TextureEnum, texture_enum);
    
    this.set_matrix(this.u_ModelMatrix, model_matrix);
    
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.plane_buffer);
    this.gl.vertexAttribPointer(this.a_Position, 3, this.gl.FLOAT, false, 0, 0);

    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.plane_tex_buffer);
    this.gl.vertexAttribPointer(this.a_TexCoord, 2, this.gl.FLOAT, false, 0, 0);
    
    this.gl.drawArrays(this.gl.TRIANGLES, 0, NUM_PLANE_VERTS);
  }


  async load_texture(url: string, texture_enum: number) {
    let gl = this.gl;
    const texture = gl.createTexture();

    gl.activeTexture(texture_enum);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 255, 255]); // opaque blue
    gl.texImage2D(
      gl.TEXTURE_2D,
      level,
      internalFormat,
      width,
      height,
      border,
      srcFormat,
      srcType,
      pixel,
    );

    let image: HTMLImageElement = await new Promise(resolve => {
      const image = new Image();
      image.addEventListener("load", () => {
        resolve(image);
      });
      image.src = url;
    });

    gl.activeTexture(texture_enum);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      level,
      internalFormat,
      srcFormat,
      srcType,
      image,
    );

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    gl.texParameterf(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  }
}

function setupWebGL(canvas: HTMLCanvasElement, vertex_shader_src: string, frag_shader_src: string): [WebGL2RenderingContext, WebGLProgram, WebGLBuffer, WebGLBuffer, WebGLBuffer, WebGLBuffer] {
  let gl = canvas.getContext("webgl2");

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
  let a_TexCoord = gl.getAttribLocation(program, "attribute_tex_coord");
  gl.enableVertexAttribArray(a_TexCoord);

  let cube_buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cube_buffer);
  gl.bufferData(gl.ARRAY_BUFFER, CUBE_VERTS, gl.STATIC_DRAW);

  let cube_tex_buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cube_tex_buffer);
  gl.bufferData(gl.ARRAY_BUFFER, CUBE_TEX_VERTS, gl.STATIC_DRAW);
  
  let plane_buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, plane_buffer);
  gl.bufferData(gl.ARRAY_BUFFER, PLANE_VERTS, gl.STATIC_DRAW);

  let plane_tex_buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, plane_tex_buffer);
  gl.bufferData(gl.ARRAY_BUFFER, PLANE_TEX_VERTS, gl.STATIC_DRAW);
  
  gl.useProgram(program);

  gl.clearColor(0.2, 0.3, 0.5, 1);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    

  return [gl, program, cube_buffer, cube_tex_buffer, plane_buffer, plane_tex_buffer];
}

const CUBE_VERTS = new Float32Array([
  0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0,

  0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0,

  0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0,

  1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0,

  1.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0,

  1.0, 0.0, 0.0, 1.0, 1.0, 1.0,  1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0,
]);

const CUBE_TEX_VERTS = new Float32Array([
  0.0, 0.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0,

  0.0, 0.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0,

  0.0, 0.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0,

  0.0, 0.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0,

  0.0, 0.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0,

  0.0, 0.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0,
]);

const PLANE_VERTS = new Float32Array([
  0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0,
]);

const PLANE_TEX_VERTS = new Float32Array([
  0.0, 0.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0,
]);

const NUM_CUBE_VERTS = CUBE_VERTS.length / 3;

const NUM_PLANE_VERTS = PLANE_VERTS.length /3;

const TAU = Math.PI * 2;
