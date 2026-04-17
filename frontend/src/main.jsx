import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AuthProvider } from "@asgardeo/auth-react"; 
import "./App.css";

const config = {
  signInRedirectURL: "https://lab-10-1-wi1f.onrender.com/",
  signOutRedirectURL: "https://lab-10-1-wi1f.onrender.com/",
  clientID: "7IM589V4c9vF96f_aDoGs46fLO8a",
  baseUrl: "https://api.asgardeo.io/t/fullstackweb",
  scope: ["openid", "profile"]
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <AuthProvider config={config}>
    <App />
  </AuthProvider>
);
