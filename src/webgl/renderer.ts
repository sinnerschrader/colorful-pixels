import { ERRORS } from './webgl-errors';
import { WebGLObject } from './webgl-object';

export class Renderer {
  gl: WebGLRenderingContext;
  pixelRatio = 1;

  constructor(public canvas: HTMLCanvasElement) {
    const gl = this.canvas.getContext('webgl');
    if (!gl) {
      throw Error(ERRORS.WEBGL_INIT);
    }
    this.gl = gl;
  }

  render(scene: WebGLObject[]) {
    for (const obj of scene) {
      // render the thing.
      obj.enableAttribs();
      obj.draw();
      obj.disableAttribs();
    }
  }

  setPixelRatio(pixelRatio: number) {
    this.pixelRatio = pixelRatio;
  }

  setSize(width: number, height: number) {
    const { gl, canvas, pixelRatio } = this;
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  }

  dispose() {
    const { gl } = this;
    const loseCtx = gl.getExtension('WEBGL_lose_context');
    if (loseCtx && typeof loseCtx.loseContext === 'function') {
      loseCtx.loseContext();
    }
  }
}
