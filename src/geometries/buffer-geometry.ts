export type BufferGroup = {
  startIndex: number;
  count: number;
};

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
  index: number[] | null = null;
  indexType: 0 | 16 | 32 = 0;

  setIndex(indices: ArrayLike<number>, bits: 16 | 32 = 16): BufferGeometry {
    this.index = Array.from(indices);
    this.indexType = bits;
    this.count = this.index.length;
    return this;
  }

  setAttribute(
    attributeName: string,
    bufferAttribute: BufferAttribute
  ): BufferGeometry {
    this.attributes[attributeName] = bufferAttribute;
    if (!this.index) {
      this.count = Math.max(this.count, bufferAttribute.count);
    }
    return this;
  }

  removeAttribute(attributeName: string): BufferGeometry {
    if (attributeName in this.attributes) {
      delete this.attributes[attributeName];
    }
    return this;
  }

  private static mergeNonIndexedGeometries(
    a: BufferGeometry,
    b: BufferGeometry
  ): BufferGeometry {
    const countA =
      a.index !== null
        ? a.count
        : Math.max.apply(
            null,
            Object.values(a.attributes).map(
              (attr) => (attr.data.length / attr.recordSize) | 0
            )
          );
    const countB =
      b.index !== null
        ? b.count
        : Math.max.apply(
            null,
            Object.values(b.attributes).map(
              (attr) => (attr.data.length / attr.recordSize) | 0
            )
          );
    const result = new BufferGeometry();
    for (const key of Object.keys(a.attributes)) {
      const newAttrib = [];
      const attribA = a.attributes[key];
      const attribB =
        b.attributes[key] || new BufferAttribute(new Float32Array(a.count), 1);
      const recordSize = Math.max(attribA.recordSize, attribB?.recordSize || 0);
      for (let i = 0; i < countA; i++) {
        for (let j = 0; j < recordSize; j++) {
          if (
            attribA.recordSize <= j ||
            attribA.data.length <= i * attribA.recordSize + j
          ) {
            newAttrib.push(0);
            continue;
          }
          newAttrib.push(a.attributes[key].data[i * attribA.recordSize + j]);
        }
      }
      for (let i = 0; i < countB; i++) {
        for (let j = 0; j < recordSize; j++) {
          if (
            !attribB ||
            attribB.recordSize <= j ||
            attribB.data.length <= i * attribB.recordSize + j
          ) {
            newAttrib.push(0);
            continue;
          }
          newAttrib.push(b.attributes[key].data[i * attribB.recordSize + j]);
        }
      }
      result.setAttribute(
        key,
        new BufferAttribute(new Float32Array(newAttrib), recordSize)
      );
    }
    return result;
  }

  private static mergeIndexedGeometries(
    a: BufferGeometry,
    b: BufferGeometry
  ): BufferGeometry {
    if (a.index === null || b.index === null) {
      throw Error();
    }
    const result = BufferGeometry.mergeNonIndexedGeometries(a, b);
    const maxIndexA = Math.max.apply(null, a.index);
    const maxIndexB = Math.max.apply(null, b.index);
    const indices = a.index.concat(b.index.map((idx) => maxIndexA + 1 + idx));
    result.setIndex(indices, maxIndexA + maxIndexB + 1 < 65534 ? 16 : 32);
    return result;
  }

  merge(otherGeometry: BufferGeometry): BufferGeometry {
    if (this.index === null && otherGeometry.index === null) {
      return BufferGeometry.mergeNonIndexedGeometries(this, otherGeometry);
    }
    return BufferGeometry.mergeIndexedGeometries(
      this.index === null ? this.createIndexedGeometry() : this,
      otherGeometry.index === null
        ? otherGeometry.createIndexedGeometry()
        : otherGeometry
    );
  }

  /**
   * Create an indexed buffer geometry from a non-indexed one (might be expensive)
   */
  createIndexedGeometry(): BufferGeometry {
    if (this.index !== null) {
      throw Error('the buffer geometry is already indexed');
    }
    const result = new BufferGeometry();
    const newAttribs: Record<string, number[]> = {};
    const indices = [];
    let lastIndex = -1;
    const indexMap: Record<string, number> = {};
    for (let i = 0; i < this.count; i++) {
      const data: Record<string, number[]> = {};
      for (const [key, attribute] of Object.entries(this.attributes)) {
        const offset = i * attribute.recordSize;
        data[key] = Array.from(
          attribute.data.slice(offset, offset + attribute.recordSize)
        );
      }
      const serialized = JSON.stringify(data);
      if (indexMap[serialized]) {
        const index = indexMap[serialized];
        indices.push(index);
      } else {
        lastIndex++;
        indexMap[serialized] = lastIndex;
        indices.push(lastIndex);
        for (const [key, value] of Object.entries(data)) {
          if (!newAttribs[key]) {
            newAttribs[key] = [];
          }
          Array.prototype.push.apply(newAttribs[key], value);
        }
      }
    }
    result.setIndex(indices, lastIndex > 65534 ? 32 : 16);
    for (const [key, value] of Object.entries(newAttribs)) {
      const recordSize = this.attributes[key].recordSize;
      result.setAttribute(
        key,
        new BufferAttribute(new Float32Array(value), recordSize)
      );
    }
    return result;
  }

  dispose(): void {
    for (const attribute of Object.keys(this.attributes)) {
      this.removeAttribute(attribute);
    }
  }
}
