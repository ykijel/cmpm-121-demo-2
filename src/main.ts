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

// Variables to track drawing state
let isDrawing = false;

// Helper functions for drawing
const startDrawing = (e: MouseEvent) => {
  isDrawing = true;
  draw(e); // Draw immediately on mousedown
};

const stopDrawing = () => {
  isDrawing = false;
  ctx.beginPath(); // Reset path to avoid connecting lines
};

const draw = (e: MouseEvent) => {
  if (!isDrawing) return;

  // Get mouse position relative to the canvas
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  // Draw a small circle/line at the mouse position
  ctx.lineWidth = 5; // Marker thickness
  ctx.lineCap = "round"; // Smooth edges
  ctx.strokeStyle = "black"; // Marker color

  ctx.lineTo(x, y);
  ctx.stroke();
  ctx.beginPath(); // Begin a new path to continue drawing
  ctx.moveTo(x, y);
};

// Event listeners for drawing on canvas
canvas.addEventListener("mousedown", startDrawing);
canvas.addEventListener("mousemove", draw);
canvas.addEventListener("mouseup", stopDrawing);
canvas.addEventListener("mouseout", stopDrawing); // Stop drawing if the mouse leaves the canvas

// Clear button functionality
clearButton.addEventListener("click", () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // Clears the entire canvas
});
