// @vitest-environment jsdom
import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CountdownTimer, RangeField } from "./common";

describe("shared countdown timer", () => {
  it("renders a digital countdown when active", () => {
    render(<CountdownTimer active label="Timer" remainingSeconds={3665} />);

    expect(screen.getAllByText("01")).toHaveLength(2);
    expect(screen.getByText("05")).toBeInTheDocument();
    expect(screen.getByText(/timer is running live/i)).toBeInTheDocument();
  });

  it("renders the idle state when inactive", () => {
    render(<CountdownTimer active={false} idleText="Nothing running." remainingSeconds={null} />);

    expect(screen.getByText(/nothing running/i)).toBeInTheDocument();
  });

  it("keeps range and number inputs in sync", () => {
    let currentValue = "1.5";
    const handleChange = (nextValue) => {
      currentValue = nextValue;
    };

    const { rerender } = render(<RangeField label="Gain" max="3" min="0.5" step="0.1" value={currentValue} onChange={handleChange} />);

    const slider = screen.getByLabelText(/gain slider/i);
    fireEvent.change(slider, { target: { value: "2.2" } });
    rerender(<RangeField label="Gain" max="3" min="0.5" step="0.1" value={currentValue} onChange={handleChange} />);
    expect(screen.getByLabelText(/gain value/i)).toHaveValue(2.2);
    expect(screen.getByText("0.5")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });
});
