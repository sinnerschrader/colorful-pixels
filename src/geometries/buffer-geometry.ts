export class BufferAttribute {
  constructor(public data: Float32Array, public recordSize: number) {}

  get count(): number {
    return this.data.length / this.recordSize;
  }
}

/**
 * minimal BufferGeometry class to provide an API similar to THREE
 */
export class BufferGeometry {
  attributes: Record<string, BufferAttribute> = {};
  count = 0;

  setAttribute(
    attributeName: string,
    bufferAttribute: BufferAttribute
  ): BufferGeometry {
    this.attributes[attributeName] = bufferAttribute;
    this.count = Math.max(this.count, bufferAttribute.count);
    return this;
  }

  removeAttribute(attributeName: string): BufferGeometry {
    if (attributeName in this.attributes) {
      delete this.attributes[attributeName];
    }
    return this;
  }

  dispose(): void {
    for (const attribute of Object.keys(this.attributes)) {
      this.removeAttribute(attribute);
    }
  }
}
