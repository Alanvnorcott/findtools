import { useEffect, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { categories } from "../data/categories";
import { SearchDialog } from "./SearchDialog";
import { SiteFooter } from "./SiteFooter";

export function AppShell({ children }) {
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar__inner">
          <Link className="brand" to="/">
            <span className="brand__mark">FT</span>
            <span>
              <strong>Findtools</strong>
              <small>Browser-only utility workspace</small>
            </span>
          </Link>
          <nav className="topnav" aria-label="Primary">
            {categories.map((category) => (
              <NavLink
                key={category.slug}
                className={({ isActive }) => (isActive ? "topnav__link topnav__link--active" : "topnav__link")}
                to={`/category/${category.slug}`}
              >
                {category.name}
              </NavLink>
            ))}
            <button
              aria-label="Open search"
              className="search-trigger"
              onClick={() => setSearchOpen(true)}
              type="button"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="11" cy="11" r="6.5" />
                <path d="M16 16l5 5" />
              </svg>
            </button>
          </nav>
        </div>
      </header>
      <SearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
      <main className="page">{children}</main>
      <SiteFooter />
    </div>
  );
}
