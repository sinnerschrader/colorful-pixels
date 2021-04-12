import { Texture } from '.';
import { Vector, Matrix, Color } from '../utils';

import defaultVertexShader from '../shaders/default.vert';
import defaultFragmentShader from '../shaders/default.frag';
import basicFragmentShader from '../shaders/basic.frag';
import normalFragmentShader from '../shaders/default.frag';

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

export function createDefaultMaterial(): Material {
  return {
    vertexShader: defaultVertexShader,
    fragmentShader: defaultFragmentShader,
    drawMode: WebGLRenderingContext.TRIANGLES,
    uniforms: {},
  };
}

export function createNormalMaterial(): Material {
  return {
    vertexShader: defaultVertexShader,
    fragmentShader: normalFragmentShader,
    drawMode: WebGLRenderingContext.TRIANGLES,
    uniforms: {},
  };
}

export function createBasicMaterial(): Material {
  return {
    vertexShader: defaultVertexShader,
    fragmentShader: basicFragmentShader,
    drawMode: WebGLRenderingContext.TRIANGLES,
    uniforms: {
      color: new Color(255, 0, 0),
    },
  };
}

export function createShaderMaterial(
  vertexShader = defaultVertexShader,
  fragmentShader = defaultFragmentShader,
  uniforms: Record<string, Uniform> = {}
): Material {
  return {
    vertexShader,
    fragmentShader,
    drawMode: WebGLRenderingContext.TRIANGLES,
    uniforms,
  };
}
