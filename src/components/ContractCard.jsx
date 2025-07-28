// src/components/ContractCard.jsx
// This component renders a single contract card with details as a preview for the marketplace.
// It links to the contract details page for acceptance, using wallet address-based identification.

import { Link } from "react-router-dom";
import { useState } from "react";

const ContractCard = ({ contract }) => {
  console.log("ContractCard: Contract data:", contract);

  // Format status for display
  const formatStatus = (status) => {
    const statusMap = {
      open: "Open for Acceptance",
      accepted: "Accepted",
      cancelled: "Cancelled",
      settled: "Settled",
      twist: "Twist Resolved",
    };
    return statusMap[status] || status;
  };

  // Format date as YYYY-MM-DD
  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toISOString().split("T")[0] : "Not set";
  };

  // Calculate Accepter's Percentage
  const accepterPercentage = (100 - parseFloat(contract.percentage)).toFixed(2);

  // State for collapsible "More Info" section
  const [isMoreInfoOpen, setIsMoreInfoOpen] = useState(false);

  return (
    <div className="bg-white p-4 rounded-lg shadow text-sm">
      <Link
        to={`/contract/${contract.contract_id}`}
        className="text-base font-semibold hover:underline"
        aria-label={`View details for contract ${contract.question}`}
      >
        {contract.question}
      </Link>
      <p className="text-gray-600">Category: {contract.category}</p>
      <p className="text-gray-600">Stake: {contract.stake} DASH</p>
      <p className="text-gray-600">Creator's Percentage: {contract.percentage}%</p>
      <p className="text-gray-600">Accepter’s Percentage: {accepterPercentage}%</p>

      {/* Collapsible More Info Section */}
      <div className="mt-2">
        <button
          onClick={() => setIsMoreInfoOpen(!isMoreInfoOpen)}
          className="text-blue-500 hover:underline text-sm"
        >
          {isMoreInfoOpen ? "Hide More Info" : "More Info"}
        </button>
        {isMoreInfoOpen && (
          <div className="mt-2 text-gray-600">
            <p>ID: {contract.contract_id}</p>
            <p>Created by: {contract.WalletAddress}</p>
            <p>
              Created At:{" "}
              {contract.created_at ? new Date(contract.created_at).toLocaleString() : "Not set"}
            </p>
            <p>Event Time: {new Date(contract.time).toLocaleString()}</p>
            <p>Acceptance Deadline: {formatDate(contract.acceptanceDeadline)}</p>
            <p>Status: {formatStatus(contract.status)}</p>
          </div>
        )}
      </div>

      {contract.status === "cancelled" && (
        <p className="text-yellow-500 mt-2">
          Cancelled: Creator and accepter wallet addresses were identical.
        </p>
      )}
      {contract.status === "open" && (
        <p className="text-blue-500 mt-2">
          Click the question to view details and accept this contract.
        </p>
      )}
    </div>
  );
};

export default ContractCard;