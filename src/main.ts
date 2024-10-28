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
  <div id="stickerButtons">
    <!-- Sticker buttons will be populated dynamically -->
  </div>
  <button id="addStickerButton">Add Custom Sticker</button>
  <button id="exportButton">Export</button>
`;

const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const undoButton = document.getElementById("undoButton")!;
const redoButton = document.getElementById("redoButton")!;
const clearButton = document.getElementById("clearButton")!;
const thinTool = document.getElementById("thinTool")!;
const thickTool = document.getElementById("thickTool")!;
const addStickerButton = document.getElementById("addStickerButton")!;
const exportButton = document.getElementById("exportButton")!;

// Marker thickness state and sticker selection
let currentThickness = 2; // Default to thin marker
let isDrawing = false;
let toolPreview: ToolPreview | null = null;
let currentSticker: Sticker | null = null; // Holds the selected sticker
let stickerPreview: StickerPreview | null = null; // Holds the sticker preview

// New state to track whether we're in "sticker mode" or "marker mode"
let isStickerMode = false; // Default to marker mode

// Array of stickers, including initial stickers and custom stickers
let stickers = [
  { emoji: "🌟" },
  { emoji: "🎃" },
  { emoji: "❤️" },
];

// Create buttons for each sticker in the stickers array
const stickerButtonsContainer = document.getElementById("stickerButtons")!;
const createStickerButtons = () => {
  stickerButtonsContainer.innerHTML = "";
  stickers.forEach((sticker, index) => {
    const button = document.createElement("button");
    button.textContent = sticker.emoji;
    button.addEventListener("click", () => selectSticker(index));
    stickerButtonsContainer.appendChild(button);
  });
};

// Initialize sticker buttons
createStickerButtons();

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
let stickersPlaced: Sticker[] = [];
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
    stickersPlaced.push(new Sticker(x, y, currentSticker.sticker)); // Place the sticker
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
  for (const sticker of stickersPlaced) {
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

// Undo/Redo Logic
const undoAction = () => {
  const lastAction = strokes.pop() || stickersPlaced.pop();
  if (lastAction) {
    redoStack.push(lastAction);
    canvas.dispatchEvent(new Event("drawing-changed"));
  }
};

const redoAction = () => {
  const action = redoStack.pop();
  if (action) {
    if (action instanceof MarkerLine) strokes.push(action);
    else if (action instanceof Sticker) stickersPlaced.push(action);
    canvas.dispatchEvent(new Event("drawing-changed"));
  }
};

// Clear canvas
const clearCanvas = () => {
  strokes = [];
  stickersPlaced = [];
  redoStack = [];
  canvas.dispatchEvent(new Event("drawing-changed"));
};

// Select thickness for markers
thinTool.addEventListener("click", () => {
  currentThickness = 2;
  toolPreview = new ToolPreview(0, 0, currentThickness);
  isStickerMode = false;
});

thickTool.addEventListener("click", () => {
  currentThickness = 6;
  toolPreview = new ToolPreview(0, 0, currentThickness);
  isStickerMode = false;
});

// Select sticker mode with a specific sticker
const selectSticker = (index: number) => {
  currentSticker = new Sticker(0, 0, stickers[index].emoji);
  isStickerMode = true;
  stickerPreview = null; // Reset the preview when selecting a new sticker
};

// Add custom sticker using prompt
addStickerButton.addEventListener("click", () => {
  const customSticker = prompt("Enter an emoji or character for your custom sticker:", "⭐");
  if (customSticker) {
    stickers.push({ emoji: customSticker });
    createStickerButtons();
  }
});

// Export Canvas to PNG
const exportCanvas = () => {
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = 1024;
  exportCanvas.height = 1024;
  const exportCtx = exportCanvas.getContext("2d")!;

  exportCtx.scale(4, 4); // Scale to 4x for 1024x1024 output

  // Draw all lines and stickers on export canvas
  strokes.forEach(stroke => stroke.display(exportCtx));
  stickersPlaced.forEach(sticker => sticker.draw(exportCtx));

  // Export canvas to PNG and trigger download
  exportCanvas.toBlob(blob => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      const downloadLink = document.createElement("a");
      downloadLink.href = url;
      downloadLink.download = "canvas_export.png";
      downloadLink.click();
      URL.revokeObjectURL(url);
    }
  });
};

// Add event listeners
canvas.addEventListener("mousedown", (e) => {
  if (isStickerMode) startStickerPlacement(e);
  else startMarkerLine(e);
});

canvas.addEventListener("mousemove", (e) => {
  if (!isStickerMode) continueMarkerLine(e);
  updateStickerPreview(e);
});

canvas.addEventListener("mouseup", finishMarkerLine);
canvas.addEventListener("mouseleave", finishMarkerLine);
canvas.addEventListener("drawing-changed", redrawCanvas);
undoButton.addEventListener("click", undoAction);
redoButton.addEventListener("click", redoAction);
clearButton.addEventListener("click", clearCanvas);
exportButton.addEventListener("click", exportCanvas);

createStickerButtons();
redrawCanvas();
