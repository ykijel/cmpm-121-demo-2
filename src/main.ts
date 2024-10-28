import "./style.css";

const APP_NAME = "Yahli's Game";
const app = document.querySelector<HTMLDivElement>("#app")!;

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
  <div id="stickerButtons"></div>
  <div>
    <button id="addCustomSticker">Add Custom Sticker</button>
  </div>
`;

const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const undoButton = document.getElementById("undoButton")!;
const redoButton = document.getElementById("redoButton")!;
const clearButton = document.getElementById("clearButton")!;
const thinTool = document.getElementById("thinTool")!;
const thickTool = document.getElementById("thickTool")!;
const stickerButtonsDiv = document.getElementById("stickerButtons")!;
const addCustomStickerButton = document.getElementById("addCustomSticker")!;

let currentThickness = 2;
let isDrawing = false;
let toolPreview: ToolPreview | null = null;
let currentSticker: Sticker | null = null;
let stickerPreview: StickerPreview | null = null;
let isStickerMode = false;

class MarkerLine {
  points: { x: number; y: number }[];
  thickness: number;

  constructor(initialX: number, initialY: number, thickness: number) {
    this.points = [{ x: initialX, y: initialY }];
    this.thickness = thickness;
  }

  drag(x: number, y: number) {
    this.points.push({ x, y });
  }

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

class ToolPreview {
  x: number;
  y: number;
  thickness: number;

  constructor(x: number, y: number, thickness: number) {
    this.x = x;
    this.y = y;
    this.thickness = thickness;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.5)";
    ctx.arc(this.x, this.y, this.thickness / 2, 0, Math.PI * 2);
    ctx.stroke();
  }

  updatePosition(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

class Sticker {
  x: number;
  y: number;
  sticker: string;

  constructor(x: number, y: number, sticker: string) {
    this.x = x;
    this.y = y;
    this.sticker = sticker;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.font = "32px Arial";
    ctx.fillText(this.sticker, this.x - 16, this.y + 16);
  }

  drag(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

class StickerPreview {
  x: number;
  y: number;
  sticker: string;

  constructor(x: number, y: number, sticker: string) {
    this.x = x;
    this.y = y;
    this.sticker = sticker;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.font = "32px Arial";
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillText(this.sticker, this.x - 16, this.y + 16);
  }

  updatePosition(x: number, y: number) {
    this.x = x;
    this.y = y;
  }
}

// Data-driven array for stickers
const stickers = ["🌟", "🎃", "❤️"];
let strokes: MarkerLine[] = [];
let stickersPlaced: Sticker[] = [];
let redoStack: (MarkerLine | Sticker)[] = [];
let currentLine: MarkerLine | null = null;

const renderStickerButtons = () => {
  stickerButtonsDiv.innerHTML = "";
  stickers.forEach((sticker) => {
    const button = document.createElement("button");
    button.textContent = sticker;
    button.addEventListener("click", () => selectSticker(sticker));
    stickerButtonsDiv.appendChild(button);
  });
};

const selectSticker = (sticker: string) => {
  isStickerMode = true;
  currentSticker = new Sticker(0, 0, sticker);
  toolPreview = null;
};

const startMarkerLine = (e: MouseEvent) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  currentLine = new MarkerLine(x, y, currentThickness);
  strokes.push(currentLine);
  isDrawing = true;
  redrawCanvas(); // Redraw immediately to show the initial point
};

const continueMarkerLine = (e: MouseEvent) => {
  if (!isDrawing || !currentLine) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  currentLine.drag(x, y);
  redrawCanvas(); // Redraw on every new point to show live drawing
};


const finishMarkerLine = () => {
  isDrawing = false;
  currentLine = null;
};


const startStickerPlacement = (e: MouseEvent) => {
  if (!isStickerMode || !currentSticker) return;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const newSticker = new Sticker(x, y, currentSticker.sticker);
  stickersPlaced.push(newSticker); // Add to placed stickers
  stickerPreview = null; // Remove preview
  redrawCanvas(); // Redraw immediately to show the new sticker
};

const updateStickerPreview = (e: MouseEvent) => {
  if (!isStickerMode) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  if (currentSticker && !isDrawing) {
    if (!stickerPreview) {
      stickerPreview = new StickerPreview(x, y, currentSticker.sticker);
    } else {
      stickerPreview.updatePosition(x, y);
    }
    canvas.dispatchEvent(new Event("drawing-changed"));
  }
};

const redrawCanvas = () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const stroke of strokes) {
    stroke.display(ctx);
  }

  for (const sticker of stickersPlaced) {
    sticker.draw(ctx);
  }

  if (!isDrawing && toolPreview && !isStickerMode) {
    toolPreview.draw(ctx);
  }

  if (stickerPreview) {
    stickerPreview.draw(ctx);
  }
};

thinTool.addEventListener("click", () => {
  currentThickness = 2;
  isStickerMode = false;
  currentSticker = null;
  toolPreview = new ToolPreview(0, 0, currentThickness);
});

thickTool.addEventListener("click", () => {
  currentThickness = 6;
  isStickerMode = false;
  currentSticker = null;
  toolPreview = new ToolPreview(0, 0, currentThickness);
});

addCustomStickerButton.addEventListener("click", () => {
  const customSticker = prompt("Enter a custom sticker:", "⭐");
  if (customSticker) {
    stickers.push(customSticker);
    renderStickerButtons();
  }
});

undoButton.addEventListener("click", () => {
  if (strokes.length > 0) {
    redoStack.push(strokes.pop()!);
  } else if (stickersPlaced.length > 0) {
    redoStack.push(stickersPlaced.pop()!);
  }
  redrawCanvas(); // Redraw after undo
});

redoButton.addEventListener("click", () => {
  const lastRedo = redoStack.pop();
  if (lastRedo instanceof MarkerLine) {
    strokes.push(lastRedo);
  } else if (lastRedo instanceof Sticker) {
    stickersPlaced.push(lastRedo);
  }
  redrawCanvas(); // Redraw after redo
});

clearButton.addEventListener("click", () => {
  strokes = [];
  stickersPlaced = [];
  redoStack = [];
  redrawCanvas();
});

canvas.addEventListener("mousedown", startMarkerLine);
canvas.addEventListener("mousemove", continueMarkerLine);
canvas.addEventListener("mouseup", finishMarkerLine);
canvas.addEventListener("mouseleave", finishMarkerLine);
canvas.addEventListener("mousemove", updateStickerPreview);
canvas.addEventListener("click", startStickerPlacement);

renderStickerButtons();
