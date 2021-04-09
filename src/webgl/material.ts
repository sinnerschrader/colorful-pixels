import { Texture } from '.';
import { Vector, Matrix, Color } from '../utils';

export type Uniform =
  | number
  | number[]
  | number[][]
  | bigint
  | bigint[]
  | Texture
  | Vector
  | Matrix
  | Color;
export type Uniforms = Record<string, Uniform>;

export type Material = {
  vertexShader: string;
  fragmentShader: string;
  drawMode: number;
  uniforms: Uniforms;
};

export function createNormalMaterial() {}

export function createBasicMaterial() {}
