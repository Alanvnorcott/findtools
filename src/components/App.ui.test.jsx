// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import App from "../App";

const routerFuture = {
  v7_relativeSplatPath: true,
  v7_startTransition: true
};

describe("App rendering", () => {
  it("renders the homepage without crashing", () => {
    render(
      <MemoryRouter future={routerFuture} initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /practical tools for everyday work/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /about us/i })).toBeInTheDocument();
  });

  it("opens search and shows matching tools", async () => {
    render(
      <MemoryRouter future={routerFuture} initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole("button", { name: /open search/i }));
    fireEvent.change(screen.getByPlaceholderText(/search tools by name, tag, or task/i), {
      target: { value: "json formatter" }
    });

    const dialog = screen.getByPlaceholderText(/search tools by name, tag, or task/i).closest(".search-modal");
    expect(dialog).toBeTruthy();
    const match = await waitFor(() => {
      const link = within(dialog)
        .getAllByRole("link")
        .find((item) => item.getAttribute("href") === "/json-formatter");
      expect(link).toBeTruthy();
      return link;
    });
    expect(match).toBeTruthy();
  });

  it("renders a real tool route", async () => {
    render(
      <MemoryRouter future={routerFuture} initialEntries={["/json-formatter"]}>
        <App />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "JSON Formatter" })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /pin tool/i })).toBeInTheDocument();
  });
});
