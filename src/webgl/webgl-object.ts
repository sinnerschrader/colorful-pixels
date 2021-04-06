import { BufferGeometry } from '../geometries';
import { Texture } from './texture';
import { ERRORS } from './webgl-errors';

type Uniform = number | number[] | number[][] | bigint | bigint[] | Texture;
type Uniforms = Record<string, Uniform>;

function setUniformVector(
  gl: WebGLRenderingContext,
  loc: WebGLUniformLocation | null,
  value: number[]
): boolean {
  switch (value.length) {
    case 1:
      gl.uniform1fv(loc, value);
      return true;
    case 2:
      gl.uniform2fv(loc, value);
      return true;
    case 3:
      gl.uniform3fv(loc, value);
      return true;
    case 4:
      gl.uniform4fv(loc, value);
      return true;
  }
  return false;
}

function setUniformIntVector(
  gl: WebGLRenderingContext,
  loc: WebGLUniformLocation | null,
  value: number[]
): boolean {
  switch (value.length) {
    case 1:
      gl.uniform1iv(loc, value);
      return true;
    case 2:
      gl.uniform2iv(loc, value);
      return true;
    case 3:
      gl.uniform3iv(loc, value);
      return true;
    case 4:
      gl.uniform4iv(loc, value);
      return true;
  }
  return false;
}

function setUniformMatrix(
  gl: WebGLRenderingContext,
  loc: WebGLUniformLocation | null,
  value: number[],
  transpose = false
): boolean {
  if (value.length === 4) {
    gl.uniformMatrix2fv(loc, transpose, value);
    return true;
  }
  if (value.length === 9) {
    gl.uniformMatrix3fv(loc, transpose, value);
  }
  if (value.length === 16) {
    gl.uniformMatrix4fv(loc, transpose, value);
  }
  return false;
}

function setUniform(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  name: string,
  uniform: Uniform
): boolean {
  gl.useProgram(program);
  const loc = gl.getUniformLocation(program, name);
  if (typeof uniform === 'number') {
    gl.uniform1f(loc, uniform);
    return true;
  }
  if (uniform instanceof Texture) {
    gl.uniform1i(loc, (<Texture>uniform).textureIndex);
    return true;
  }
  if (uniform instanceof Array) {
    if (typeof uniform[0] === 'number') {
      return setUniformVector(gl, loc, <number[]>uniform);
    }
    if (typeof uniform[0] === 'bigint') {
      const converter = (val: bigint): number => parseInt(val.toString(), 10);
      return setUniformIntVector(gl, loc, (<bigint[]>uniform).map(converter));
    }
    if (uniform[0] instanceof Array) {
      return setUniformMatrix(gl, loc, (<number[][]>uniform).flat(1));
    }
  }
  return false;
}

/**
 * Create a wrapper object from a uniforms object which automatically updates
 * uniforms in the rendering context
 * @param gl a WebGLRenderingContext initialized via canvas.getContext('webgl')
 * @param uniform
 * @returns wrapper object
 */
function wrapUniforms(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  uniform: Uniforms
) {
  const handler: ProxyHandler<Uniforms> = {
    get(target: Uniforms, prop: string) {
      return target[prop];
    },
    set(target: Uniforms, prop: string, value: Uniform): boolean {
      target[prop] = value;
      return setUniform(gl, program, prop, value as Uniform);
    },
  };
  return new Proxy<Uniforms>(uniform, handler);
}

export class WebGLObject {
  buffers: Record<string, WebGLBuffer> = {};
  program: WebGLProgram;
  uniforms: Uniforms;

  constructor(
    public gl: WebGLRenderingContext,
    public geometry: BufferGeometry,
    public vertexShader: string,
    public fragmentShader: string,
    public drawMode = WebGLRenderingContext.TRIANGLES,
    uniforms: Record<string, Uniform> = {}
  ) {
    this.program = this.createProgram(vertexShader, fragmentShader);
    this.uniforms = wrapUniforms(gl, this.program, uniforms);
    this.buffers = this.createBuffers(this.program, this.geometry);
    gl.useProgram(this.program);
    this.setUniforms();
  }

  private compileShader(type: number, code: string): WebGLShader | null {
    const { gl } = this;
    if (!gl) {
      throw Error(ERRORS.WEBGL_INIT);
    }
    const sh = gl.createShader(type);
    if (!sh) {
      throw Error('error creating shader.');
    }
    gl.shaderSource(sh, code);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      throw gl.getShaderInfoLog(sh);
    }
    return sh;
  }

  private createProgram(
    vertexShader: string,
    fragmentShader: string
  ): WebGLProgram {
    const { gl } = this;
    if (!gl) {
      throw Error('WebGL context not initialized');
    }
    const program = gl.createProgram();
    if (!program) {
      throw Error(ERRORS.SHADER_FAIL);
    }
    const fragShader =
      this.compileShader(gl.FRAGMENT_SHADER, fragmentShader) || null;
    const vertShader =
      this.compileShader(gl.VERTEX_SHADER, vertexShader) || null;
    if (!fragShader || !vertShader) {
      throw Error(ERRORS.SHADER_FAIL);
    }
    gl.attachShader(program, fragShader);
    gl.attachShader(program, vertShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw gl.getProgramInfoLog(program);
    }
    return program;
  }

  private createBuffers(
    program: WebGLProgram,
    geometry: BufferGeometry
  ): Record<string, WebGLBuffer> {
    const { gl } = this;
    if (!gl || !program) {
      throw Error(ERRORS.WEBGL_INIT);
    }
    const buffers: Record<string, WebGLBuffer> = {};
    for (const [name, attrib] of Object.entries(geometry.attributes)) {
      const buffer = gl.createBuffer();
      if (!buffer) {
        throw Error(ERRORS.WEBGL_INIT);
      }
      const attribLoc = gl.getAttribLocation(program, name);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, attrib.data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(attribLoc);
      gl.vertexAttribPointer(
        attribLoc,
        attrib.recordSize,
        gl.FLOAT,
        false,
        0,
        0
      );
      buffers[name] = buffer;
    }
    if (geometry.index) {
      const indexBuffer = gl.createBuffer();
      if (indexBuffer === null) {
        throw Error(ERRORS.WEBGL_ERROR);
      }
      // make this buffer the current 'ELEMENT_ARRAY_BUFFER'
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      let data = null;
      if (geometry.indexType === 16) {
        data = new Uint16Array(geometry.index);
      }
      if (geometry.indexType === 32) {
        data = new Uint32Array(geometry.index);
      }
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.STATIC_DRAW);
      buffers['_index'] = indexBuffer;
    }
    return buffers;
  }

  recompile(): WebGLObject {
    const { vertexShader, fragmentShader } = this;
    this.program = this.createProgram(vertexShader, fragmentShader);
    return this;
  }

  setUniforms(): WebGLObject {
    const { gl, program } = this;
    gl.useProgram(program);
    for (const [name, value] of Object.entries(this.uniforms)) {
      setUniform(gl, program, name, value);
    }
    return this;
  }

  disableAttribs(): WebGLObject {
    const { gl, program, buffers } = this;
    gl.useProgram(program);
    for (const key of Object.keys(buffers)) {
      const loc = gl.getAttribLocation(program, key);
      gl.disableVertexAttribArray(loc);
    }
    return this;
  }

  enableAttribs(): WebGLObject {
    const { gl, program, buffers, geometry } = this;
    gl.useProgram(program);
    for (const [key, buffer] of Object.entries(buffers)) {
      const attribute = geometry.attributes[key];
      const loc = gl.getAttribLocation(program, key);
      gl.enableVertexAttribArray(loc);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.vertexAttribPointer(loc, attribute.recordSize, gl.FLOAT, false, 0, 0);
    }
    return this;
  }

  draw(): WebGLObject {
    if (this.geometry.index !== null) {
      let indexType = WebGLRenderingContext.NONE;
      if (this.geometry.indexType === 16) {
        indexType = WebGLRenderingContext.UNSIGNED_SHORT;
      }
      if (this.geometry.indexType === 32) {
        indexType = WebGLRenderingContext.UNSIGNED_INT;
      }
      this.gl.drawElements(this.drawMode, this.geometry.count, indexType, 0);
      return this;
    }
    this.gl.drawArrays(this.drawMode, 0, this.geometry.count);
    return this;
  }

  dispose(): void {
    const { gl, program } = this;
    for (const [key, buffer] of Object.entries(this.buffers)) {
      if (!key.startsWith('_')) {
        const loc = gl.getAttribLocation(program, key);
        gl.disableVertexAttribArray(loc);
      }
      gl.deleteBuffer(buffer);
    }
    gl.deleteProgram(program);
  }
}
