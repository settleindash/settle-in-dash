// src/components/ContractCard.jsx
// This component renders a single contract card with details and an accept button.
// It uses email-based identification instead of wallet addresses, aligning with the updated useContracts hook.

import { Link } from "react-router-dom"; // Import Link for navigation to contract details page.

// ContractCard component: Displays contract details and an accept button for open contracts.
const ContractCard = ({ contract, onAccept }) => {
  // Log contract data for debugging (visible in browser Console, F12 in VSC).
  console.log("ContractCard: Contract data:", contract);

  return (
    // Card container with padding, shadow, and rounded corners.
    <div className="bg-white p-4 rounded-lg shadow">
      {/* Contract question as a clickable link to details page */}
      <Link
        to={`/contract/${contract.id}`}
        className="text-lg font-semibold hover:underline"
      >
        {contract.question}
      </Link>
      {/* Display contract details */}
      <p className="text-gray-600">Category: {contract.category}</p>
      <p className="text-gray-600">Event Time: {new Date(contract.time).toLocaleString()}</p>
      <p className="text-gray-600">Stake: {contract.stake} DASH</p>
      <p className="text-gray-600">Creator's Percentage: {contract.percentage}%</p>
      <p className="text-gray-600">Created by: {contract.email}</p>
      <p className="text-gray-600">Status: {contract.status}</p>
      <p className="text-gray-600">
        Termination: {new Date(contract.terminationDate).toLocaleDateString()}
      </p>
      {/* Show accept button for open contracts */}
      {contract.status === "open" && (
        <button
          className="bg-orange-500 text-white px-4 py-2 rounded mt-2 hover:bg-orange-600"
          onClick={onAccept} // Call the onAccept prop (handled by Marketplace.jsx with accepter email).
          aria-label={`Accept contract ${contract.question}`}
        >
          Accept Contract
        </button>
      )}
    </div>
  );
};

// Export the ContractCard component as default.
export default ContractCard;