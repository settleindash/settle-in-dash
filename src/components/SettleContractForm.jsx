// src/components/SettleContractForm.jsx
// Component to handle settlement submission for a selected contract.

import { useState } from "react";

const SettleContractForm = ({
  selectedContractId,
  filteredContracts,
  settleContract,
  setSubmitterWalletAddress,
  setWinnerWalletAddress,
  setReasoning,
  setSelectedContractId,
  setError,
  error, // Added prop
}) => {
  const [submitterWalletAddress, setLocalSubmitterWalletAddress] = useState("");
  const [winnerWalletAddress, setLocalWinnerWalletAddress] = useState("");
  const [reasoning, setLocalReasoning] = useState("");

  const validBase58Chars = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;

  const validateWalletAddress = (address) => {
    if (!address) {
      console.log("SettleContractForm: validateWalletAddress - Address is empty");
      return false;
    }
    if (address.length !== 34) {
      console.log(`SettleContractForm: validateWalletAddress - Invalid length: ${address.length}`);
      return false;
    }
    if (!address.startsWith("X")) {
      console.log("SettleContractForm: validateWalletAddress - Does not start with 'X'");
      return false;
    }
    if (!validBase58Chars.test(address)) {
      console.log(`SettleContractForm: validateWalletAddress - Invalid characters in: ${address}`);
      return false;
    }
    console.log(`SettleContractForm: validateWalletAddress - Valid address: ${address}`);
    return true;
  };

  const handleSettle = async (e) => {
    e.preventDefault();
    console.log("SettleContractForm: Submitting settlement for contract_id:", selectedContractId);
    setError("");

    if (!selectedContractId) {
      setError("Please select a contract.");
      console.log("SettleContractForm: Validation failed - no contract selected");
      return;
    }
    if (!validateWalletAddress(submitterWalletAddress)) {
      setError("Please provide a valid DASH wallet address (34 characters, starts with 'X').");
      console.log("SettleContractForm: Validation failed - invalid submitter wallet address");
      return;
    }
    if (!winnerWalletAddress) {
      setError("Please select a winner or tie.");
      console.log("SettleContractForm: Validation failed - no winner choice");
      return;
    }
    if (!reasoning) {
      setError("Please provide reasoning for your choice.");
      console.log("SettleContractForm: Validation failed - no reasoning");
      return;
    }
    if (reasoning.length > 1000) {
      setError("Reasoning must be less than 1000 characters.");
      console.log("SettleContractForm: Validation failed - reasoning too long");
      return;
    }

    const contract = filteredContracts.find((c) => c.contract_id === selectedContractId);
    if (!contract) {
      setError("Selected contract not found.");
      console.log("SettleContractForm: Validation failed - contract not found");
      return;
    }
    if (submitterWalletAddress !== contract.WalletAddress && submitterWalletAddress !== contract.accepterWalletAddress) {
      setError("Unauthorized: You must be the creator or accepter.");
      console.log("SettleContractForm: Validation failed - unauthorized submitter");
      return;
    }
    if (winnerWalletAddress !== "tie" && winnerWalletAddress !== contract.WalletAddress && winnerWalletAddress !== contract.accepterWalletAddress) {
      setError("Winner must be creator, accepter, or tie.");
      console.log("SettleContractForm: Validation failed - invalid winner choice");
      return;
    }

    const result = await settleContract(selectedContractId, submitterWalletAddress, winnerWalletAddress, reasoning);
    if (result.success) {
      console.log("SettleContractForm: Settlement submitted successfully:", result.message);
      setLocalSubmitterWalletAddress("");
      setLocalWinnerWalletAddress("");
      setLocalReasoning("");
      setSelectedContractId(null);
      setSubmitterWalletAddress("");
      setWinnerWalletAddress("");
      setReasoning("");
      alert(result.message);
    } else {
      setError(`Error: ${result.error}`);
      console.error("SettleContractForm: Failed to submit settlement:", result.error);
    }
  };

  return (
    <div className="space-y-6 mb-6">
      <h3 className="text-base sm:text-lg font-semibold">Submit Winner for Contract #{selectedContractId}</h3>
      <form onSubmit={handleSettle} className="space-y-4">
        <div>
          <label htmlFor="submitterWalletAddress" className="block text-base sm:text-lg font-bold text-primary mb-2">
            Your Wallet Address
          </label>
          <input
            id="submitterWalletAddress"
            type="text"
            className="border p-2 rounded w-full min-h-[44px] text-[10px] sm:text-base"
            value={submitterWalletAddress}
            onChange={(e) => {
              console.log("SettleContractForm: Submitter wallet address changed:", e.target.value);
              setLocalSubmitterWalletAddress(e.target.value);
              setSubmitterWalletAddress(e.target.value);
            }}
            placeholder="Enter your wallet address"
            aria-label="Submitter wallet address"
          />
        </div>
        <div>
          <label htmlFor="winnerWalletAddress" className="block text-base sm:text-lg font-bold text-primary mb-2">
            Winner Choice
          </label>
          <select
            id="winnerWalletAddress"
            className="border p-2 rounded w-full min-h-[44px] text-[10px] sm:text-base"
            value={winnerWalletAddress}
            onChange={(e) => {
              console.log("SettleContractForm: Winner choice changed:", e.target.value);
              setLocalWinnerWalletAddress(e.target.value);
              setWinnerWalletAddress(e.target.value);
            }}
            aria-label="Winner choice for settling contract"
          >
            <option value="">Select winner or tie</option>
            <option value={filteredContracts.find((c) => c.contract_id === selectedContractId)?.WalletAddress}>
              Creator ({filteredContracts.find((c) => c.contract_id === selectedContractId)?.WalletAddress})
            </option>
            <option value={filteredContracts.find((c) => c.contract_id === selectedContractId)?.accepterWalletAddress}>
              Accepter ({filteredContracts.find((c) => c.contract_id === selectedContractId)?.accepterWalletAddress})
            </option>
            <option value="tie">Tie</option>
          </select>
        </div>
        <div>
          <label htmlFor="reasoning" className="block text-base sm:text-lg font-bold text-primary mb-2">
            Reasoning
          </label>
          <textarea
            id="reasoning"
            className="border p-2 rounded w-full min-h-[100px] text-[10px] sm:text-base"
            value={reasoning}
            onChange={(e) => {
              console.log("SettleContractForm: Reasoning changed:", e.target.value);
              setLocalReasoning(e.target.value);
              setReasoning(e.target.value);
            }}
            placeholder="Enter reasoning for your winner choice (required)"
            aria-label="Reasoning for winner choice"
          />
        </div>
        {error && <p className="text-red-500 text-xs sm:text-base">{error}</p>} {/* Use error prop */}
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 min-h-[44px] text-[10px] sm:text-base"
          disabled={false}
          aria-label="Submit winner choice"
        >
          Submit Winner Choice
        </button>
      </form>
    </div>
  );
};

export default SettleContractForm;