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

// Class to represent a line drawn by the user
class MarkerLine {
  points: { x: number; y: number }[];

  constructor(initialX: number, initialY: number) {
    this.points = [{ x: initialX, y: initialY }];
  }

  // Method to add a new point to the line
  drag(x: number, y: number) {
    this.points.push({ x, y });
  }

  // Method to draw the line on the canvas
  display(ctx: CanvasRenderingContext2D) {
    if (this.points.length < 2) return;

    ctx.beginPath();
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "black";

    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }

    ctx.stroke();
  }
}

// Store lines and redo stack
let strokes: MarkerLine[] = [];
let redoStack: MarkerLine[] = [];
let currentLine: MarkerLine | null = null;
let isDrawing = false;

// Start a new line when the user starts drawing
const startDrawing = (e: MouseEvent) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  isDrawing = true;
  currentLine = new MarkerLine(x, y); // Create a new line
};

// Stop drawing and add the line to the strokes array
const stopDrawing = () => {
  if (!isDrawing || !currentLine) return;

  isDrawing = false;
  strokes.push(currentLine); // Add the line to strokes
  redoStack = []; // Clear redo stack
  currentLine = null; // Reset current line
  canvas.dispatchEvent(new Event("drawing-changed")); // Dispatch custom event
};

// Add points to the current line as the user drags the mouse
const addPoint = (e: MouseEvent) => {
  if (!isDrawing || !currentLine) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  currentLine.drag(x, y); // Add the point to the line
  canvas.dispatchEvent(new Event("drawing-changed")); // Dispatch custom event
};

// Redraw the canvas based on the strokes
const redrawCanvas = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas

  // Display all the lines in the strokes array
  for (const stroke of strokes) {
    stroke.display(ctx); // Use the display method to draw the line
  }
};

// Undo functionality
undoButton.addEventListener("click", () => {
  if (strokes.length > 0) {
    const lastStroke = strokes.pop()!; // Remove the last stroke
    redoStack.push(lastStroke); // Add it to the redo stack
    canvas.dispatchEvent(new Event("drawing-changed")); // Dispatch custom event
  }
});

// Redo functionality
redoButton.addEventListener("click", () => {
  if (redoStack.length > 0) {
    const lastUndoneStroke = redoStack.pop()!; // Remove from redo stack
    strokes.push(lastUndoneStroke); // Add it back to strokes
    canvas.dispatchEvent(new Event("drawing-changed")); // Dispatch custom event
  }
});

// Clear button functionality
clearButton.addEventListener("click", () => {
  strokes = [];
  redoStack = [];
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas
});

// Event listeners for drawing on the canvas
canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mousemove", addPoint);
canvas.addEventListener("mouseup", stopDrawing);
canvas.addEventListener("mouseout", stopDrawing);

// Observer for "drawing-changed" event to redraw the canvas
canvas.addEventListener("drawing-changed", redrawCanvas);
