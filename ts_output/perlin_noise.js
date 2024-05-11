//code from here:
//https://rtouti.github.io/graphics/perlin-noise-algorithm
class Vector2 {
    x;
    y;
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    dot(other) {
        return this.x * other.x + this.y * other.y;
    }
}
function Shuffle(arrayToShuffle) {
    for (let e = arrayToShuffle.length - 1; e > 0; e--) {
        const index = Math.round(Math.random() * (e - 1));
        const temp = arrayToShuffle[e];
        arrayToShuffle[e] = arrayToShuffle[index];
        arrayToShuffle[index] = temp;
    }
}
function MakePermutation() {
    const permutation = [];
    for (let i = 0; i < 256; i++) {
        permutation.push(i);
    }
    Shuffle(permutation);
    for (let i = 0; i < 256; i++) {
        permutation.push(permutation[i]);
    }
    return permutation;
}
const Permutation = MakePermutation();
function GetConstantVector(v) {
    // v is the value from the permutation table
    const h = v & 3;
    if (h == 0)
        return new Vector2(1.0, 1.0);
    else if (h == 1)
        return new Vector2(-1.0, 1.0);
    else if (h == 2)
        return new Vector2(-1.0, -1.0);
    else
        return new Vector2(1.0, -1.0);
}
function Fade(t) {
    return ((6 * t - 15) * t + 10) * t * t * t;
}
function Lerp(t, a1, a2) {
    return a1 + t * (a2 - a1);
}
function Noise2D(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const topRight = new Vector2(xf - 1.0, yf - 1.0);
    const topLeft = new Vector2(xf, yf - 1.0);
    const bottomRight = new Vector2(xf - 1.0, yf);
    const bottomLeft = new Vector2(xf, yf);
    // Select a value from the permutation array for each of the 4 corners
    const valueTopRight = Permutation[Permutation[X + 1] + Y + 1];
    const valueTopLeft = Permutation[Permutation[X] + Y + 1];
    const valueBottomRight = Permutation[Permutation[X + 1] + Y];
    const valueBottomLeft = Permutation[Permutation[X] + Y];
    const dotTopRight = topRight.dot(GetConstantVector(valueTopRight));
    const dotTopLeft = topLeft.dot(GetConstantVector(valueTopLeft));
    const dotBottomRight = bottomRight.dot(GetConstantVector(valueBottomRight));
    const dotBottomLeft = bottomLeft.dot(GetConstantVector(valueBottomLeft));
    const u = Fade(xf);
    const v = Fade(yf);
    return Lerp(u, Lerp(v, dotBottomLeft, dotTopLeft), Lerp(v, dotBottomRight, dotTopRight));
}
export function FractalBrownianMotion(x, y, numOctaves) {
    let result = 0.0;
    let amplitude = 1.0;
    let frequency = 0.005;
    for (let octave = 0; octave < numOctaves; octave++) {
        const n = amplitude * Noise2D(x * frequency, y * frequency);
        result += n;
        amplitude *= 0.5;
        frequency *= 2.0;
    }
    return result;
}
//# sourceMappingURL=perlin_noise.js.map