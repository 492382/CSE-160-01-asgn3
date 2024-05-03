#version 300 es

precision mediump float;

uniform vec4 color;
uniform uint texture_enum;

uniform sampler2D uSampler0;
uniform sampler2D uSampler1;
uniform sampler2D uSampler2;

in vec2 tex_coord;

in vec3 world_pos;
in vec3 model_pos;

out vec4 fragColor;

void main() {

  vec4 texture_color;
  if(texture_enum == 0u){
    texture_color = color;
  }else if(texture_enum == 1u){
    texture_color = texture(uSampler0, tex_coord);
  }else if(texture_enum == 2u){
    texture_color = texture(uSampler1, tex_coord);
  }else if(texture_enum == 3u){
    texture_color = texture(uSampler2, tex_coord);
  }else if(texture_enum == 4u){
    texture_color = 0.5*texture(uSampler0, tex_coord) + 0.5 * color;
  }else{
    texture_color = vec4(1.0, 0.0, 1.0, 1.0);
  }
  
  fragColor = texture_color;
}
