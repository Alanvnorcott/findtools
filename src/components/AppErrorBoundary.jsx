import React from "react";

function clearFindtoolsBrowserState() {
  if (typeof window === "undefined") return;

  const keys = [];
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (key?.startsWith("findtools")) keys.push(key);
  }
  keys.forEach((key) => window.localStorage.removeItem(key));
}

export class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("Findtools render error", error, info);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <main className="app-crash-shell">
        <section className="app-crash-card">
          <p className="eyebrow">Rendering error</p>
          <h1>Findtools could not finish loading.</h1>
          <p>
            A startup error prevented the page from rendering normally. You can reload the page or clear saved Findtools
            browser data and try again.
          </p>
          {import.meta.env.DEV ? <pre>{String(this.state.error?.message || this.state.error)}</pre> : null}
          <div className="action-row">
            <button className="button" onClick={() => window.location.reload()} type="button">
              Reload page
            </button>
            <button
              className="button button--secondary"
              onClick={() => {
                clearFindtoolsBrowserState();
                window.location.reload();
              }}
              type="button"
            >
              Clear saved browser data
            </button>
          </div>
        </section>
      </main>
    );
  }
}
