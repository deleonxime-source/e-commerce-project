import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Footer from "./Footer.jsx";
import Body from "./Body.jsx";

const App = () => {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Body />} />
        </Routes>
      </BrowserRouter>

      <Footer />
    </>
  );
};

export default App;

