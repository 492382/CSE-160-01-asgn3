export let IDENTITY_MATRIX = make_translation_matrix(0, 0, 0);

export function make_translation_matrix(dx, dy, dz) {
    return [
	[1.0, 0.0, 0.0, dx],
	[0.0, 1.0, 0.0, dy],
	[0.0, 0.0, 1.0, dz],
	[0.0, 0.0, 0.0, 1.0],
    ];
}


export function make_scale_matrix(x, y, z) {
    return [
	[x, 0.0, 0.0, 0],
	[0.0, y, 0.0, 0],
	[0.0, 0.0, z, 0],
	[0.0, 0.0, 0.0, 1.0],
    ];
}

export function normalize_vec_or_bivec(vec) {
    let magnitude = Math.sqrt(
	vec.map((x) => x * x).reduce((acc, x) => acc + x),
	0,
    );
    return vec.map((x) => x / magnitude);
}

export function matrix_multiply(mat1, mat2) {
    return Array(4)
	.fill()
	.map((_, row) => {
	    return Array(4)
		.fill()
		.map((_, col) => {
		    let sum = 0;
		    for (let i = 0; i < 4; i++) {
			sum += mat1[row][i] * mat2[i][col];
		    }
		    return sum;
		});
	});
}

export function matrix_list_multiply(mats) {
    return mats.reduce((acc, next) => {
	return matrix_multiply(acc, next);
    }, IDENTITY_MATRIX);
}

export function rotor_multiply([real1, bivector1], [real2, bivector2]) {
    let real =
	real1 * real2 -
	    bivector1[0] * bivector2[0] -
	    bivector1[1] * bivector2[1] -
	    bivector1[2] * bivector2[2];
    let yz =
	real1 * bivector2[0] +
	    bivector1[0] * real2 +
	    bivector1[1] * bivector2[2] -
	    bivector1[2] * bivector2[1];
    let zx =
	real1 * bivector2[1] +
	    bivector1[1] * real2 +
	    bivector1[2] * bivector2[0] -
	    bivector1[0] * bivector2[2];
    let xy =
	real1 * bivector2[2] +
	    bivector1[2] * real2 +
	    bivector1[0] * bivector2[1] -
	    bivector1[1] * bivector2[0];

    return [real, [yz, zx, xy]];
}

export function make_rotation_rotor(radians, normalized_bivector_plane) {
    let real = Math.cos(radians / 2.0);
    let bivector = normalized_bivector_plane.map(
	(num) => Math.sin(radians / 2.0) * num,
    );

    return [real, bivector];
}

export function rotor_to_matrix([real, bivector]) {
    let w = real;
    let yz = bivector[0];
    let zx = bivector[1];
    let xy = bivector[2];
    // https://gabormakesgames.com/blog_quats_to_matrix.html
    return [
	[
	    w * w + yz * yz - zx * zx - xy * xy,
	    2 * yz * zx - 2 * w * xy,
	    2 * yz * xy + 2 * w * zx,
	    0,
	],
	[
	    2 * yz * zx + 2 * w * xy,
	    w * w - yz * yz + zx * zx - xy * xy,
	    2 * zx * xy - 2 * w * yz,
	    0,
	],
	[
	    2 * yz * xy - 2 * w * zx,
	    2 * zx * xy + 2 * w * yz,
	    w * w - yz * yz - zx * zx + xy * xy,
	    0,
	],
	[0, 0, 0, w * w + yz * yz + zx * zx + xy * xy],
    ];
}
