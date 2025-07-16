// src/components/__tests__/Contract.test.js
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Contract from "../pages/Contract";
import { useContracts } from "../hooks/useContracts";

jest.mock("../hooks/useContracts", () => ({
  useContracts: () => ({
    contracts: [
      {
        id: "123",
        question: "Will Bitcoin exceed $100,000?",
        stake: 10,
        odds: { yes: 1.8, no: 2.2 },
        category: "Crypto",
        status: "open",
        terminationDate: "2026-12-31T23:59:59Z",
        creator: "0xMockCreator",
        accepter: null,
      },
    ],
    acceptContract: jest.fn(),
    settleContract: jest.fn(),
    triggerTwist: jest.fn(),
  }),
}));

test("renders contract details", () => {
  render(
    <MemoryRouter initialEntries={["/contract/123"]}>
      <Routes>
        <Route path="/contract/:id" element={<Contract />} />
      </Routes>
    </MemoryRouter>
  );
  expect(screen.getByText("Will Bitcoin exceed $100,000?")).toBeInTheDocument();
  expect(screen.getByText("Accept")).toBeInTheDocument();
});