#version 300 es

precision mediump float;

//uniform vec4 color;
uniform sampler2D uSampler;

in vec3 world_pos;
in vec3 model_pos;


out vec4 fragColor;

void main() {
  
  //vec4 real_color = mix(color, vec4(1.0, 1.0, 1.0, 1.0), clamp(model_pos.y/2.0, 0.0, 1.0));
  //gl_FragColor = mix(real_color, vec4(0.0, 0.0, 0.0, 1.0), clamp(-world_pos.y*1.5, 0.0, 1.0));

  vec2 coord = model_pos.xy;
  vec4 stuff = texture(uSampler, coord);

  fragColor = stuff;
}
