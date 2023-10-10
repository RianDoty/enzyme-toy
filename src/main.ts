import "./index.css";

type Vector2 = { x: number; y: number };

const Vector2 = {
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
};

// X and Y point to center of node
class GraphNode implements Renderable {
  position: Vector2;
  velocity: Vector2;
  size: number;

  constructor(x = 0, y = 0, size = 20) {
    this.position = { x, y };
    this.velocity = { x: 0, y: 0 };
    this.size = size;
  }

  tick(ms: number) {
    const delta = Vector2.scale(this.velocity, ms / 1000);
    this.position = Vector2.add(this.position, delta);
  }

  render(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.position.x, this.position.y, this.size, 0, 2 * Math.PI);
    ctx.stroke();
  }
}

interface Renderable {
  render: (ctx: CanvasRenderingContext2D) => void;
  tick: (ms: number) => void;
}

class Scene implements Renderable {
  ctx: CanvasRenderingContext2D;
  renderables: Renderable[];

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.renderables = [];
  }

  add(...renderables: Renderable[]) {
    this.renderables.push(...renderables);
  }

  tick(ms: number) {
    this.renderables.forEach((r) => r.tick(ms));
  }

  // To be called once per frame
  render() {
    this.ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    this.renderables.forEach((r) => r.render(this.ctx));
  }
}

class GravityWell implements Renderable {
  position: Vector2;
  nodes: GraphNode[];

  constructor(x: number, y: number) {
    this.position = { x, y };
    this.nodes = [];
  }

  add(...nodes: GraphNode[]) {
    this.nodes.push(...nodes);
  }

  tick(ms: number) {
    this.nodes.forEach((node) => {
      const offset = Vector2.sub(node.position, this.position);

      const stiffness = 0.05;
      const damping = 1;

      const springAcc = Vector2.scale(offset, -1 * stiffness);
      const dampingAcc = Vector2.scale(node.velocity, -1 * damping);

      const acc = Vector2.add(springAcc, dampingAcc);

      node.velocity = Vector2.add(node.velocity, Vector2.scale(acc, ms / 1000));
    });
  }

  render() {}
}

class NodeRepulsion implements Renderable {
  nodes: GraphNode[];
  strength: number;
  minDistance: number;

  constructor({
    strength,
    minDistance,
  }: {
    strength: number;
    minDistance: number;
  }) {
    this.strength = strength;
    this.minDistance = minDistance;
  }

  add(...nodes: GraphNode[]) {
    this.nodes.push(...nodes);
  }

  tick(ms: number) {
    this.nodes.forEach((node) => {
      // Each node should feel repulsion from every other node,
      // proportional to 1/d^2 and 1/ms.
      const otherNodes = this.nodes.filter((n) => n !== node);
      otherNodes.forEach((other) => {
        const offset = Vector2.sub(node.position, other.position);
        const distance = Vector2.mag(offset);
        const acc = Vector2.scale(offset, this.strength / distance ** 2 / ms);
        node.velocity = Vector2.add(node.velocity, acc);
      });
    });
  }

  render() {}
}

const canvas = document.getElementById("game") as HTMLCanvasElement;
if (canvas !== null) {
  console.log("Canvas exists!");
} else {
  console.error("Canvas does not exist");
}

function setCanvasDimensions() {
  canvas.width = screen.width;
  canvas.height = screen.height;
}
setCanvasDimensions();
window.addEventListener("resize", setCanvasDimensions);

const ctx = canvas.getContext("2d")!;

const myScene = new Scene(ctx);
const node = new GraphNode(50, 50);
const centerWell = new GravityWell(200, 200);
centerWell.add(node);
myScene.add(centerWell, node);

function render(ms: number) {
  myScene.tick(ms);
  myScene.render();
  requestAnimationFrame(render);
}

setInterval(() => {
  console.log(node.position, node.velocity);
}, 50);

render(1);
