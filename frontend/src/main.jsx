import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import ToastListener from "./components/layout/ToastListener.jsx";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

registerSW({ immediate: true });

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ToastListener />
    <App />
  </React.StrictMode>
);
