#version 300 es

precision mediump float;

uniform vec4 color;
uniform sampler2D uSampler;

in vec2 tex_coord;

in vec3 world_pos;
in vec3 model_pos;


out vec4 fragColor;

void main() {
  
  //vec4 real_color = mix(color, vec4(1.0, 1.0, 1.0, 1.0), clamp(model_pos.y/2.0, 0.0, 1.0));
  //gl_FragColor = mix(real_color, vec4(0.0, 0.0, 0.0, 1.0), clamp(-world_pos.y*1.5, 0.0, 1.0));

  fragColor = 0.8*texture(uSampler, tex_coord) + 0.2 * color;
}
