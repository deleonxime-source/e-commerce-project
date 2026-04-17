import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
});

const Body = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProducts = async () => {
  try {
    const res = await api.get("/products");
    console.log("PRODUCTS RESPONSE:", res.data);  
    setProducts(res.data);
  } catch {
    setError("Failed to load products");
  }
};


  const fetchCategories = async () => {
    try {
      const res = await api.get("/categories");
      setCategories(res.data);
    } catch (err) {
      console.error("Failed to load categories", err);
    }
  };

  useEffect(() => {
    Promise.all([fetchProducts(), fetchCategories()]).finally(() =>
      setLoading(false)
    );
  }, []);

  const filtered = products
    .filter((p) =>
      selectedCategory ? p.category_id === selectedCategory : true
    )
    .filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <p>Loading products…</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <main className="body">
      <section className="hero">
        <h1>New Collection</h1>
        <p>Explore the latest arrivals</p>
        <Link to="/products" className="btn-primary">
          Shop Now
        </Link>
      </section>

      <section className="search-bar">
        <input
          type="text"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </section>

      <section className="category-filter">
        <button
          className={!selectedCategory ? "active" : ""}
          onClick={() => setSelectedCategory(null)}
        >
          All
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            className={selectedCategory === cat.id ? "active" : ""}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </section>

      <section className="product-grid">
        {filtered.length === 0 && <p>No products found.</p>}

        {filtered.map((product) => (
          <div key={product.id} className="product-card">
            <Link to={`/products/${product.id}`}>
              <div className="product-image">
                <img
                  src={product.image_url || "https://via.placeholder.com/150"}
                  alt={product.name}
                />
              </div>

              <div className="product-info">
                <p className="category">{product.category_name}</p>
                <h3>{product.name}</h3>
                <p className="price">${product.price}</p>
              </div>
            </Link>
          </div>
        ))}
      </section>
    </main>
  );
};

export default Body;
