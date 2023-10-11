import { origin } from "./main";

export const Vector2 = {
  add(v1: Vector2, v2: Vector2): Vector2 {
    return { x: v1.x + v2.x, y: v1.y + v2.y };
  },

  sub(v1: Vector2, v2: Vector2): Vector2 {
    return { x: v1.x - v2.x, y: v1.y - v2.y };
  },

  scale(v: Vector2, num: number): Vector2 {
    return { x: v.x * num, y: v.y * num };
  },

  mag(v: Vector2): number {
    return Math.sqrt(v.x ** 2 + v.y ** 2);
  },

  copy(v: Vector2): Vector2 {
    return { x: v.x, y: v.y };
  },

  toCanvasSpace(v: Vector2): Vector2 {
    return Vector2.add(v, origin);
  }
};

export type Vector2 = { x: number; y: number };
