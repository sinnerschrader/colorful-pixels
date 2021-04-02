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
    0, 1, 2, 2, 1, 3,
    1, 0, 3, 3, 0, 2,
    1, 0, 3, 3, 0, 2,
    2, 0, 1, 1, 2, 3,
    1, 0, 3, 3, 0, 2,
    0, 1, 2, 2, 1, 3
  ].map((face: number) => uvs[face]).flat();

  const faces: number[][] = [
    // back
    [0, 1, 2],
    [2, 1, 3],
    // front
    [5, 4, 7],
    [7, 4, 6],
    // left
    [4, 0, 6],
    [6, 0, 2],
    // right
    [7, 5, 1],
    [1, 7, 3],
    // top
    [1, 0, 5],
    [5, 0, 4],
    // bottom
    [2, 3, 6],
    [6, 3, 7],
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
