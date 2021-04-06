import { Vector, Mat4, Matrix } from '.';

export class Camera {
  position: Vector = new Vector(0, 0, 5);
  target: Vector = new Vector(0, 0, 0);
  up: Vector = new Vector(0, 1, 0);

  cameraMatrix = Mat4.identity();
  viewMatrix = Mat4.identity();

  updateMatrices(): Camera {
    const { position, target, up } = this;
    const matrix = Mat4.lookAt(position, target, up);
    this.cameraMatrix = matrix;
    this.viewMatrix = matrix.inverse();
    return this;
  }
}
