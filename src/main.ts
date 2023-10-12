import { Vector2 } from "./Vector2";
import "./index.css";
import { Renderable, GraphNode, Connection, Scene, GravityWell, NodeGroup, NodeRepulsion, DesiredConnection } from "./classes";
import { enzymeData, activatorData, parseData } from "./molecules";

export const origin: Vector2 = {x: 0, y: 0}


const canvas = document.getElementById("game") as HTMLCanvasElement;
if (canvas !== null) {
  console.log("Canvas exists!");
} else {
  console.error("Canvas does not exist");
}

function setCanvasDimensions() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  origin.x = window.innerWidth / 2;
  origin.y = window.innerHeight / 2
}
setCanvasDimensions();
window.addEventListener("resize", setCanvasDimensions);

const ctx = canvas.getContext("2d")!;

const myScene = new Scene(ctx);
const centerWell = new GravityWell(0, 0, 0.01);
const sideWell = new GravityWell(-100, -100, 0.01)
const repulsion = new NodeRepulsion({strength: 100000})

const enzyme = parseData(enzymeData)
const activator = parseData(activatorData)

//Allow the enzyme and activator to bond
const desired = [[1,13],[3,4],[0,3]].map(([from, to]) => new DesiredConnection(activator.nodes[from], enzyme.nodes[to]))

centerWell.add(...enzyme.nodes);
sideWell.add(...activator.nodes)
repulsion.add(...enzyme.nodes, ...activator.nodes)
myScene.add([repulsion, centerWell, sideWell, ...enzyme.edges, ...enzyme.nodes, ...activator.edges, ...activator.nodes, ...desired, new NodeGroup(enzyme.nodes, true), new NodeGroup(activator.nodes, true)], -1);

let last = 0
const tickRate = 1/60 * 1000
let timeToSimulate = 0
function render(time: number) {
  const ms = time - last
  last = time

  //Run at a constant tick rate. Also prevents "jumps" when the animation is paused and unpaused, or a lag spike occurs
  timeToSimulate += ms
  let ticks = 0
  while (timeToSimulate > tickRate && ticks < 10000) {
    myScene.tick(tickRate)
    timeToSimulate -= tickRate
    ticks = ticks + 1
  }

  myScene.render();
  requestAnimationFrame(render);
}

render(0);