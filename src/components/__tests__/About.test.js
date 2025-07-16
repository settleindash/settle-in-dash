// src/pages/__tests__/About.test.js
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import About from "../About";

test("renders About page", () => {
  render(
    <MemoryRouter>
      <About />
    </MemoryRouter>
  );
  expect(screen.getByText("About Settle In DASH")).toBeInTheDocument();
  expect(screen.getByText(/Frederik Haahr/)).toBeInTheDocument();
});

// src/pages/__tests__/Support.test.js
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Support from "../Support";

test("submits support form", () => {
  render(
    <MemoryRouter>
      <Support />
    </MemoryRouter>
  );
  fireEvent.change(screen.getByLabelText("Support message"), {
    target: { value: "Test message" },
  });
  fireEvent.click(screen.getByText("Submit"));
  expect(screen.getByLabelText("Support message")).toHaveValue("");
});

// src/pages/__tests__/Transparency.test.js
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Transparency from "../Transparency";
import { useContracts } from "../../hooks/useContracts";

jest.mock("../../hooks/useContracts", () => ({
  useContracts: () => ({
    contracts: [
      {
        id: "124",
        question: "Will Team A win the championship?",
        status: "twist",
        resolution: "Yes",
        resolutionDetails: {
          reasoning: "Mock Grok response",
          timestamp: "2025-07-14T15:12:00Z",
        },
      },
    ],
  }),
}));

test("renders resolved Twists", () => {
  render(
    <MemoryRouter>
      <Transparency />
    </MemoryRouter>
  );
  expect(screen.getByText("Contract #124: Will Team A win the championship?")).toBeInTheDocument();
});