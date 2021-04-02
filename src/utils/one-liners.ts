export const mix = (a: number, b: number, n: number) => (1 - n) * a + n * b;
export const clamp = (x: number, minVal: number, maxVal: number) =>
  Math.min(Math.max(x, minVal), maxVal);
