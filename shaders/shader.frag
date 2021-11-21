precision highp float;

uniform vec3 fColor;
uniform lowp float hasColor;
varying vec3 fNormal;

void main() {
    if(hasColor == 1.0){
    gl_FragColor = vec4(fColor, 1.0);
    } else {
        gl_FragColor = vec4(fNormal, 1.0);
    }
}