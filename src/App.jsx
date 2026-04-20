import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { HomePage } from "./components/HomePage";
import { CategoryPage } from "./components/CategoryPage";
import { ToolPage } from "./components/ToolPage";
import { StaticPage } from "./components/StaticPage";
import { SitemapPage } from "./components/SitemapPage";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/sitemap" element={<SitemapPage />} />
        <Route
          path="/about"
          element={
            <StaticPage
              title="About Us"
              description="Findtools is a browser-first utility workspace built to make everyday tasks faster, simpler, and easier to trust."
            >
              <p>
                Findtools focuses on practical tools people actually use during work: formatting text, comparing data,
                converting files, running quick calculations, and generating structured outputs without sending data to a server.
              </p>
              <p>
                The product direction is straightforward: fast pages, clear inputs, transparent outputs, and a growing
                catalog of browser-based tools organized so people can find what they need quickly.
              </p>
            </StaticPage>
          }
        />
        <Route
          path="/privacy"
          element={
            <StaticPage
              title="Privacy Policy"
              description="Findtools is designed to keep tool processing in the browser whenever possible."
            >
              <p>
                Tool input is processed locally in your browser for the supported utilities on this site. Pinned tools
                and recent tools may be stored in local browser storage on your device to improve your experience.
              </p>
              <p>
                Findtools does not require account creation, authentication, or server-side processing for the core
                tool functionality implemented in this app.
              </p>
            </StaticPage>
          }
        />
        <Route
          path="/terms"
          element={
            <StaticPage
              title="Terms of Use"
              description="Use Findtools at your own discretion and verify outputs for any high-stakes use case."
            >
              <p>
                Findtools is provided as-is as a browser-based utility workspace. While the tools aim to be accurate
                and transparent, you are responsible for verifying outputs before relying on them for financial, legal,
                medical, or other high-impact decisions.
              </p>
              <p>
                You may use the site for normal personal or professional workflow tasks, subject to applicable law and
                any future service terms that may be published.
              </p>
            </StaticPage>
          }
        />
        <Route path="/category/:categorySlug" element={<CategoryPage />} />
        <Route path="/tools/:toolSlug" element={<ToolPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
