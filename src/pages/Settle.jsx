// src/pages/Settle.jsx
// Component for settling accepted contracts or resolving twists, using wallet address-based identification.
// Filters contracts by user wallet address to show only relevant accepted or twist contracts.

import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useContracts } from "../hooks/useContracts";

const Settle = () => {
  const { contracts, settleContract, triggerTwist, loading, error: apiError } = useContracts();
  const [userWalletAddress, setUserWalletAddress] = useState("");
  const [submitterWalletAddress, setSubmitterWalletAddress] = useState("");
  const [winnerChoice, setWinnerChoice] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [selectedContractId, setSelectedContractId] = useState(null);

  // Filter contracts by wallet address and status (accepted or twist)
  const filteredContracts = useMemo(() => {
    if (!userWalletAddress) {
      return []; // Return empty array if no wallet address is provided
    }
    return contracts.filter(
      (c) =>
        (c.status === "accepted" || c.status === "twist") &&
        (c.WalletAddress === userWalletAddress || c.accepterWalletAddress === userWalletAddress)
    );
  }, [contracts, userWalletAddress]);

  // Split filtered contracts into accepted and twist
  const acceptedContracts = filteredContracts.filter((c) => c.status === "accepted");
  const twistContracts = filteredContracts.filter((c) => c.status === "twist");

  // Debug render frequency
  useEffect(() => {
    console.log("Settle: Component rendered");
  }, []);

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
    if (!selectedContractId || !submitterWalletAddress || !winnerChoice) {
      alert("Please select a contract, enter your wallet address, and choose a winner or tie.");
      return;
    }
    const contract = acceptedContracts.find((c) => c.contract_id === selectedContractId);
    if (!contract) {
      alert("Selected contract not found.");
      return;
    }
    const result = await settleContract(selectedContractId, submitterWalletAddress, winnerChoice, reasoning);
    if (result.success) {
      setSubmitterWalletAddress("");
      setWinnerChoice("");
      setReasoning("");
      setSelectedContractId(null);
      alert(result.message);
    } else {
           alert(`Error: ${result.error}`);
    }
  };

  // Handle twist resolution
  const handleResolveTwist = async (e) => {
    e.preventDefault();
    console.log("Settle: Resolving twist for contract_id:", selectedContractId);
    if (!selectedContractId) {
      alert("Please select a contract.");
      return;
    }
    const contract = twistContracts.find((c) => c.contract_id === selectedContractId);
    if (!contract) {
      alert("Selected contract not found.");
      return;
    }
    const result = await triggerTwist(selectedContractId);
    if (result.success) {
      setSelectedContractId(null);
      alert(result.message);
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  // Render table for contracts
  const renderTable = (contractsToRender, title, isTwist = false) => (
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
                  Question
                </th>
                <th className="p-1 sm:p-4 text-left text-gray-700 text-[10px] sm:text-xs max-w-[70px]">
                  Status
                </th>
                <th className="p-1 sm:p-4 text-left text-gray-700 text-[10px] sm:text-xs max-w-[70px]">
                  Event Time
                </th>
                <th className="p-1 sm:p-4 text-left text-gray-700 text-[10px] sm:text-xs max-w-[70px]">
                  Category
                </th>
                <th className="p-1 sm:p-4 text-left text-gray-700 text-[10px] sm:text-xs max-w-[70px]">
                  Creator Choice
                </th>
                <th className="p-1 sm:p-4 text-left text-gray-700 text-[10px] sm:text-xs max-w-[70px]">
                  Accepter Choice
                </th>
                <th className="p-1 sm:p-4 text-left text-gray-700 text-[10px] sm:text-xs max-w-[70px]">
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
                      className="text-blue-500 hover:underline block min-h-[44px]"
                      aria-label={`View details for contract ${contract.contract_id}`}
                    >
                      {contract.contract_id}
                    </Link>
                  </td>
                  <td className="p-1 sm:p-4 max-w-[70px] truncate break-words text-[10px] sm:text-xs">
                    {contract.question || "Not set"}
                  </td>
                  <td className="p-1 sm:p-4 max-w-[70px] truncate break-words text-[10px] sm:text-xs">
                    {formatStatus(contract.status)}
                  </td>
                  <td className="p-1 sm:p-4 max-w-[70px] truncate break-words text-[10px] sm:text-xs">
                    {contract.time ? new Date(contract.time).toLocaleString() : "Not set"}
                  </td>
                  <td className="p-1 sm:p-4 max-w-[70px] truncate break-words text-[10px] sm:text-xs">
                    {contract.category || "Not set"}
                  </td>
                  <td className="p-1 sm:p-4 max-w-[70px] truncate break-words text-[10px] sm:text-xs">
                    {contract.creator_winner_choice || "Not submitted"}
                  </td>
                  <td className="p-1 sm:p-4 max-w-[70px] truncate break-words text-[10px] sm:text-xs">
                    {contract.accepter_winner_choice || "Not submitted"}
                  </td>
                  <td className="p-1 sm:p-4 max-w-[70px] text-[10px] sm:text-xs">
                    <button
                      className="text-blue-500 hover:underline min-h-[44px]"
                      onClick={() => {
                        console.log("Settle: Selected contract_id:", contract.contract_id);
                        setSelectedContractId(contract.contract_id);
                      }}
                      aria-label={`Select contract ${contract.contract_id} for ${isTwist ? "twist resolution" : "settlement"}`}
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
      <main className="p-1 max-w-7xl mx-auto mt-6 sm:p-6">
        <div className="mb-6">
          <label htmlFor="userWalletAddress" className="block text-base sm:text-lg font-bold text-primary mb-2">
            Your Wallet Address (Creator or Accepter)
          </label>
          <input
            id="userWalletAddress"
            type="text"
            placeholder="Enter your wallet address to view your contracts"
            className="border p-2 rounded w-full sm:w-1/2 min-h-[44px] text-[10px] sm:text-base"
            value={userWalletAddress}
            onChange={(e) => {
              console.log("Settle: Wallet Address changed:", e.target.value);
              setUserWalletAddress(e.target.value);
            }}
            aria-label="Enter your wallet address to view your contracts"
          />
        </div>
        {!userWalletAddress && (
          <p className="text-gray-600 text-xs sm:text-base mb-6">
            Please enter your wallet address to view your contracts.
          </p>
        )}
        {userWalletAddress && renderTable(acceptedContracts, "Accepted Contracts", false)}
        {userWalletAddress && selectedContractId && acceptedContracts.find((c) => c.contract_id === selectedContractId) && (
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
                  onChange={(e) => setSubmitterWalletAddress(e.target.value)}
                  placeholder="Enter your wallet address"
                  aria-label="Submitter wallet address"
                />
              </div>
              <div>
                <label htmlFor="winnerChoice" className="block text-base sm:text-lg font-bold text-primary mb-2">
                  Winner Choice
                </label>
                <select
                  id="winnerChoice"
                  className="border p-2 rounded w-full min-h-[44px] text-[10px] sm:text-base"
                  value={winnerChoice}
                  onChange={(e) => setWinnerChoice(e.target.value)}
                  aria-label="Winner choice for settling contract"
                >
                  <option value="">Select winner or tie</option>
                  <option value={acceptedContracts.find((c) => c.contract_id === selectedContractId)?.WalletAddress}>
                    Creator ({acceptedContracts.find((c) => c.contract_id === selectedContractId)?.WalletAddress})
                  </option>
                  <option value={acceptedContracts.find((c) => c.contract_id === selectedContractId)?.accepterWalletAddress}>
                    Accepter ({acceptedContracts.find((c) => c.contract_id === selectedContractId)?.accepterWalletAddress})
                  </option>
                  <option value="tie">Tie</option>
                </select>
              </div>
              <div>
                <label htmlFor="reasoning" className="block text-base sm:text-lg font-bold text-primary mb-2">
                  Reasoning (Optional)
                </label>
                <textarea
                  id="reasoning"
                  className="border p-2 rounded w-full min-h-[100px] text-[10px] sm:text-base"
                  value={reasoning}
                  onChange={(e) => setReasoning(e.target.value)}
                  placeholder="Enter reasoning for your choice"
                  aria-label="Reasoning for winner choice"
                />
              </div>
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
        {userWalletAddress && renderTable(twistContracts, "Twist Contracts", true)}
        {userWalletAddress && selectedContractId && twistContracts.find((c) => c.contract_id === selectedContractId) && (
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