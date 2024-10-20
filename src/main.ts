import "./style.css";

const APP_NAME = "Yahli's Game";
const app = document.querySelector<HTMLDivElement>("#app")!;

// Set the document title and add canvas + clear button
document.title = APP_NAME;
app.innerHTML = `
  <h1>${APP_NAME}</h1>
  <canvas id="gameCanvas" width="256" height="256"></canvas>
  <button id="clearButton">Clear Canvas</button>
`;

const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const clearButton = document.getElementById("clearButton")!;

// Store strokes as an array of arrays of points
let strokes: { x: number; y: number }[][] = [];
let currentStroke: { x: number; y: number }[] = [];
let isDrawing = false;

// Function to start a new stroke
const startDrawing = (e: MouseEvent) => {
  isDrawing = true;
  currentStroke = [];
  addPoint(e); // Add the initial point of the stroke
};

// Function to stop drawing and push the stroke to the strokes array
const stopDrawing = () => {
  if (!isDrawing) return;
  isDrawing = false;
  if (currentStroke.length > 0) {
    strokes.push(currentStroke); // Push the stroke to the strokes array
    currentStroke = [];
    canvas.dispatchEvent(new Event("drawing-changed")); // Dispatch custom event
  }
};

// Function to add a point to the current stroke
const addPoint = (e: MouseEvent) => {
  if (!isDrawing) return;

  // Get mouse position relative to the canvas
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  // Add the point to the current stroke
  currentStroke.push({ x, y });

  canvas.dispatchEvent(new Event("drawing-changed")); // Dispatch custom event
};

// Function to clear and redraw the canvas based on the stored strokes
const redrawCanvas = () => {
  // Clear the entire canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Redraw all strokes
  for (const stroke of strokes) {
    if (stroke.length === 0) continue;

    ctx.beginPath();
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "black";

    ctx.moveTo(stroke[0].x, stroke[0].y);

    for (let i = 1; i < stroke.length; i++) {
      const point = stroke[i];
      ctx.lineTo(point.x, point.y);
    }

    ctx.stroke();
  }
};

// Event listeners for drawing on the canvas
canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mousemove", addPoint);
canvas.addEventListener("mouseup", stopDrawing);
canvas.addEventListener("mouseout", stopDrawing); // Stop drawing if the mouse leaves the canvas

// Observer for "drawing-changed" event to redraw the canvas
canvas.addEventListener("drawing-changed", redrawCanvas);

// Clear button functionality
clearButton.addEventListener("click", () => {
  strokes = []; // Clear the strokes array
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
});
