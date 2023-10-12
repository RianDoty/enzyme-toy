import { Vector2 } from "./Vector2";

// X and Y point to center of node
export interface Renderable {
    render: (ctx: CanvasRenderingContext2D) => void;
    tick: (ms: number) => void;
    z: number
}

export class Scene {
    ctx: CanvasRenderingContext2D;
    renderables: Renderable[];

    constructor(ctx: CanvasRenderingContext2D) {
        this.ctx = ctx;
        this.renderables = [];
    }

    add(toAdd: Renderable[], z = 0) {

        for (const [i, renderable] of this.renderables.entries()) {
            if (renderable.z > z) {
                this.renderables.splice(i, 0, ...toAdd)
                return;
            }
        }
        this.renderables.push(...toAdd)
    }

    tick(ms: number) {
        this.renderables.forEach((r) => r.tick(ms));
    }

    // To be called once per frame
    render() {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        this.renderables.forEach((r) => r.render(this.ctx));
    }
}

export class GraphNode implements Renderable {
    position: Vector2;
    velocity: Vector2;
    size: number;
    z: number

    constructor(x = 0, y = 0, size = 20) {
        this.position = { x, y };
        this.velocity = { x: 0, y: 0 };
        this.size = size;
        this.z = 0
    }

    tick(ms: number) {
        const delta = Vector2.scale(this.velocity, ms / 1000);
        this.position = Vector2.add(this.position, delta);
    }

    render(ctx: CanvasRenderingContext2D) {
        ctx.beginPath();
        ctx.lineWidth = 2
        const canvasPos = Vector2.toCanvasSpace(this.position)
        ctx.arc(canvasPos.x, canvasPos.y, this.size, 0, 2 * Math.PI);
        ctx.fillStyle = 'white'
        ctx.fill()
        ctx.stroke();
    }
}

export class Connection implements Renderable {
    from: GraphNode
    to: GraphNode
    target: number
    dashed: boolean
    z: number

    constructor(from: GraphNode, to: GraphNode, { target = 100, dashed = false } = {}) {
        this.from = from
        this.to = to
        this.target = target
        this.dashed = dashed
        this.z = 0
    }

    tick(ms: number) {
        //Each connection is a spring that pulls on both nodes
        const from = this.from
        const to = this.to
        const offset = Vector2.sub(to.position, from.position)
        const distance = this.target - Vector2.mag(offset)

        const force = Vector2.scale(Vector2.unit(offset), distance * Vector2.mag(offset))
        const acceleration1 = Vector2.scale(force, -1 * ms / 1000)
        const acceleration2 = Vector2.scale(force, ms / 1000)

        from.velocity = Vector2.add(from.velocity, acceleration1)
        to.velocity = Vector2.add(to.velocity, acceleration2)
    }

    render(ctx: CanvasRenderingContext2D) {
        const fromP = Vector2.toCanvasSpace(this.from.position)
        const toP = Vector2.toCanvasSpace(this.to.position)
        ctx.beginPath()
        ctx.moveTo(fromP.x, fromP.y)
        ctx.lineTo(toP.x, toP.y)
        ctx.stroke()
    }
}

export class DesiredConnection implements Renderable {
    declare dashed: true
    from: GraphNode
    to: GraphNode
    opacity: number
    target: number
    z:number

    constructor(from: GraphNode, to: GraphNode) {
        this.from = from
        this.to = to
        this.opacity = 0
        this.target = 50
        this.z = 0
    }

    tick(ms: number) {
        //Each connection is a spring that pulls on both nodes
        const from = this.from
        const to = this.to
        const offset = Vector2.sub(to.position, from.position)
        const distance = this.target - Vector2.mag(offset)

        const scalar = -1 * distance * Math.exp(-1 * (distance/this.target)**10) * Vector2.mag(offset)
        this.opacity = Math.max((distance - this.target) / distance)
        const force = Vector2.scale(Vector2.unit(offset), scalar)

        const acceleration1 = Vector2.scale(force, ms / 1000)
        const acceleration2 = Vector2.scale(force, -1 * ms / 1000)

        from.velocity = Vector2.add(from.velocity, acceleration1)
        to.velocity = Vector2.add(to.velocity, acceleration2)
    }

    render(ctx: CanvasRenderingContext2D) {
        const fromP = Vector2.toCanvasSpace(this.from.position)
        const toP = Vector2.toCanvasSpace(this.to.position)
        ctx.beginPath()
        ctx.moveTo(fromP.x, fromP.y)
        ctx.lineTo(toP.x, toP.y)
        ctx.setLineDash([5,15])

        const opacity = 
        ctx.strokeStyle = `rgb(${255 * (1-this.opacity)},${255 * (1-this.opacity)},${255 * (1-this.opacity)})`
        ctx.stroke()
        ctx.setLineDash([])
        ctx.strokeStyle ='rgb(0,0,0)'
    }
}

export class GravityWell implements Renderable {
    position: Vector2;
    nodes: GraphNode[];
    strength: number
    z: number

    constructor(x: number, y: number, strength=0.05) {
        this.position = { x, y };
        this.strength = strength
        this.nodes = [];
        this.z = 0
    }

    add(...nodes: GraphNode[]) {
        this.nodes.push(...nodes);
    }

    tick(ms: number) {
        this.nodes.forEach((node) => {
            let offset = Vector2.sub(node.position, this.position);
            const distance = Vector2.mag(offset)

            const damping = 0.2;
            const mass = 0.01

            const springAcc = Vector2.scale(Vector2.unit(offset), -1 * this.strength * distance);
            const dampingAcc = Vector2.scale(node.velocity, -1 * damping);

            const acc = Vector2.add(springAcc, dampingAcc);

            node.velocity = Vector2.add(node.velocity, Vector2.scale(acc, (ms / 1000) / mass));
        });
    }

    render() { }
}

export class NodeRepulsion implements Renderable {
    nodes: GraphNode[];
    strength: number;
    maxForce: number;
    z: number

    constructor({
        strength = 0.0005,
        maxForce = 10
    }: {
        strength?: number;
        maxForce?: number
    }) {
        this.nodes = []
        this.strength = strength;
        this.maxForce = maxForce
        this.z = 0
    }

    add(...nodes: GraphNode[]) {
        this.nodes.push(...nodes);
    }

    tick(ms: number) {
        this.nodes.forEach((node) => {
            const otherNodes = this.nodes.filter((n) => n !== node);

            otherNodes.forEach((other) => {
                // Coulomb's force - every node repulses one another
                // proportional to 1/d^2
                const offset = Vector2.sub(node.position, other.position);
                const distance = Vector2.mag(offset);
                if (distance === 0) return

                // this code works better for a clean sim, but is mathematically a mess
                //const force = Math.min(this.strength * Math.max(1 - distance**0.75/minDistance**0.75, 0), this.maxForce)

                const force = this.strength / distance ** 2
                const acceleration = Vector2.scale(offset, force * (ms / 1000));

                node.velocity = Vector2.add(node.velocity, acceleration);
            });
        });
    }

    render() { }
}

export class NodeGroup implements Renderable {
    nodes: GraphNode[]
    draggable: boolean
    dragDiv: HTMLDivElement
    z: number
    p1: Vector2
    p2: Vector2
    mouse: {oldPos: Vector2, delta: Vector2}
    offsets: Vector2[]

    constructor(nodes: GraphNode[] = [], draggable: boolean) {
        this.nodes = [...nodes]
        this.draggable = draggable
        this.z = 0
        this.p1 = { x: 0, y: 0 }
        this.p2 = { x: 0, y: 0 }
        this.mouse = {oldPos: {x: 0, y: 0}, delta: {x: 0, y: 0}}
        this.dragDiv = document.createElement('div')
        this.offsets = []
        document.body.appendChild(this.dragDiv)

        this.dragDiv.className = 'draggable'
        this.setupDrag()
    }

    private setupDrag() {
        this.dragDiv.onmousedown = (e) => this.onDragDown(e)
    }

    private onDragDown(e: MouseEvent) {
        this.mouse.oldPos = {x: e.clientX, y: e.clientY}
        document.onmouseup = () => this.closeDrag()
        document.onmousemove = (e) => this.drag(e)

        this.offsets = this.nodes.map(n => Vector2.sub(n.position, this.mouse.oldPos))
    }

    private drag(e: MouseEvent) {
        e.preventDefault()

        this.mouse.delta = Vector2.sub({x: e.clientX, y: e.clientY}, this.mouse.oldPos)
        this.mouse.oldPos = {x: e.clientX, y: e.clientY}

        //Shift the entire group
        this.nodes.forEach((n,i) => {
            n.position = Vector2.add(n.position, this.mouse.delta)
            n.velocity = Vector2.copy(this.mouse.delta)
        })
    }

    private closeDrag() {
        document.onmouseup = null;
        document.onmousemove = null;
    }


    private setDivStyle() {
        const pc1 = Vector2.toCanvasSpace(this.p1)
        const pc2 = Vector2.toCanvasSpace(this.p2)

        // Make the div a box drawn with opposit corners
        // at p1 to p2
        this.dragDiv.style.left = `${pc1.x}px`
        this.dragDiv.style.top = `${pc1.y}px`
        this.dragDiv.style.width = `${pc2.x - pc1.x}px`
        this.dragDiv.style.height = `${pc2.y - pc1.y}px`
    }

    tick() {
        // Get the bounding box of the group

        /// Start with some position
        this.p1 = Vector2.copy(this.nodes[0].position)
        this.p2 = Vector2.copy(this.nodes[0].position)

        /// Get the farthest north-west and
        /// farthest south-east points
        for (const node of this.nodes) {
            const r = node.size
            const pos = node.position
            // north-west
            if (pos.x - r < this.p1.x) this.p1.x = pos.x - r
            if (pos.y - r < this.p1.y) this.p1.y = pos.y - r
            // south-east
            if (pos.x + r > this.p2.x) this.p2.x = pos.x + r
            if (pos.y + r > this.p2.y) this.p2.y = pos.y + r
        }
        this.setDivStyle()
    }

    render() { }
}

