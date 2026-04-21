import { Link } from 'react-router-dom';

function Header() {
  return (
    <header className="navbar">
      <div className="navbar__left">
        <Link to="/" className="navbar__wordmark">
          CORPS <span className="diamond">◆</span> OBJECT
        </Link>
        <span className="navbar__ref">E-commerce project</span>
      </div>

      <nav className="navbar__nav">
        <Link to="/products">Products</Link>
        <Link to="/cart">Cart</Link>
        <Link to="/admin">Admin</Link>
      </nav>
    </header>
  );
}

export default Header;
