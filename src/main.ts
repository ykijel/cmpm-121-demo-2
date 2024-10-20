import "./style.css";

const APP_NAME = "Yahli's Game";
const app = document.querySelector<HTMLDivElement>("#app")!;

// Set the document title and add canvas + buttons
app.innerHTML = `
  <h1>${APP_NAME}</h1>
  <canvas id="gameCanvas" width="256" height="256"></canvas>
  <button id="undoButton">Undo</button>
  <button id="redoButton">Redo</button>
  <button id="clearButton">Clear Canvas</button>
`;

const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const undoButton = document.getElementById("undoButton")!;
const redoButton = document.getElementById("redoButton")!;
const clearButton = document.getElementById("clearButton")!;

// Store strokes and redo stack
let strokes: { x: number; y: number }[][] = [];
let redoStack: { x: number; y: number }[][] = [];
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
    strokes.push(currentStroke); // Add current stroke to strokes array
    redoStack = []; // Clear redo stack on new drawing
    currentStroke = [];
    canvas.dispatchEvent(new Event("drawing-changed")); // Dispatch custom event
  }
};

// Function to add a point to the current stroke
const addPoint = (e: MouseEvent) => {
  if (!isDrawing) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  currentStroke.push({ x, y });
  canvas.dispatchEvent(new Event("drawing-changed")); // Dispatch custom event
};

// Function to clear and redraw the canvas based on the stored strokes
const redrawCanvas = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
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

// Undo functionality
undoButton.addEventListener("click", () => {
  if (strokes.length > 0) {
    const lastStroke = strokes.pop()!; // Remove the last stroke
    redoStack.push(lastStroke); // Add the last stroke to the redo stack
    canvas.dispatchEvent(new Event("drawing-changed")); // Dispatch custom event
  }
});

// Redo functionality
redoButton.addEventListener("click", () => {
  if (redoStack.length > 0) {
    const lastUndoneStroke = redoStack.pop()!; // Remove the last stroke from redo stack
    strokes.push(lastUndoneStroke); // Add it back to strokes array
    canvas.dispatchEvent(new Event("drawing-changed")); // Dispatch custom event
  }
});

// Clear button functionality
clearButton.addEventListener("click", () => {
  strokes = [];
  redoStack = [];
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
});

// Event listeners for drawing on canvas
canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mousemove", addPoint);
canvas.addEventListener("mouseup", stopDrawing);
canvas.addEventListener("mouseout", stopDrawing);

// Observer for "drawing-changed" event to redraw the canvas
canvas.addEventListener("drawing-changed", redrawCanvas);
