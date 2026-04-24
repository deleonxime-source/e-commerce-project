import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Header from "./components/layout/Header.jsx";
import Footer from "./components/layout/Footer.jsx";
import Cart from "./components/cart/Cart.jsx";
import Body from "./Body.jsx";
import ProductDetail from "./pages/ProductDetail.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import { AccessTokenBridge } from "./auth/AccessTokenBridge.jsx";
import { PostLoginRedirect } from "./auth/PostLoginRedirect.jsx";
import { RequireSignIn } from "./auth/RequireSignIn.jsx";
import { RequireAdmin } from "./auth/RequireAdmin.jsx";

const App = () => {
  return (
    <>
      <BrowserRouter>
        <AccessTokenBridge />
        <PostLoginRedirect />
        <Header />
        <Routes>
          <Route path="/" element={<Body />} />
          <Route path="/products" element={<Body />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route
            path="/cart"
            element={(
              <RequireSignIn>
                <Cart />
              </RequireSignIn>
            )}
          />
          <Route
            path="/admin"
            element={(
              <RequireAdmin>
                <AdminDashboard />
              </RequireAdmin>
            )}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      <Footer />
    </>
  );
};

export default App;

