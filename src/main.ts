import "./style.css";

const APP_NAME = "Yahli's Game";
const app = document.querySelector<HTMLDivElement>("#app")!;

// Set up the app UI with canvas, tool buttons, and undo/redo buttons
app.innerHTML = `
  <h1>${APP_NAME}</h1>
  <canvas id="gameCanvas" width="256" height="256"></canvas>
  <div>
    <button id="thinTool">Thin Marker</button>
    <button id="thickTool">Thick Marker</button>
  </div>
  <div>
    <button id="undoButton">Undo</button>
    <button id="redoButton">Redo</button>
    <button id="clearButton">Clear Canvas</button>
  </div>
`;

const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const undoButton = document.getElementById("undoButton")!;
const redoButton = document.getElementById("redoButton")!;
const clearButton = document.getElementById("clearButton")!;
const thinTool = document.getElementById("thinTool")!;
const thickTool = document.getElementById("thickTool")!;

// Marker thickness state
let currentThickness = 2; // Default to thin marker
let isDrawing = false;
let toolPreview: ToolPreview | null = null; // Holds the current tool preview object

// Class to represent a line drawn by the user with a specific thickness
class MarkerLine {
  points: { x: number; y: number }[];
  thickness: number;

  constructor(initialX: number, initialY: number, thickness: number) {
    this.points = [{ x: initialX, y: initialY }];
    this.thickness = thickness;
  }

  // Method to add a new point to the line
  drag(x: number, y: number) {
    this.points.push({ x, y });
  }

  // Method to draw the line on the canvas with its specific thickness
  display(ctx: CanvasRenderingContext2D) {
    if (this.points.length < 2) return;

    ctx.beginPath();
    ctx.lineWidth = this.thickness;
    ctx.lineCap = "round";
    ctx.strokeStyle = "black";

    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }

    ctx.stroke();
  }
}

// Class to represent the tool preview
class ToolPreview {
  x: number;
  y: number;
  thickness: number;

  constructor(x: number, y: number, thickness: number) {
    this.x = x;
    this.y = y;
    this.thickness = thickness;
  }

  // Method to draw the preview circle on the canvas
  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
    ctx.arc(this.x, this.y, this.thickness / 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Update the position of the tool preview
  updatePosition(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

// Store lines and redo stack
let strokes: MarkerLine[] = [];
let redoStack: MarkerLine[] = [];
let currentLine: MarkerLine | null = null;

// Tool selection logic
const selectTool = (tool: string) => {
  if (tool === "thin") {
    currentThickness = 2; // Set thin marker thickness
    thinTool.classList.add("selectedTool"); // Add visual feedback
    thickTool.classList.remove("selectedTool");
  } else if (tool === "thick") {
    currentThickness = 8; // Set thick marker thickness
    thickTool.classList.add("selectedTool"); // Add visual feedback
    thinTool.classList.remove("selectedTool");
  }
};

// Start a new line when the user starts drawing
const startDrawing = (e: MouseEvent) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  isDrawing = true;
  currentLine = new MarkerLine(x, y, currentThickness); // Create a new line with selected thickness
  toolPreview = null; // Hide the tool preview while drawing
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

  // Display the tool preview if it exists
  if (!isDrawing && toolPreview) {
    toolPreview.draw(ctx); // Draw the preview circle
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

// Event listener for mouse movement to handle tool preview
canvas.addEventListener("mousemove", (e) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  // Update or create the tool preview
  if (!isDrawing) {
    if (!toolPreview) {
      toolPreview = new ToolPreview(x, y, currentThickness); // Create preview
    } else {
      toolPreview.updatePosition(x, y); // Update preview position
    }
    canvas.dispatchEvent(new Event("drawing-changed")); // Dispatch custom event to redraw the canvas
  }
});

// Event listeners for drawing on the canvas
canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mousemove", addPoint);
canvas.addEventListener("mouseup", stopDrawing);
canvas.addEventListener("mouseout", stopDrawing);

// Observer for "drawing-changed" event to redraw the canvas
canvas.addEventListener("drawing-changed", redrawCanvas);

// Tool button event listeners
thinTool.addEventListener("click", () => selectTool("thin"));
thickTool.addEventListener("click", () => selectTool("thick"));

// Set default tool
selectTool("thin");
