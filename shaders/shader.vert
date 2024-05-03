#version 300 es

uniform mat4 global_matrix;
uniform mat4 model_matrix;

in vec3 attribute_model_position;
in vec2 attribute_tex_coord;

out vec3 model_pos;
out vec3 world_pos;
out vec2 tex_coord;

void main() {
  gl_Position = global_matrix * model_matrix * vec4(attribute_model_position, 1.0);
  world_pos = vec3(global_matrix * model_matrix * vec4(attribute_model_position, 1.0));
  model_pos = attribute_model_position;
  tex_coord = attribute_tex_coord;
}
