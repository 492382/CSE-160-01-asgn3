import { matrix_multiply, make_translation_matrix } from "./math_stuff.js";
export class AndyScene {
    gl;
    program;
    u_CameraMatrix;
    u_ModelMatrix;
    u_Color;
    u_TextureEnum;
    u_ProjMatrix;
    a_Position;
    a_TexCoord;
    cube_buffer;
    cube_tex_buffer;
    circle_buffer;
    u_Sampler0;
    u_Sampler1;
    u_Sampler2;
    constructor(canvas, vertex_shader_src, frag_shader_src) {
        [this.gl, this.program, this.cube_buffer, this.cube_tex_buffer, this.circle_buffer] = setupWebGL(canvas, vertex_shader_src, frag_shader_src);
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
        let r = 1;
        let l = -1;
        let t = 1;
        let b = -1;
        let f = -1;
        let n = 1;
        this.set_matrix(this.u_ProjMatrix, [[(2 * n) / (r - l), 0, (r + l) / (r - l), 0],
            [0, (2 * n) / (t - b), (t + b) / (t - b), 0],
            [0, 0, (n + f) / (n - f), (2 * n * f) / (n - f)],
            [0, 0, -1, 0]]);
    }
    set_matrix(unif, matrix) {
        let flattened_matrix = Array(16)
            .fill(undefined)
            .map((_, index) => {
            return matrix[index % 4][Math.trunc(index / 4)];
        });
        this.gl.uniformMatrix4fv(unif, false, flattened_matrix);
    }
    draw_cube(model_matrix, texture_enum) {
        this.gl.uniform1ui(this.u_TextureEnum, texture_enum);
        this.set_matrix(this.u_ModelMatrix, matrix_multiply(model_matrix, make_translation_matrix(-0.5, -0.5, -0.5)));
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cube_buffer);
        this.gl.vertexAttribPointer(this.a_Position, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.cube_tex_buffer);
        this.gl.vertexAttribPointer(this.a_TexCoord, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, NUM_CUBE_VERTS);
    }
    draw_circle(model_matrix) {
        this.set_matrix(this.u_ModelMatrix, model_matrix);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.circle_buffer);
        this.gl.vertexAttribPointer(this.a_Position, 3, this.gl.FLOAT, false, 0, 0);
        this.gl.drawArrays(this.gl.TRIANGLE_FAN, 0, NUM_CIRCLE_SEGMENTS + 2);
    }
    async load_texture(url, texture_enum) {
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
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, width, height, border, srcFormat, srcType, pixel);
        let image = await new Promise(resolve => {
            const image = new Image();
            image.addEventListener("load", () => {
                resolve(image);
            });
            image.src = url;
        });
        gl.activeTexture(texture_enum);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, image);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
}
function setupWebGL(canvas, vertex_shader_src, frag_shader_src) {
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
        console.error("Shader program did not link successfully. Error log: ", linkErrLog);
        throw new Error("Shader didn't link");
    }
    let a_Position = gl.getAttribLocation(program, "attribute_model_position");
    gl.enableVertexAttribArray(a_Position);
    let a_TexCoord = gl.getAttribLocation(program, "attribute_tex_coord");
    gl.enableVertexAttribArray(a_TexCoord);
    let cube_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cube_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, CUBE_VERTS, gl.DYNAMIC_DRAW);
    let cube_tex_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cube_tex_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, CUBE_TEX_VERTS, gl.DYNAMIC_DRAW);
    let circle_verts = Array(NUM_CIRCLE_SEGMENTS + 1)
        .fill(undefined)
        .flatMap((_, index) => {
        let radians = (index / NUM_CIRCLE_SEGMENTS) * TAU;
        return [Math.cos(radians), Math.sin(radians), 0];
    });
    circle_verts.unshift(0, 0, 0);
    let circle_buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, circle_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(circle_verts), gl.DYNAMIC_DRAW);
    gl.useProgram(program);
    gl.clearColor(0.2, 0.3, 0.5, 1.0);
    gl.enable(gl.DEPTH_TEST);
    return [gl, program, cube_buffer, cube_tex_buffer, circle_buffer];
}
const CUBE_VERTS = new Float32Array([
    0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0,
    0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0,
    0.0, 0.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 0.0,
    1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0,
    1.0, 1.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0,
    1.0, 0.0, 0.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0,
]);
const CUBE_TEX_VERTS = new Float32Array([
    0.0, 0.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0,
    0.0, 0.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0,
    0.0, 0.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0,
    0.0, 0.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0,
    0.0, 0.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0,
    0.0, 0.0, 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, 0.0, 1.0, 1.0, 1.0,
]);
const NUM_CUBE_VERTS = CUBE_VERTS.length / 3;
const NUM_CIRCLE_SEGMENTS = 10;
const TAU = Math.PI * 2;
//# sourceMappingURL=webgl_stuff.js.map