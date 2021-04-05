import { BufferAttribute, BufferGeometry } from './buffer-geometry';
import { calculateSurfaceNormal, facesToBuffer, Vector } from './../utils';

/**
 * Create a box geometry with the sizes a * b * c,
 * centered at (0, 0, 0), 2 triangles per side.
 * TODO: implement subdivisions
 *
 * @name box
 * @param {number} sizeA
 * @param {number} sizeB
 * @param {number} sizeC
 */
export function createBoxGeometry(
  sizeA = 1.0,
  sizeB = 1.0,
  sizeC = 1.0
): BufferGeometry {
  const a = sizeA * 0.5;
  const b = sizeB * 0.5;
  const c = sizeC * 0.5;
  const vertices = [
    [-a, -b, -c],
    [a, -b, -c],
    [-a, b, -c],
    [a, b, -c],
    [-a, -b, c],
    [a, -b, c],
    [-a, b, c],
    [a, b, c],
  ].map((v) => new Vector(...v));
  //     0______1
  //   4/|____5/|
  //   |2|____|_|3
  //   |/ ____|/
  //  6       7

  const uvs = [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ];
  //prettier-ignore
  const uvMapping: number[] = [
    0, 2, 1, 2, 3, 1,
    1, 0, 3, 3, 2, 0,
    1, 3, 0, 3, 2, 0,
    2, 0, 1, 1, 3, 2,
    1, 3, 0, 3, 2, 0,
    0, 2, 1, 2, 3, 1
  ].map((face: number) => uvs[face]).flat();

  const faces: number[][] = [
    // back
    [0, 2, 1],
    [2, 3, 1],
    // front
    [5, 7, 4],
    [7, 6, 4],
    // left
    [4, 6, 0],
    [6, 2, 0],
    // right
    [7, 5, 1],
    [1, 3, 7],
    // top
    [1, 5, 0],
    [5, 4, 0],
    // bottom
    [2, 6, 3],
    [6, 7, 3],
  ];

  const normals = faces.map((f) =>
    calculateSurfaceNormal(vertices[f[0]], vertices[f[1]], vertices[f[2]])
  );
  const positionData = new Float32Array(facesToBuffer(faces, vertices));
  const uvData = new Float32Array(uvMapping);
  const normalData = new Float32Array(
    Array.from({ length: normals.length * 3 })
      .map((_, idx) => normals[(idx / 3) | 0].toArray())
      .flat()
  );
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positionData, 3));
  geometry.setAttribute('uv', new BufferAttribute(uvData, 2));
  geometry.setAttribute('normal', new BufferAttribute(normalData, 3));
  return geometry;
}
