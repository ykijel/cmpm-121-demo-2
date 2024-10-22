import "./style.css";

const APP_NAME = "Yahli's Game";
const app = document.querySelector<HTMLDivElement>("#app")!;

// Set up the app UI with canvas, tool buttons, undo/redo buttons, and sticker buttons
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
  <div>
    <button id="sticker1">🌟</button>
    <button id="sticker2">🎃</button>
    <button id="sticker3">❤️</button>
  </div>
`;

const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const undoButton = document.getElementById("undoButton")!;
const redoButton = document.getElementById("redoButton")!;
const clearButton = document.getElementById("clearButton")!;
const thinTool = document.getElementById("thinTool")!;
const thickTool = document.getElementById("thickTool")!;

// Sticker buttons
const sticker1Button = document.getElementById("sticker1")!;
const sticker2Button = document.getElementById("sticker2")!;
const sticker3Button = document.getElementById("sticker3")!;

// Marker thickness state and sticker selection
let currentThickness = 2; // Default to thin marker
let isDrawing = false;
let toolPreview: ToolPreview | null = null;
let currentSticker: Sticker | null = null; // Holds the selected sticker
let stickerPreview: StickerPreview | null = null; // Holds the sticker preview

// New state to track whether we're in "sticker mode" or "marker mode"
let isStickerMode = false; // Default to marker mode

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

// Class to represent a sticker
class Sticker {
  x: number;
  y: number;
  sticker: string;

  constructor(x: number, y: number, sticker: string) {
    this.x = x;
    this.y = y;
    this.sticker = sticker;
  }

  // Method to draw the sticker on the canvas
  draw(ctx: CanvasRenderingContext2D) {
    ctx.font = "32px Arial";
    ctx.fillText(this.sticker, this.x - 16, this.y + 16); // Centering the sticker
  }

  // Method to reposition the sticker
  drag(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

// Class to represent the sticker preview
class StickerPreview {
  x: number;
  y: number;
  sticker: string;

  constructor(x: number, y: number, sticker: string) {
    this.x = x;
    this.y = y;
    this.sticker = sticker;
  }

  // Method to draw the sticker preview on the canvas
  draw(ctx: CanvasRenderingContext2D) {
    ctx.font = "32px Arial";
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillText(this.sticker, this.x - 16, this.y + 16); // Centering the sticker preview
  }

  // Update the position of the sticker preview
  updatePosition(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

// Store lines, stickers, and redo stack
let strokes: MarkerLine[] = [];
let stickers: Sticker[] = [];
let redoStack: (MarkerLine | Sticker)[] = [];
let currentLine: MarkerLine | null = null;

// ** Marker Drawing Logic **
const startMarkerLine = (e: MouseEvent) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  currentLine = new MarkerLine(x, y, currentThickness);
  strokes.push(currentLine);
  isDrawing = true;
  redoStack = []; // Clear redo stack
};

const continueMarkerLine = (e: MouseEvent) => {
  if (!isDrawing || !currentLine) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  currentLine.drag(x, y);
  canvas.dispatchEvent(new Event("drawing-changed"));
};

const finishMarkerLine = () => {
  isDrawing = false;
  currentLine = null;
};

// ** Sticker Logic **
const startStickerPlacement = (e: MouseEvent) => {
  if (!isStickerMode) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (currentSticker) {
    stickers.push(new Sticker(x, y, currentSticker.sticker)); // Place the sticker
    redoStack = []; // Clear redo stack
    canvas.dispatchEvent(new Event("drawing-changed")); // Dispatch custom event
    stickerPreview = null; // Hide the preview after placing
  }
};

// Update sticker preview position as the mouse moves
const updateStickerPreview = (e: MouseEvent) => {
  if (!isStickerMode) return; // Only update preview in sticker mode

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (currentSticker && !isDrawing) {
    if (!stickerPreview) {
      stickerPreview = new StickerPreview(x, y, currentSticker.sticker); // Create sticker preview
    } else {
      stickerPreview.updatePosition(x, y); // Update sticker preview position
    }
    canvas.dispatchEvent(new Event("drawing-changed")); // Dispatch custom event to redraw the canvas
  }
};

// Redraw the canvas based on the strokes and stickers
const redrawCanvas = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear the canvas

  // Display all the lines in the strokes array
  for (const stroke of strokes) {
    stroke.display(ctx);
  }

  // Display all the stickers in the stickers array
  for (const sticker of stickers) {
    sticker.draw(ctx);
  }

  // Display the tool preview if it exists and user is not drawing or in sticker mode
  if (!isDrawing && toolPreview && !isStickerMode) {
    toolPreview.draw(ctx);
  }

  // Display sticker preview if in sticker mode
  if (stickerPreview) {
    stickerPreview.draw(ctx);
  }
};

// ** Tool Selection Logic **
thinTool.addEventListener("click", () => {
  currentThickness = 2; // Thin marker
  isStickerMode = false; // Switch to marker mode
  currentSticker = null; // No sticker selected
  toolPreview = new ToolPreview(0, 0, currentThickness); // Update tool preview
});

thickTool.addEventListener("click", () => {
  currentThickness = 6; // Thick marker
  isStickerMode = false; // Switch to marker mode
  currentSticker = null; // No sticker selected
  toolPreview = new ToolPreview(0, 0, currentThickness); // Update tool preview
});

// ** Sticker Selection Logic **
sticker1Button.addEventListener("click", () => {
  currentSticker = new Sticker(0, 0, "🌟"); // Select sticker
  isStickerMode = true; // Switch to sticker mode
  toolPreview = null; // Hide tool preview in sticker mode
});

sticker2Button.addEventListener("click", () => {
  currentSticker = new Sticker(0, 0, "🎃"); // Select sticker
  isStickerMode = true; // Switch to sticker mode
  toolPreview = null; // Hide tool preview in sticker mode
});

sticker3Button.addEventListener("click", () => {
  currentSticker = new Sticker(0, 0, "❤️"); // Select sticker
  isStickerMode = true; // Switch to sticker mode
  toolPreview = null; // Hide tool preview in sticker mode
});

// Event listeners for drawing markers
canvas.addEventListener("mousedown", (e) => {
  if (!isStickerMode) startMarkerLine(e);
});
canvas.addEventListener("mousemove", (e) => {
  if (isStickerMode) {
    updateStickerPreview(e); // Update sticker preview when moving the mouse
  } else {
    continueMarkerLine(e);
  }
});
canvas.addEventListener("mouseup", finishMarkerLine);
canvas.addEventListener("mouseleave", finishMarkerLine);

// Event listeners for placing stickers
canvas.addEventListener("click", (e) => {
  if (isStickerMode) startStickerPlacement(e);
});

// Redraw the canvas whenever the "drawing-changed" event is dispatched
canvas.addEventListener("drawing-changed", redrawCanvas);

// Undo, redo, and clear logic remain the same as before
undoButton.addEventListener("click", () => {
  if (strokes.length > 0) {
    const lastStroke = strokes.pop()!;
    redoStack.push(lastStroke);
    canvas.dispatchEvent(new Event("drawing-changed"));
  } else if (stickers.length > 0) {
    const lastSticker = stickers.pop()!;
    redoStack.push(lastSticker);
    canvas.dispatchEvent(new Event("drawing-changed"));
  }
});

redoButton.addEventListener("click", () => {
  if (redoStack.length > 0) {
    const lastRedo = redoStack.pop()!;
    if (lastRedo instanceof MarkerLine) {
      strokes.push(lastRedo);
    } else if (lastRedo instanceof Sticker) {
      stickers.push(lastRedo);
    }
    canvas.dispatchEvent(new Event("drawing-changed"));
  }
});

clearButton.addEventListener("click", () => {
  strokes = [];
  stickers = [];
  redoStack = [];
  canvas.dispatchEvent(new Event("drawing-changed"));
});
