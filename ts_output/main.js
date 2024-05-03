import { invert_rotor, matrix_mul_vec, make_rotation_rotor, rotor_multiply, normalize_vec_or_bivec, rotor_to_matrix, matrix_multiply, make_scale_matrix, make_translation_matrix, matrix_list_multiply } from "./math_stuff.js";
import { AndyScene } from "./webgl_stuff.js";
window.onload = main;
let scene;
let global_rotor = make_rotation_rotor(0.5, [1, 0, 0]);
let d_theta = 0.077;
let mouse_old_x = null;
let mouse_old_y = null;
let mouse_dx = 0.0;
let mouse_dy = 0.0;
let camera_pos = [0, 5, 10];
async function main() {
    let canvas = document.getElementById("andy_canvas");
    let vertex_src = await (await fetch('/shaders/shader.vert')).text();
    let fragment_src = await (await fetch('/shaders/shader.frag')).text();
    scene = new AndyScene(canvas, vertex_src, fragment_src);
    await scene.load_texture("/dirt.png", scene.gl.TEXTURE0);
    await scene.load_texture("/grass.jpg", scene.gl.TEXTURE1);
    await scene.load_texture("/sky.jpg", scene.gl.TEXTURE2);
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
    canvas.addEventListener("mousemove", function (event) {
        if ((event.buttons & 1) != 1) {
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
    document.addEventListener("keydown", function (event) {
        let rot_mat = rotor_to_matrix(invert_rotor(global_rotor));
        let camera_forward = matrix_mul_vec(rot_mat, [0, 0, -1]);
        let camera_right = matrix_mul_vec(rot_mat, [1, 0, 0]);
        if (event.code == "KeyW") {
            camera_pos[0] += camera_forward[0] * 0.5;
            camera_pos[1] += camera_forward[1] * 0.5;
            camera_pos[2] += camera_forward[2] * 0.5;
        }
        if (event.code == "KeyS") {
            camera_pos[0] -= camera_forward[0] * 0.5;
            camera_pos[1] -= camera_forward[1] * 0.5;
            camera_pos[2] -= camera_forward[2] * 0.5;
        }
        if (event.code == "KeyD") {
            camera_pos[0] += camera_right[0] * 0.5;
            camera_pos[1] += camera_right[1] * 0.5;
            camera_pos[2] += camera_right[2] * 0.5;
        }
        if (event.code == "KeyA") {
            camera_pos[0] -= camera_right[0] * 0.5;
            camera_pos[1] -= camera_right[1] * 0.5;
            camera_pos[2] -= camera_right[2] * 0.5;
        }
    });
}
function render(milis) {
    scene.gl.clear(scene.gl.COLOR_BUFFER_BIT | scene.gl.DEPTH_BUFFER_BIT);
    if (mouse_dx * mouse_dx + mouse_dy * mouse_dy > 0) {
        //negate the dy because on the canvas positive Y is down instead of up
        global_rotor = rotor_multiply(make_rotation_rotor(d_theta, normalize_vec_or_bivec([mouse_dy, -mouse_dx, 0])), global_rotor);
    }
    let rot_mat = rotor_to_matrix(global_rotor);
    scene.set_matrix(scene.u_CameraMatrix, matrix_list_multiply([rot_mat, make_scale_matrix(0.2, 0.2, 0.2), make_translation_matrix(-camera_pos[0], -camera_pos[1], -camera_pos[2])]));
    scene.gl.uniform4fv(scene.u_Color, new Float32Array([0.0, 0.5, 0.5, 1.0]));
    let matrix1_1 = matrix_list_multiply([
        make_translation_matrix(5, 0, 0),
        rotor_to_matrix(make_rotation_rotor((milis / 1000), [0, 0, 1])),
        make_scale_matrix(3, 3, 3)
    ]);
    scene.draw_cube(matrix1_1, 1);
    let matrix1_2 = matrix_multiply(rotor_to_matrix(make_rotation_rotor((milis / 1000), [Math.sqrt(2), 0, Math.sqrt(2)])), make_scale_matrix(3, 3, 3));
    scene.draw_cube(matrix1_2, 4);
    let matrix1_3 = matrix_list_multiply([
        make_translation_matrix(-5, 0, 0),
        rotor_to_matrix(make_rotation_rotor((milis / 1000), [1, 0, 0])),
        make_scale_matrix(3, 3, 3)
    ]);
    scene.draw_cube(matrix1_3, 0);
    let matrix2 = matrix_multiply(make_translation_matrix(0, -3, 0), make_scale_matrix(50, 0.5, 50));
    scene.draw_cube(matrix2, 2);
    let matrix3 = make_scale_matrix(50, 50, 50);
    scene.draw_cube(matrix3, 3);
}
//# sourceMappingURL=main.js.map