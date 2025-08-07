// src/components/ContractCard.jsx
// Component to display and manage a single contract, including acceptance and fee details.

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useContractDetails from "../hooks/useContractDetails";
import { useContracts } from "../hooks/useContracts";
import { validateWalletAddress } from "../utils/validation";
import PageHeader from "../utils/formats/PageHeader.jsx";

const ContractCard = ({
  contract,
  eventTitle,
  onAcceptSuccess,
  navigateTo,
  isSingleView = false,
}) => {
  const navigate = useNavigate();
  const { acceptContract, error: contractsError, loading: contractsLoading } = useContracts();
  const { formatStatus, formatDate, accepterStake, toWin } = useContractDetails(
    contract.contract_id,
    [contract]
  );
  const [accepterWalletAddress, setAccepterWalletAddress] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isMoreInfoOpen, setIsMoreInfoOpen] = useState(false);

  console.log("ContractCard: Rendering with contract_id:", contract.contract_id, "isSingleView:", isSingleView);

  // Custom date formatting for Europe/Paris (CEST, +02:00)
  const formatCustomDate = (dateString) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Europe/Paris",
    }).replace(/(\d+)\/(\d+)\/(\d+)/, "$2/$1/$3");
  };

  // Calculate 2% fee based on position_type
  const calculateFee = () => {
    if (!contract.stake || !contract.percentage) return "Not set";
    const stake = parseFloat(contract.stake);
    const odds = parseFloat(contract.percentage);
    if (contract.position_type === "buy") {
      console.log("ContractCard: Calculating creator fee (buy):", stake * 0.02);
      return (stake * 0.02).toFixed(2) + " DASH";
    } else {
      console.log("ContractCard: Calculating accepter fee (sell):", stake * (odds - 1) * 0.02);
      return (stake * (odds - 1) * 0.02).toFixed(2) + " DASH";
    }
  };

  const handleAcceptContract = async () => {
    const walletValidation = validateWalletAddress(accepterWalletAddress);
    if (!walletValidation.isValid) {
      setError(walletValidation.message);
      console.log("ContractCard: Validation failed - invalid accepter wallet address");
      return;
    }

    if (contract.status !== "open") {
      setError("This contract is no longer open for acceptance");
      console.log("ContractCard: Attempted to accept non-open contract", contract.status);
      return;
    }

    setError("");
    setMessage("");
    console.log("ContractCard: Accepting contract with contract_id", contract.contract_id, "and wallet address", accepterWalletAddress);

    try {
      const result = await acceptContract(contract.contract_id, {
        accepterWalletAddress,
        accepter_stake: accepterStake,
      });
      if (result.success) {
        setMessage("Contract accepted successfully!");
        if (onAcceptSuccess) onAcceptSuccess();
        setAccepterWalletAddress("");
      } else {
        setError(result.error || "Failed to accept contract");
        console.error("ContractCard: API error accepting contract", result.error);
      }
    } catch (err) {
      setError(err.message || "Failed to accept contract");
      console.error("ContractCard: Error accepting contract", err);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      {isSingleView && <PageHeader title={eventTitle || "Contract Details"} />}
      <div className={`bg-white p-6 rounded-lg shadow text-sm mb-4 ${isSingleView ? "" : "mt-6"}`}>
        {/* Financial Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-md font-semibold text-gray-700">Financial Overview</h3>
            <p className="mt-2 text-gray-600">Stake (What You Lose): {contract.stake ? `${contract.stake} DASH` : "Not set"}</p>
            <p className="mt-2 text-green-600 font-semibold">To Win (If Correct): {toWin(contract.outcome, contract.position_type)} DASH</p>
            <p className="mt-2 text-gray-600">Buy outcome: {contract.outcome || "Not set"}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-md font-semibold text-gray-700">Acceptance Details</h3>
            <p className="mt-2 text-gray-600">Odds: {contract.percentage || "Not set"}</p>
            <p className="mt-2 text-gray-600">Acceptance Deadline: {formatCustomDate(contract.acceptanceDeadline)}</p>
            <p className="mt-2 text-gray-600">Fee (Excludes transaction fees): 2% on net winnings</p>
          </div>
        </div>

        {/* Contract Basics */}
        <div className="mb-6">
          <h3 className="text-md font-semibold text-gray-700 mb-2">Contract Info</h3>
          <p className="text-gray-600">Contract ID: {contract.contract_id || "Not set"}</p>
          <p className="text-gray-600">Position: {contract.position_type === "buy" ? "Buy (Back)" : "Sell (Lay)"}</p>
          <p className="text-gray-600">Status: {formatStatus(contract.status)}</p>
          <p className="text-gray-600">Created At: {formatCustomDate(contract.created_at)}</p>
          <p className="text-gray-600">Event Time: {formatCustomDate(contract.time)}</p>
        </div>

        {/* Parties Involved */}
        <div className="mb-6">
          <h3 className="text-md font-semibold text-gray-700 mb-2">Parties</h3>
          <p className="text-gray-600">Creator Wallet Address: {contract.WalletAddress || "Not set"}</p>
          <p className="text-gray-600">Accepter Wallet Address: {contract.accepterWalletAddress || "Not set"}</p>
          {contract.status === "accepted" && contract.accepterWalletAddress && (
            <p className="text-gray-600">Accepter Stake: {contract.accepter_stake ? `${contract.accepter_stake} DASH` : "Not set"}</p>
          )}
        </div>

        {/* Status Messages */}
        {contract.status === "cancelled" && (
          <p className="text-yellow-500 mt-2">
            Cancelled: Creator accepted with the same wallet address.
          </p>
        )}
        {contract.status === "accepted" && (
          <p className="text-green-500 mt-2">This contract has been accepted.</p>
        )}

        {/* Collapsible More Info Section */}
        <div className="mt-2">
          <button
            onClick={() => setIsMoreInfoOpen(!isMoreInfoOpen)}
            className="text-blue-500 hover:underline text-sm"
            aria-label={isMoreInfoOpen ? "Hide more info" : "Show more info"}
          >
            {isMoreInfoOpen ? "Hide More Info" : "More Info"}
          </button>
          {isMoreInfoOpen && (
            <div className="mt-2 text-gray-600">
              <p>Creator Winner Choice: {contract.creator_winner_choice || "Not set"}</p>
              <p>Creator Winner Reasoning: {contract.creator_winner_reasoning || "Not set"}</p>
              <p>Accepter Winner Choice: {contract.accepter_winner_choice || "Not set"}</p>
              <p>Accepter Winner Reasoning: {contract.accepter_winner_reasoning || "Not set"}</p>
              <p>Resolution: {contract.resolution || "Not set"}</p>
              <p>Resolution Reasoning: {contract.resolutionDetails?.reasoning || "Not set"}</p>
              <p>Resolved On: {contract.resolutionDetails?.timestamp ? formatCustomDate(contract.resolutionDetails.timestamp) : "Not set"}</p>
              <p>Winner: {contract.winner || "Not set"}</p>
            </div>
          )}
        </div>

        {/* Action Section */}
        {contract.status === "open" && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-md font-semibold text-gray-700 mb-2">Accept Contract</h3>
            <p className="text-sm text-gray-600 mb-2">Enter your wallet address to accept this peer-to-peer contract (use the same address as creator to cancel).</p>
            <label htmlFor={`accepterWalletAddress-${contract.contract_id}`} className="block text-sm font-medium text-gray-600">
              Your DASH Wallet Address
            </label>
            <input
              id={`accepterWalletAddress-${contract.contract_id}`}
              type="text"
              className="border p-2 rounded w-full mt-1 text-sm"
              value={accepterWalletAddress}
              onChange={(e) => setAccepterWalletAddress(e.target.value)}
              placeholder="Enter a valid DASH address (starts with 'X', 34 characters)"
              aria-label="Accepter wallet address"
            />
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            {message && <p className="text-green-500 text-sm mt-2">{message}</p>}
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mt-4 text-sm w-full"
              onClick={handleAcceptContract}
              aria-label={`Accept ${contract.position_type} contract ${contract.contract_id}`}
              disabled={contractsLoading}
            >
              {contractsLoading ? "Processing..." : contract.position_type === "buy" ? "Sell (Lay)" : "Buy (Back)"} Contract
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractCard;