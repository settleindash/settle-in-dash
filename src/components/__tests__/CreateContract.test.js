// src/components/__tests__/CreateContract.test.js
import { render, screen } from "@testing-library/react";
import CreateContract from "../CreateContract";
import { WalletProvider } from "../../context/WalletContext";
import { BrowserRouter } from "react-router-dom";
import { useContracts } from "../../hooks/useContracts";

jest.mock("../../hooks/useContracts", () => ({
  useContracts: () => ({
    createContract: jest.fn(),
  }),
}));

test("renders Create Contract form", () => {
  render(
    <WalletProvider>
      <BrowserRouter>
        <CreateContract />
      </BrowserRouter>
    </WalletProvider>
  );
  expect(screen.getByText("Create Contract")).toBeInTheDocument();
  expect(screen.getByLabelText("Contract question")).toBeInTheDocument();
});