import { Link } from "react-router-dom";
import { categories } from "../data/categories";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <nav className="site-footer__links" aria-label="Footer">
          <Link to="/">Home</Link>
          <Link to="/about">About Us</Link>
          <Link to="/sitemap">Sitemap</Link>
          <Link to="/terms">Terms of Use</Link>
          <Link to="/privacy">Privacy Policy</Link>
        </nav>
        <div className="site-footer__categories">
          {categories.map((category) => (
            <Link key={category.slug} to={`/category/${category.slug}`}>
              {category.name}
            </Link>
          ))}
        </div>
        <p className="site-footer__copyright">© 2026 - 2026 findtools.net</p>
      </div>
    </footer>
  );
}
