import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/layout/Header.jsx";
import Footer from "./components/layout/Footer.jsx";
import Cart from "./components/cart/Cart.jsx";
import Body from "./Body.jsx";
import ProductDetail from "./pages/ProductDetail.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";

const App = () => {
  return (
    <>
      <BrowserRouter>
        <Header />
        <Routes>
          <Route path="/" element={<Body />} />
          <Route path="/products" element={<Body />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      <Footer />
    </>
  );
};

export default App;

