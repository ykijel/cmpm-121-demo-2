import "./style.css";

const APP_NAME = "Yahli's Game";
const app = document.querySelector<HTMLDivElement>("#app")!;

const STICKER_FONT = "32px Arial";
const STICKER_TEXT_ALIGN = "center";
const STICKER_TEXT_BASELINE = "middle";

// UI remains the same
app.innerHTML = `
  <h1>${APP_NAME}</h1>
  <canvas id="gameCanvas" width="256" height="256"></canvas>
  <div>
    <button id="thinTool">Thin Marker</button>
    <button id="thickTool">Thick Marker</button>
    <input type="color" id="colorPicker" value="#000000">
  </div>
  <div>
    <button id="undoButton">Undo</button>
    <button id="redoButton">Redo</button>
    <button id="clearButton">Clear Canvas</button>
  </div>
  <div id="stickerButtons">
    <!-- Sticker buttons will be populated dynamically -->
  </div>
  <div>
    <label for="rotationSlider">Rotate Sticker (0-360):</label>
    <input type="range" id="rotationSlider" min="0" max="360" value="0">
    <output id="outputValue">0</output>
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
const colorPicker = document.getElementById("colorPicker") as HTMLInputElement;
const rotationSlider: HTMLInputElement | null = document.querySelector<HTMLInputElement>('#rotationSlider');
const rotationOutput: HTMLOutputElement | null = document.querySelector<HTMLOutputElement>('#outputValue');
if (rotationSlider && rotationOutput) {
    rotationSlider.addEventListener('input', () => {
        rotationOutput.innerHTML = rotationSlider.value;
    });
}

// State variables
let currentThickness = 2;
let currentColor = "#000000";
let isDrawing = false;
let toolPreview: ToolPreview | null = null;
let currentSticker: Sticker | null = null;
let stickerPreview: StickerPreview | null = null;
let isStickerMode = false;
let currentRotation = 0; // New state for tracking current rotation

// Array of stickers
let stickers = [
  { emoji: "🌸" },
  { emoji: "✨" },
  { emoji: "💎" },
  { emoji: "🎨" },
  { emoji: "🍀" },
];

// Function to get random rotation (in radians)
const getRotation = () => {
  return +rotationSlider!.value;
};

// Updated create buttons function to handle rotation
const stickerButtonsContainer = document.getElementById("stickerButtons")!;
const createStickerButtons = () => {
  stickerButtonsContainer.innerHTML = "";
  stickers.forEach((sticker, index) => {
    const button = document.createElement("button");
    button.textContent = sticker.emoji;
    button.addEventListener("click", () => {
      // Get new random rotation each time button is clicked
      currentRotation = getRotation();
      selectSticker(index);
    });
    stickerButtonsContainer.appendChild(button);
  });
};

// MarkerLine class remains the same
class MarkerLine {
  points: { x: number; y: number }[];
  thickness: number;
  color: string;

  constructor(initialX: number, initialY: number, thickness: number, color: string) {
    this.points = [{ x: initialX, y: initialY }];
    this.thickness = thickness;
    this.color = color;
  }

  drag(x: number, y: number) {
    this.points.push({ x, y });
  }

  display(ctx: CanvasRenderingContext2D) {
    if (this.points.length < 2) return;

    ctx.beginPath();
    ctx.lineWidth = this.thickness;
    ctx.lineCap = "round";
    ctx.strokeStyle = this.color;

    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; i++) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }

    ctx.stroke();
  }
}

class ToolPreview {
  x: number;
  y: number;
  thickness: number;
  color: string;

  constructor(x: number, y: number, thickness: number, color: string) {
    this.x = x;
    this.y = y;
    this.thickness = thickness;
    this.color = color;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = this.color;
    ctx.arc(this.x, this.y, this.thickness / 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  updatePosition(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

// Updated Sticker class with rotation
class Sticker {
  x: number;
  y: number;
  sticker: string;
  rotation: number;

  constructor(x: number, y: number, sticker: string, rotation: number) {
    this.x = x;
    this.y = y;
    this.sticker = sticker;
    this.rotation = rotation;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.font = STICKER_FONT;
    ctx.textAlign = STICKER_TEXT_ALIGN;
    ctx.textBaseline = STICKER_TEXT_BASELINE;
    ctx.fillText(this.sticker, 0, 0);
    ctx.restore();
  }

  drag(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

// Updated StickerPreview class with rotation
class StickerPreview {
  x: number;
  y: number;
  sticker: string;
  rotation: number;

  constructor(x: number, y: number, sticker: string, rotation: number) {
    this.x = x;
    this.y = y;
    this.sticker = sticker;
    this.rotation = rotation;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.font = STICKER_FONT;
    ctx.textAlign = STICKER_TEXT_ALIGN;
    ctx.textBaseline = STICKER_TEXT_BASELINE;
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillText(this.sticker, 0, 0);
    ctx.restore();
  }

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

// Marker drawing logic remains the same
const startMarkerLine = (e: MouseEvent) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  currentLine = new MarkerLine(x, y, currentThickness, currentColor);
  strokes.push(currentLine);
  isDrawing = true;
  redoStack = [];
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

// Updated sticker placement with rotation
const startStickerPlacement = (e: MouseEvent) => {
  if (!isStickerMode) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (currentSticker) {
    stickersPlaced.push(new Sticker(x, y, currentSticker.sticker, currentRotation));
    redoStack = [];
    canvas.dispatchEvent(new Event("drawing-changed"));
    stickerPreview = null;
  }
};

// Updated sticker preview with rotation
const updateStickerPreview = (e: MouseEvent) => {
  if (!isStickerMode) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (currentSticker && !isDrawing) {
    if (!stickerPreview) {
      stickerPreview = new StickerPreview(x, y, currentSticker.sticker, currentRotation);
    } else {
      stickerPreview.updatePosition(x, y);
    }
    canvas.dispatchEvent(new Event("drawing-changed"));
  }
};

// Display the stroke
const renderStroke = (stroke: MarkerLine, ctx: CanvasRenderingContext2D) => {
  stroke.display(ctx);
};

// Draw the sticker
const renderSticker = (sticker: Sticker, ctx: CanvasRenderingContext2D) => {
  sticker.draw(ctx);
};

// Canvas redraw function remains the same
const redrawCanvas = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  strokes.forEach(stroke => renderStroke(stroke, ctx));
  stickersPlaced.forEach(sticker => renderSticker(sticker, ctx));

  if (!isDrawing && toolPreview && !isStickerMode) {
    toolPreview.draw(ctx);
  }

  if (stickerPreview) {
    stickerPreview.draw(ctx);
  }
};

// Undo/Redo functions remain the same
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

const clearCanvas = () => {
  strokes = [];
  stickersPlaced = [];
  redoStack = [];
  canvas.dispatchEvent(new Event("drawing-changed"));
};

// Tool selection
thinTool.addEventListener("click", () => {
  currentThickness = 3;
  toolPreview = new ToolPreview(0, 0, currentThickness, currentColor);
  isStickerMode = false;
});

thickTool.addEventListener("click", () => {
  currentThickness = 10;
  toolPreview = new ToolPreview(0, 0, currentThickness, currentColor);
  isStickerMode = false;
});

// Color picker event listener
colorPicker.addEventListener("input", (e) => {
  currentColor = (e.target as HTMLInputElement).value;
  if (toolPreview) {
    toolPreview = new ToolPreview(toolPreview.x, toolPreview.y, currentThickness, currentColor);
    canvas.dispatchEvent(new Event("drawing-changed"));
  }
});

// Updated selectSticker function
const selectSticker = (index: number) => {
  currentSticker = new Sticker(0, 0, stickers[index].emoji, currentRotation);
  isStickerMode = true;
  stickerPreview = null;
};

// Add custom sticker button handler
addStickerButton.addEventListener("click", () => {
  const customSticker = prompt("Enter an emoji or character for your custom sticker:", "⭐");
  if (customSticker) {
    stickers.push({ emoji: customSticker });
    createStickerButtons();
  }
});

// Export function remains the same
const exportCanvas = () => {
  const exportCanvas = document.createElement("canvas");
  exportCanvas.width = 1024;
  exportCanvas.height = 1024;
  const exportCtx = exportCanvas.getContext("2d")!;

  exportCtx.scale(4, 4);

  strokes.forEach(stroke => stroke.display(exportCtx));
  stickersPlaced.forEach(sticker => sticker.draw(exportCtx));

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

// Event listeners
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