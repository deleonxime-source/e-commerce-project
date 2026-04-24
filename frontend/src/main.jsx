import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider } from "@asgardeo/auth-react";
import App from "./App.jsx";
import { asgardeoConfig } from "./config/asgardeo.js";
import "./App.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <AuthProvider config={asgardeoConfig}>
    <App />
  </AuthProvider>
);
