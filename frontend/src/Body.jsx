import React from "react";
import { Link } from "react-router-dom";

const Home = () => {
  return (
    <main className="body">
      <section className="hero">
        <h1>New Collection</h1>
        <p>Explore the latest arrivals</p>
        <Link to="/products" className="btn-primary">
          Shop Now
        </Link>
      </section>

      <section className="featured">
        <h2>Welcome to Our Store</h2>
        <p>Browse our products and find your favorites.</p>
      </section>
    </main>
  );
};

export default Home/*  */;
