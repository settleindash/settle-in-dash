// src/pages/Transparency.jsx
// This page displays a list of resolved contracts (status: "twist" with resolution).
// It uses the useContracts hook with the updated contract structure (time, percentage, email).
// Displays all relevant contract details, including accepted/cancelled statuses.

import { Link } from "react-router-dom";
import { useContracts } from "../hooks/useContracts";
import mockContracts from "../mocks/contracts.json";

// Transparency component: Displays resolved and other contracts with their details.
const Transparency = () => {
  const { contracts } = useContracts(mockContracts);
  // Filter for resolved contracts (status: "twist" with resolution)
  const resolvedTwists = contracts.filter((c) => c.status === "twist" && c.resolution);

  // Log contracts for debugging (visible in browser Console, F12 in VSC)
  console.log("Transparency: Contracts:", contracts);
  console.log("Transparency: Resolved Twists:", resolvedTwists);

  return (
    // Main container with minimum screen height and background color
    <div className="min-h-screen bg-background p-4">
      <main className="max-w-3xl mx-auto mt-6">
        <h2 className="text-xl font-semibold mb-4">Resolved Twists</h2>
        {resolvedTwists.length === 0 ? (
          <p className="text-gray-600">No resolved Twists yet.</p>
        ) : (
          <div className="space-y-4">
            {resolvedTwists.map((contract) => (
              <div
                key={contract.id}
                className="border rounded-lg p-4 bg-white shadow"
              >
                <h3 className="text-lg font-semibold">
                  Contract #{contract.id}: {contract.question}
                </h3>
                <p className="text-gray-600">Category: {contract.category}</p>
                <p className="text-gray-600">
                  Event Time: {new Date(contract.time).toLocaleString()}
                </p>
                <p className="text-gray-600">Stake: {contract.stake} DASH</p>
                <p className="text-gray-600">Creator's Percentage: {contract.percentage}%</p>
                <p className="text-gray-600">Creator Email: {contract.email}</p>
                {contract.accepterEmail && (
                  <p className="text-gray-600">Accepter Email: {contract.accepterEmail}</p>
                )}
                <p className="text-gray-600">Status: {contract.status}</p>
                <p className="text-gray-600">
                  Termination: {new Date(contract.terminationDate).toLocaleDateString()}
                </p>
                <p className="text-gray-600">
                  Outcome: {contract.resolution || "N/A"}
                </p>
                <p className="text-gray-600">
                  Resolved: {contract.resolutionDetails?.timestamp
                    ? new Date(contract.resolutionDetails.timestamp).toLocaleString()
                    : "N/A"}
                </p>
                <p className="text-gray-600">
                  Reasoning: {contract.resolutionDetails?.reasoning || "No reasoning provided"}
                </p>
                <Link
                  to={`/contract/${contract.id}`}
                  className="text-blue-500 hover:underline"
                >
                  View Contract
                </Link>
              </div>
            ))}
          </div>
        )}
        {/* List all contracts for transparency */}
        <h2 className="text-xl font-semibold mt-8 mb-4">All Contracts</h2>
        {contracts.length === 0 ? (
          <p className="text-gray-600">No contracts available.</p>
        ) : (
          <div className="space-y-4">
            {contracts.map((contract) => (
              <div
                key={contract.id}
                className="border rounded-lg p-4 bg-white shadow"
              >
                <h3 className="text-lg font-semibold">
                  Contract #{contract.id}: {contract.question}
                </h3>
                <p className="text-gray-600">Category: {contract.category}</p>
                <p className="text-gray-600">
                  Event Time: {new Date(contract.time).toLocaleString()}
                </p>
                <p className="text-gray-600">Stake: {contract.stake} DASH</p>
                <p className="text-gray-600">Creator's Percentage: {contract.percentage}%</p>
                <p className="text-gray-600">Creator Email: {contract.email}</p>
                {contract.accepterEmail && (
                  <p className="text-gray-600">Accepter Email: {contract.accepterEmail}</p>
                )}
                <p className="text-gray-600">Status: {contract.status}</p>
                {contract.status === "cancelled" && (
                  <p className="text-yellow-500">
                    Cancelled: Creator and accepter emails were identical.
                  </p>
                )}
                {contract.status === "accepted" && (
                  <p className="text-green-500">This contract has been accepted.</p>
                )}
                <p className="text-gray-600">
                  Termination: {new Date(contract.terminationDate).toLocaleDateString()}
                </p>
                <Link
                  to={`/contract/${contract.id}`}
                  className="text-blue-500 hover:underline"
                >
                  View Contract
                </Link>
              </div>
            ))}
          </div>
        )}
        <div className="mt-6">
          <Link
            to="/marketplace"
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Back to Marketplace
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Transparency;