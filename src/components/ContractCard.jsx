// src/components/ContractCard.jsx
// This component renders a single contract card with details as a preview for the marketplace.
// It links to the contract details page for acceptance, using wallet address-based identification.

import { Link } from "react-router-dom";

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

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <Link
        to={`/contract/${contract.contract_id}`}
        className="text-lg font-semibold hover:underline"
        aria-label={`View details for contract ${contract.question}`}
      >
        {contract.question}
      </Link>
      <p className="text-gray-600">ID: {contract.contract_id}</p>
      <p className="text-gray-600">
        Created At: {contract.created_at ? new Date(contract.created_at).toLocaleString() : "Not set"}
      </p>
      <p className="text-gray-600">Category: {contract.category}</p>
      <p className="text-gray-600">Event Time: {new Date(contract.time).toLocaleString()}</p>
      <p className="text-gray-600">Stake: {contract.stake} DASH</p>
      <p className="text-gray-600">Creator's Percentage: {contract.percentage}%</p>
      <p className="text-gray-600">Created by: {contract.WalletAddress}</p>
      <p className="text-gray-600">Status: {formatStatus(contract.status)}</p>
      <p className="text-gray-600">Acceptance Deadline: {formatDate(contract.acceptanceDeadline)}</p>
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