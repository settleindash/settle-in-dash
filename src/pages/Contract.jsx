// src/pages/Contract.jsx
// This component displays details of a single contract and allows acceptance if open,
// using wallet address-based identification.

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useContracts } from "../hooks/useContracts";

const Contract = () => {
  const { contract_id } = useParams(); // Changed from id to contract_id
  const { contracts, acceptContract, error: apiError, loading } = useContracts();
  const [localContract, setLocalContract] = useState(null); // Local state for contract
  const [accepterWalletAddress, setAccepterWalletAddress] = useState(""); // Changed from accepterEmail to accepterWalletAddress
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  // Find contract from contracts array or use localContract
  const contract = localContract || contracts.find((c) => c.contract_id === contract_id); // Changed id to contract_id

  console.log("Contract: Contract data for contract_id", contract_id, ":", contract);

  // Sync localContract with contracts on mount or when contract_id changes
  useEffect(() => {
    const foundContract = contracts.find((c) => c.contract_id === contract_id); // Changed id to contract_id
    if (foundContract) {
      setLocalContract(foundContract);
    }
  }, [contracts, contract_id]); // Changed id to contract_id

  if (loading) {
    return <div className="min-h-screen bg-background p-4">Loading contract...</div>;
  }

  if (apiError) {
    return (
      <div className="min-h-screen bg-background p-4">
        <header className="bg-primary text-white p-4">
          <h1 className="text-2xl font-semibold">Contract Details</h1>
        </header>
        <main className="max-w-3xl mx-auto mt-6">
          <p className="text-red-500">Error: {apiError}</p>
        </main>
      </div>
    );
  }

  if (!contract) {
    return <div className="min-h-screen bg-background p-4">Contract not found</div>;
  }

  const handleAcceptContract = async () => {
    if (!accepterWalletAddress) { // Changed from emailRegex to non-empty check
      setError("Please provide a wallet address");
      console.log("Contract: Validation failed - no accepter wallet address");
      return;
    }

    if (contract.status !== "open") {
      setError("This contract is no longer open for acceptance");
      console.log("Contract: Attempted to accept non-open contract", contract.status);
      return;
    }

    setError("");
    setMessage("");
    console.log("Contract: Accepting contract with contract_id", contract_id, "and wallet address", accepterWalletAddress);

    try {
      const result = await acceptContract(contract_id, accepterWalletAddress); // Changed id to contract_id
      if (result.success) {
        // Update local state to reflect accepted status
        setLocalContract({
          ...contract,
          status: "accepted",
          accepterWalletAddress, // Changed from accepterEmail
        });
        setMessage("Contract accepted successfully!");
        navigate(`/contract/${contract_id}`); // Changed id to contract_id
      } else {
        setError(result.error || "Failed to accept contract");
        console.error("Contract: API error accepting contract", result.error);
      }
    } catch (err) {
      setError(err.message || "Failed to accept contract");
      console.error("Contract: Error accepting contract", err);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <main className="max-w-3xl mx-auto mt-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold">{contract.question}</h2>
          <p className="text-gray-600">Contract ID: {contract.contract_id}</p> {/* Changed ID to Contract ID and id to contract_id */}
          <p className="text-gray-600">
            Created At: {contract.created_at ? new Date(contract.created_at).toLocaleString() : "Not set"}
          </p>
          <p className="text-gray-600">Category: {contract.category}</p>
          <p className="text-gray-600">Event Time: {new Date(contract.time).toLocaleString()}</p>
          <p className="text-gray-600">Stake: {contract.stake} DASH</p>
          <p className="text-gray-600">Creator's Percentage: {contract.percentage}%</p>
          <p className="text-gray-600">Creator Wallet Address: {contract.WalletAddress}</p> {/* Changed email to WalletAddress */}
          <p className="text-gray-600">Status: {contract.status}</p>
          <p className="text-gray-600">
            Acceptance Deadline: {new Date(contract.acceptanceDeadline).toLocaleDateString()}
          </p>
          {contract.accepterWalletAddress && ( // Changed accepterEmail to accepterWalletAddress
            <p className="text-gray-600">Accepter Wallet Address: {contract.accepterWalletAddress}</p>
          )}
          {contract.status === "cancelled" && (
            <p className="text-yellow-500">
              This contract was cancelled because the creator and accepter wallet addresses were identical.
            </p>
          )}
          {contract.status === "accepted" && (
            <p className="text-green-500">This contract has been accepted.</p>
          )}
          {contract.status === "open" && (
            <div className="mt-4 space-y-2">
              <div>
                <label
                  htmlFor="accepterWalletAddress"
                  className="block text-sm font-medium text-gray-600"
                >
                  Your Wallet Address
                </label>
                <input
                  id="accepterWalletAddress"
                  type="text" // Changed from email to text
                  className="border p-2 rounded w-full"
                  value={accepterWalletAddress}
                  onChange={(e) => {
                    console.log("Contract: Accepter wallet address changed:", e.target.value);
                    setAccepterWalletAddress(e.target.value);
                  }}
                  placeholder="Enter your wallet address to accept"
                  aria-label="Accepter wallet address"
                />
              </div>
              {error && <p className="text-red-500">{error}</p>}
              {message && <p className="text-green-500">{message}</p>}
              <button
                className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
                onClick={handleAcceptContract}
                aria-label={`Accept contract ${contract.question}`}
                disabled={loading || contract.status !== "open"}
              >
                {loading ? "Processing..." : "Accept Contract"}
              </button>
            </div>
          )}
          {contract.status === "twist" && contract.resolution && (
            <div className="mt-4">
              <p className="text-gray-600">Resolution: {contract.resolution}</p>
              <p className="text-gray-600">
                Reasoning: {contract.resolutionDetails?.reasoning || "No reasoning provided"}
              </p>
              <p className="text-gray-600">
                Resolved on: {new Date(contract.resolutionDetails?.timestamp).toLocaleString() || "N/A"}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Contract;