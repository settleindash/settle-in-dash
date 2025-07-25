// Old
// src/pages/Settle.jsx
// This page allows creator and accepter to submit winner choices (creator, accepter, or tie) for accepted contracts.
// If they agree, the contract is settled; if they disagree, a twist is created.
// Twists are resolved via xAI Grok API, storing the winner or tie in the database.

import { useState } from "react";
import { Link } from "react-router-dom";
import { useContracts } from "../hooks/useContracts";
import FilterContracts from "../components/FilterContracts";

const Settle = () => {
  const { contracts, settleContract, triggerTwist, loading, error: apiError } = useContracts();
  const [userEmail] = useState("user@example.com"); // Replace with useAuth or prop
  const [submitterEmail, setSubmitterEmail] = useState("");
  const [winnerChoice, setWinnerChoice] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [selectedContractId, setSelectedContractId] = useState(null);
  const [filteredContracts, setFilteredContracts] = useState([]);

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

  // Split filtered contracts into accepted and twist for separate tables
  const acceptedContracts = filteredContracts?.filter((c) => c.status === "accepted") || [];
  const twistContracts = filteredContracts?.filter((c) => c.status === "twist") || [];

  // Handle filter changes from FilterContracts
  const handleFilterChange = (newFilteredContracts) => {
    console.log("Settle: Filtered Contracts:", newFilteredContracts);
    setFilteredContracts(newFilteredContracts);
  };

  // Handle settlement submission
  const handleSettle = async (e) => {
    e.preventDefault();
    if (!selectedContractId || !submitterEmail || !winnerChoice) {
      alert("Please select a contract, enter your email, and choose a winner or tie.");
      return;
    }
    const contract = acceptedContracts.find((c) => c.id === selectedContractId);
    if (!contract) {
      alert("Selected contract not found.");
      return;
    }
    const result = await settleContract(selectedContractId, submitterEmail, winnerChoice, reasoning);
    if (result.success) {
      setSubmitterEmail("");
      setWinnerChoice("");
      setReasoning("");
      setSelectedContractId(null);
      alert(result.message);
    } else {
      alert(`Error: ${result.error}`);
    }
  };

  // Handle twist resolution via Grok API
  const handleResolveTwist = async (e) => {
    e.preventDefault();
    if (!selectedContractId) {
      alert("Please select a contract.");
      return;
    }
    const contract = twistContracts.find((c) => c.id === selectedContractId);
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

  if (loading) {
    return <div className="min-h-screen bg-background p-4">Loading contracts...</div>;
  }

  if (apiError) {
    return (
      <div className="min-h-screen bg-background p-4">
        <header className="bg-primary text-white p-4">
          <h1 className="text-2xl font-semibold">Settle Contracts</h1>
        </header>
        <main className="max-w-7xl mx-auto p-4">
          <p className="text-red-500">Error: {apiError}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <header className="bg-primary text-white p-4">
        <h1 className="text-2xl font-semibold">Settle Contracts</h1>
      </header>
      <main className="max-w-7xl mx-auto p-4">
        <FilterContracts
          contracts={contracts}
          statusFilter="user" // Filter for user's accepted or twist contracts
          userEmail={userEmail}
          onFilterChange={handleFilterChange}
          contractsPerPage={10} // Smaller pagination for Settle
          disabledFilters={[]} // Enable all filters, including statusFilter
        />
        <h2 className="text-xl font-semibold mb-4 mt-8">Accepted Contracts</h2>
        {acceptedContracts.length === 0 ? (
          <p className="text-gray-600">No accepted contracts available.</p>
        ) : (
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full bg-white border rounded-lg shadow">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="p-4 text-left text-gray-700">ID</th>
                  <th className="p-4 text-left text-gray-700">Question</th>
                  <th className="p-4 text-left text-gray-700">Status</th>
                  <th className="p-4 text-left text-gray-700">Event Time</th>
                  <th className="p-4 text-left text-gray-700">Category</th>
                  <th className="p-4 text-left text-gray-700">Creator Choice</th>
                  <th className="p-4 text-left text-gray-700">Accepter Choice</th>
                  <th className="p-4 text-left text-gray-700">Select</th>
                </tr>
              </thead>
              <tbody>
                {acceptedContracts.map((contract) => (
                  <tr key={contract.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">{contract.id}</td>
                    <td className="p-4">{contract.question}</td>
                    <td className="p-4">{formatStatus(contract.status)}</td>
                    <td className="p-4">{new Date(contract.time).toLocaleString()}</td>
                    <td className="p-4">{contract.category}</td>
                    <td className="p-4">{contract.creator_winner_choice || "Not submitted"}</td>
                    <td className="p-4">{contract.accepter_winner_choice || "Not submitted"}</td>
                    <td className="p-4">
                      <button
                        className="text-blue-500 hover:underline"
                        onClick={() => setSelectedContractId(contract.id)}
                        aria-label={`Select contract ${contract.id} for settlement`}
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
        {selectedContractId && acceptedContracts.find((c) => c.id === selectedContractId) && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Submit Winner for Contract #{selectedContractId}</h3>
            <div className="w-full">
              <form onSubmit={handleSettle} className="space-y-4">
                <div>
                  <label htmlFor="submitterEmail" className="block text-lg font-bold text-primary mb-2">
                    Your Email (Creator or Accepter)
                  </label>
                  <input
                    id="submitterEmail"
                    type="email"
                    className="border p-2 rounded w-full"
                    value={submitterEmail}
                    onChange={(e) => setSubmitterEmail(e.target.value)}
                    placeholder="Enter your email"
                    aria-label="Submitter email"
                  />
                </div>
                <div>
                  <label htmlFor="winnerChoice" className="block text-lg font-bold text-primary mb-2">
                    Winner Choice
                  </label>
                  <select
                    id="winnerChoice"
                    className="border p-2 rounded w-full"
                    value={winnerChoice}
                    onChange={(e) => setWinnerChoice(e.target.value)}
                    aria-label="Winner choice for settling contract"
                  >
                    <option value="">Select winner or tie</option>
                    <option value={acceptedContracts.find((c) => c.id === selectedContractId)?.email}>
                      Creator ({acceptedContracts.find((c) => c.id === selectedContractId)?.email})
                    </option>
                    <option value={acceptedContracts.find((c) => c.id === selectedContractId)?.accepterEmail}>
                      Accepter ({acceptedContracts.find((c) => c.id === selectedContractId)?.accepterEmail})
                    </option>
                    <option value="tie">Tie</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="reasoning" className="block text-lg font-bold text-primary mb-2">
                    Reasoning (Optional)
                  </label>
                  <textarea
                    id="reasoning"
                    className="border p-2 rounded w-full"
                    value={reasoning}
                    onChange={(e) => setReasoning(e.target.value)}
                    placeholder="Enter reasoning for your choice"
                    aria-label="Reasoning for winner choice"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
                  disabled={loading}
                  aria-label="Submit winner choice"
                >
                  Submit Winner Choice
                </button>
              </form>
            </div>
          </div>
        )}
        <h2 className="text-xl font-semibold mb-4 mt-8">Twist Contracts</h2>
        {twistContracts.length === 0 ? (
          <p className="text-gray-600">No twist contracts available.</p>
        ) : (
          <div className="overflow-x-auto mb-6">
            <table className="min-w-full bg-white border rounded-lg shadow">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="p-4 text-left text-gray-700">ID</th>
                  <th className="p-4 text-left text-gray-700">Question</th>
                  <th className="p-4 text-left text-gray-700">Status</th>
                  <th className="p-4 text-left text-gray-700">Creator Choice</th>
                  <th className="p-4 text-left text-gray-700">Accepter Choice</th>
                  <th className="p-4 text-left text-gray-700">Select</th>
                </tr>
              </thead>
              <tbody>
                {twistContracts.map((contract) => (
                  <tr key={contract.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">{contract.id}</td>
                    <td className="p-4">{contract.question}</td>
                    <td className="p-4">{formatStatus(contract.status)}</td>
                    <td className="p-4">{contract.creator_winner_choice || "Not submitted"}</td>
                    <td className="p-4">{contract.accepter_winner_choice || "Not submitted"}</td>
                    <td className="p-4">
                      <button
                        className="text-blue-500 hover:underline"
                        onClick={() => setSelectedContractId(contract.id)}
                        aria-label={`Select contract ${contract.id} for twist resolution`}
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
        {selectedContractId && twistContracts.find((c) => c.id === selectedContractId) && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Resolve Twist for Contract #{selectedContractId}</h3>
            <div className="w-full">
              <form onSubmit={handleResolveTwist} className="space-y-4">
                <p className="text-gray-600">Click below to resolve this twist using the xAI Grok API.</p>
                <button
                  type="submit"
                  className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50"
                  disabled={loading}
                  aria-label="Resolve twist with Grok API"
                >
                  Resolve with Grok API
                </button>
              </form>
            </div>
          </div>
        )}
        <div className="mt-6">
          <Link
            to="/marketplace"
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
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