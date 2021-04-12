import { BufferGeometry } from '../geometries';
import { ERRORS } from './webgl-errors';
import { Uniform, Uniforms, Material } from './material';
import { setUniform, wrapUniforms } from '../utils';

export class Mesh {
  buffers: Record<string, WebGLBuffer> = {};
  program: WebGLProgram;
  uniforms: Uniforms;

  /**
   * WebGLObject constructor
   * @param gl the WebGL context
   * @param geometry a buffer geometry
   * @param material the material
   * @param uniforms additional uniforms
   */
  constructor(
    public gl: WebGLRenderingContext,
    public geometry: BufferGeometry,
    public material: Material,
    uniforms: Record<string, Uniform> = {}
  ) {
    const { fragmentShader, vertexShader } = material;
    this.program = this.createProgram(vertexShader, fragmentShader);
    this.uniforms = wrapUniforms(gl, this.program, {
      ...material.uniforms,
      ...uniforms,
    });
    material.uniforms = this.uniforms;
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
      if (attribLoc === -1) {
        continue;
      }
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

  recompile(): Mesh {
    const { vertexShader, fragmentShader } = this.material;
    this.program = this.createProgram(vertexShader, fragmentShader);
    return this;
  }

  setUniforms(): Mesh {
    const { gl, program } = this;
    gl.useProgram(program);
    for (const [name, value] of Object.entries(this.uniforms)) {
      setUniform(gl, program, name, value);
    }
    return this;
  }

  disableAttribs(): Mesh {
    const { gl, program, buffers } = this;
    gl.useProgram(program);
    for (const key of Object.keys(buffers)) {
      const loc = gl.getAttribLocation(program, key);
      if (loc > -1) {
        gl.disableVertexAttribArray(loc);
      }
    }
    return this;
  }

  enableAttribs(): Mesh {
    const { gl, program, buffers, geometry } = this;
    gl.useProgram(program);
    for (const [key, buffer] of Object.entries(buffers)) {
      const attribute = geometry.attributes[key];
      const loc = gl.getAttribLocation(program, key);
      if (loc > -1) {
        gl.enableVertexAttribArray(loc);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.vertexAttribPointer(
          loc,
          attribute.recordSize,
          gl.FLOAT,
          false,
          0,
          0
        );
      }
    }
    return this;
  }

  draw(): Mesh {
    if (this.geometry.index !== null) {
      let indexType = WebGLRenderingContext.NONE;
      if (this.geometry.indexType === 16) {
        indexType = WebGLRenderingContext.UNSIGNED_SHORT;
      }
      if (this.geometry.indexType === 32) {
        indexType = WebGLRenderingContext.UNSIGNED_INT;
      }
      this.gl.drawElements(
        this.material.drawMode,
        this.geometry.count,
        indexType,
        0
      );
      return this;
    }
    this.gl.drawArrays(this.material.drawMode, 0, this.geometry.count);
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
