import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";

// Global error handler for debugging production white screens
window.onerror = (message, source, lineno, colno, error) => {
  const errorDiv = document.createElement("div");
  errorDiv.style.position = "fixed";
  errorDiv.style.top = "0";
  errorDiv.style.left = "0";
  errorDiv.style.width = "100%";
  errorDiv.style.height = "100%";
  errorDiv.style.backgroundColor = "#202225";
  errorDiv.style.color = "#ff4444";
  errorDiv.style.padding = "20px";
  errorDiv.style.zIndex = "999999";
  errorDiv.style.fontFamily = "monospace";
  errorDiv.style.whiteSpace = "pre-wrap";
  errorDiv.innerHTML = `
    <h1 style="color: white">Startup Error Detected</h1>
    <p>Message: ${message}</p>
    <p>Source: ${source}</p>
    <p>Line: ${lineno}:${colno}</p>
    <hr style="border-color: #444" />
    <p>Stack Trace:</p>
    <p>${error?.stack || "No stack trace available"}</p>
  `;
  document.body.appendChild(errorDiv);
  return false;
};

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Failed to find root element");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
);
