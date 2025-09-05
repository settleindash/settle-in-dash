// src/main.jsx
// Entry point for the SETTLE-IN-DASH React application, rendering the App component with React Router.

import './polyfills.js'; // Import polyfills first to ensure Buffer is available globally
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

console.log("main.jsx: Mounting app");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);