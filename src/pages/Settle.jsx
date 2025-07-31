// src/pages/Settle.jsx
// Component for settling contracts or resolving twists, filtering by user wallet address.

import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useContracts } from "../hooks/useContracts";
import { useEvents } from "../hooks/useEvents";

const Settle = () => {
  const { contracts, fetchContracts, settleContract, triggerTwist, loading, error: apiError } = useContracts();
  const { events, getEvents } = useEvents();
  const [userWalletAddress, setUserWalletAddress] = useState("");
  const [submitterWalletAddress, setSubmitterWalletAddress] = useState("");
  const [winnerWalletAddress, setWinnerWalletAddress] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [selectedContractId, setSelectedContractId] = useState(null);
  const [error, setError] = useState("");

  const validBase58Chars = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;

  const validateWalletAddress = (address) => {
    if (!address) {
      console.log("Settle: validateWalletAddress - Address is empty");
      return false;
    }
    if (address.length !== 34) {
      console.log(`Settle: validateWalletAddress - Invalid length: ${address.length}`);
      return false;
    }
    if (!address.startsWith("X")) {
      console.log("Settle: validateWalletAddress - Does not start with 'X'");
      return false;
    }
    if (!validBase58Chars.test(address)) {
      console.log(`Settle: validateWalletAddress - Invalid characters in: ${address}`);
      return false;
    }
    console.log(`Settle: validateWalletAddress - Valid address: ${address}`);
    return true;
  };

  // Fetch all contracts and events on mount
  useEffect(() => {
    console.log("Settle: Fetching all contracts and events");
    fetchContracts({});
    getEvents({ status: "open" });
  }, [fetchContracts, getEvents]);

  // Map contracts to include eventTitle
  const filteredContracts = useMemo(() => {
    console.log("Settle: Filtering contracts, userWalletAddress:", userWalletAddress);
    if (!userWalletAddress || !validateWalletAddress(userWalletAddress)) {
      console.log("Settle: No valid wallet address provided, returning empty array");
      return [];
    }
    const filtered = contracts
      .filter(
        (c) =>
          c.WalletAddress === userWalletAddress || c.accepterWalletAddress === userWalletAddress
      )
      .map((contract) => {
        const event = events.find((e) => e.event_id === contract.event_id);
        return {
          ...contract,
          eventTitle: event ? event.title : "Not set",
        };
      });
    console.log("Settle: Filtered contracts with event titles:", filtered);
    return filtered;
  }, [contracts, events, userWalletAddress]);

  // Debug contracts data
  useEffect(() => {
    console.log("Settle: Raw contracts from useContracts:", contracts);
    console.log("Settle: Filtered contracts with event titles:", filteredContracts);
  }, [contracts, filteredContracts]);

  // Format status for display
  const formatStatus = (status) => {
    const statusMap = {
      open: "Open",
      accepted: "Accepted",
      cancelled: "Cancelled",
      settled: "Settled",
      twist: "Twist Pending",
    };
    return statusMap[status] || status;
  };

  // Handle settlement submission
  const handleSettle = async (e) => {
    e.preventDefault();
    console.log("Settle: Submitting settlement for contract_id:", selectedContractId);
    setError("");

    if (!selectedContractId) {
      setError("Please select a contract.");
      console.log("Settle: Validation failed - no contract selected");
      return;
    }
    if (!validateWalletAddress(submitterWalletAddress)) {
      setError("Please provide a valid DASH wallet address (34 characters, starts with 'X').");
      console.log("Settle: Validation failed - invalid submitter wallet address");
      return;
    }
    if (!winnerWalletAddress) {
      setError("Please select a winner or tie.");
      console.log("Settle: Validation failed - no winner choice");
      return;
    }
    if (!reasoning) {
      setError("Please provide reasoning for your choice.");
      console.log("Settle: Validation failed - no reasoning");
      return;
    }
    if (reasoning.length > 1000) {
      setError("Reasoning must be less than 1000 characters.");
      console.log("Settle: Validation failed - reasoning too long");
      return;
    }

    const contract = filteredContracts.find((c) => c.contract_id === selectedContractId);
    if (!contract) {
      setError("Selected contract not found.");
      console.log("Settle: Validation failed - contract not found");
      return;
    }
    if (submitterWalletAddress !== contract.WalletAddress && submitterWalletAddress !== contract.accepterWalletAddress) {
      setError("Unauthorized: You must be the creator or accepter.");
      console.log("Settle: Validation failed - unauthorized submitter");
      return;
    }
    if (winnerWalletAddress !== "tie" && winnerWalletAddress !== contract.WalletAddress && winnerWalletAddress !== contract.accepterWalletAddress) {
      setError("Winner must be creator, accepter, or tie.");
      console.log("Settle: Validation failed - invalid winner choice");
      return;
    }

    const result = await settleContract(selectedContractId, submitterWalletAddress, winnerWalletAddress, reasoning);
    if (result.success) {
      console.log("Settle: Settlement submitted successfully:", result.message);
      setSubmitterWalletAddress("");
      setWinnerWalletAddress("");
      setReasoning("");
      setSelectedContractId(null);
      alert(result.message);
    } else {
      setError(`Error: ${result.error}`);
      console.error("Settle: Failed to submit settlement:", result.error);
    }
  };

  // Handle twist resolution
  const handleResolveTwist = async (e) => {
    e.preventDefault();
    console.log("Settle: Resolving twist for contract_id:", selectedContractId);
    setError("");

    if (!selectedContractId) {
      setError("Please select a contract.");
      console.log("Settle: Validation failed - no contract selected for twist");
      return;
    }
    const contract = filteredContracts.find((c) => c.contract_id === selectedContractId);
    if (!contract) {
      setError("Selected contract not found.");
      console.log("Settle: Validation failed - contract not found for twist");
      return;
    }

    const result = await triggerTwist(selectedContractId);
    if (result.success) {
      console.log("Settle: Twist resolved successfully:", result.message);
      setSelectedContractId(null);
      alert(result.message);
    } else {
      setError(`Error: ${result.error}`);
      console.error("Settle: Failed to resolve twist:", result.error);
    }
  };

  // Render table for contracts
  const renderTable = (contractsToRender, title) => (
    <div className="mt-6">
      <h2 className="text-base sm:text-xl font-semibold mb-4">{title}</h2>
      {contractsToRender.length === 0 ? (
        <p className="text-gray-600 text-xs sm:text-base">No {title.toLowerCase()} available.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border rounded-lg shadow">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="p-1 sm:p-4 text-left text-gray-700 text-[10px] sm:text-xs max-w-[50px]">
                  Contract ID
                </th>
                <th className="p-1 sm:p-4 text-left text-gray-700 text-[10px] sm:text-xs max-w-[70px]">
                  Event
                </th>
                <th className="p-1 sm:p-4 text-left text-gray-700 text-[10px] sm:text-xs max-w-[70px]">
                  Outcome
                </th>
                <th className="p-1 sm:p-4 text-left text-gray-700 text-[10px] sm:text-xs max-w-[50px]">
                  Position
                </th>
                <th className="p-1 sm:p-4 text-left text-gray-700 text-[10px] sm:text-xs max-w-[50px]">
                  Status
                </th>
                <th className="p-1 sm:p-4 text-left text-gray-700 text-[10px] sm:text-xs max-w-[50px]">
                  Creator Choice
                </th>
                <th className="p-1 sm:p-4 text-left text-gray-700 text-[10px] sm:text-xs max-w-[50px]">
                  Accepter Choice
                </th>
                <th className="p-1 sm:p-4 text-left text-gray-700 text-[10px] sm:text-xs max-w-[50px]">
                  Select
                </th>
              </tr>
            </thead>
            <tbody>
              {contractsToRender.map((contract) => (
                <tr key={contract.contract_id} className="border-b hover:bg-gray-50">
                  <td className="p-1 sm:p-4 max-w-[50px] truncate break-words text-[10px] sm:text-xs">
                    <Link
                      to={`/contract/${contract.contract_id}`}
                      className="text-blue-500 hover:underline flex items-center min-h-[44px]"
                      aria-label={`View details for contract ${contract.contract_id}`}
                    >
                      {contract.contract_id}
                    </Link>
                  </td>
                  <td className="p-1 sm:p-4 max-w-[70px] truncate break-words text-[10px] sm:text-xs">
                    {contract.eventTitle || "Not set"}
                  </td>
                  <td className="p-1 sm:p-4 max-w-[70px] truncate break-words text-[10px] sm:text-xs">
                    {contract.outcome || "Not set"}
                  </td>
                  <td className="p-1 sm:p-4 max-w-[50px] truncate break-words text-[10px] sm:text-xs">
                    {contract.position_type === "buy" ? "Buy (Back)" : "Sell (Lay)"}
                  </td>
                  <td className="p-1 sm:p-4 max-w-[50px] truncate break-words text-[10px] sm:text-xs">
                    {formatStatus(contract.status)}
                  </td>
                  <td className="p-1 sm:p-4 max-w-[50px] truncate break-words text-[10px] sm:text-xs">
                    {contract.creator_winner_choice || "Not submitted"}
                  </td>
                  <td className="p-1 sm:p-4 max-w-[50px] truncate break-words text-[10px] sm:text-xs">
                    {contract.accepter_winner_choice || "Not submitted"}
                  </td>
                  <td className="p-1 sm:p-4 max-w-[50px] text-[10px] sm:text-xs">
                    <button
                      className="text-blue-500 hover:underline min-h-[44px]"
                      onClick={() => {
                        console.log("Settle: Selected contract_id:", contract.contract_id);
                        setSelectedContractId(contract.contract_id);
                      }}
                      aria-label={`Select contract ${contract.contract_id} for settlement or twist resolution`}
                    >
                      Select
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  if (loading) {
    return <div className="min-h-screen bg-background p-4">Loading settle...</div>;
  }

  if (apiError) {
    return (
      <div className="min-h-screen bg-background p-4">
        <header className="bg-primary text-white p-4">
          <h1 className="text-xl sm:text-2xl font-semibold">Settle Contracts</h1>
        </header>
        <main className="max-w-7xl mx-auto p-1 sm:p-6 mt-6">
          <p className="text-red-500 text-xs sm:text-base">Error: {apiError}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <header className="bg-primary text-white p-4">
        <h1 className="text-xl sm:text-2xl font-semibold">Settle Contracts</h1>
      </header>
      <main className="max-w-7xl mx-auto p-1 sm:p-6 mt-6">
        <div className="mb-6">
          <label htmlFor="userWalletAddress" className="block text-base sm:text-lg font-bold text-primary mb-2">
            Your Wallet Address (Required)
          </label>
          <input
            id="userWalletAddress"
            type="text"
            placeholder="Enter your DASH wallet address to view your contracts"
            className="border p-2 rounded w-full sm:w-1/2 min-h-[44px] text-[10px] sm:text-base"
            value={userWalletAddress}
            onChange={(e) => {
              console.log("Settle: Wallet Address changed:", e.target.value);
              setUserWalletAddress(e.target.value);
              setError("");
            }}
            aria-label="Enter your DASH wallet address to view your contracts"
          />
        </div>
        {!userWalletAddress && (
          <p className="text-gray-600 text-xs sm:text-base mb-6">
            Please enter your wallet address to view your contracts.
          </p>
        )}
        {userWalletAddress && !validateWalletAddress(userWalletAddress) && (
          <p className="text-red-500 text-xs sm:text-base mb-6">
            Please enter a valid DASH wallet address (34 characters, starts with 'X').
          </p>
        )}
        {validateWalletAddress(userWalletAddress) && renderTable(filteredContracts, "All Contracts")}
        {validateWalletAddress(userWalletAddress) && selectedContractId && filteredContracts.find((c) => c.contract_id === selectedContractId) && (
          <div className="space-y-6 mt-6">
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
                    console.log("Settle: Submitter wallet address changed:", e.target.value);
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
                    console.log("Settle: Winner choice changed:", e.target.value);
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
                    console.log("Settle: Reasoning changed:", e.target.value);
                    setReasoning(e.target.value);
                  }}
                  placeholder="Enter reasoning for your winner choice (required)"
                  aria-label="Reasoning for winner choice"
                />
              </div>
              {error && <p className="text-red-500 text-xs sm:text-base">{error}</p>}
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50 min-h-[44px] text-[10px] sm:text-base"
                disabled={loading}
                aria-label="Submit winner choice"
              >
                Submit Winner Choice
              </button>
            </form>
          </div>
        )}
        {validateWalletAddress(userWalletAddress) && selectedContractId && filteredContracts.find((c) => c.contract_id === selectedContractId)?.status === "twist" && (
          <div className="space-y-6 mt-6">
            <h3 className="text-base sm:text-lg font-semibold">Resolve Twist for Contract #{selectedContractId}</h3>
            <form onSubmit={handleResolveTwist} className="space-y-4">
              <p className="text-gray-600 text-[10px] sm:text-base">Click below to resolve this twist using the xAI Grok API.</p>
              <button
                type="submit"
                className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50 min-h-[44px] text-[10px] sm:text-base"
                disabled={loading}
                aria-label="Resolve twist with Grok API"
              >
                Resolve with Grok API
              </button>
            </form>
          </div>
        )}
        <div className="mt-6">
          <Link
            to="/marketplace"
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 min-h-[44px] text-[10px] sm:text-base"
            aria-label="Back to Marketplace"
          >
            Back to Marketplace
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Settle;