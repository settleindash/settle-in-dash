// src/pages/Contract.jsx
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useContracts } from "../hooks/useContracts";

const Contract = () => {
  const { id } = useParams();
  const { contracts, acceptContract, error: apiError, loading } = useContracts();
  const [localContract, setLocalContract] = useState(null); // Local state for contract
  const [accepterEmail, setAccepterEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  // Find contract from contracts array or use localContract
  const contract = localContract || contracts.find((c) => c.id === id);

  console.log("Contract: Contract data for ID", id, ":", contract);

  // Sync localContract with contracts on mount or when id changes
  useEffect(() => {
    const foundContract = contracts.find((c) => c.id === id);
    if (foundContract) {
      setLocalContract(foundContract);
    }
  }, [contracts, id]);

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
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(accepterEmail)) {
      setError("Please provide a valid email address");
      console.log("Contract: Validation failed - invalid accepter email");
      return;
    }

    if (contract.status !== "open") {
      setError("This contract is no longer open for acceptance");
      console.log("Contract: Attempted to accept non-open contract", contract.status);
      return;
    }

    setError("");
    setMessage("");
    console.log("Contract: Accepting contract with ID", id, "and email", accepterEmail);

    try {
      const result = await acceptContract(id, accepterEmail);
      if (result.success) {
        // Update local state to reflect accepted status
        setLocalContract({
          ...contract,
          status: "accepted",
          accepterEmail,
        });
        setMessage("Contract accepted successfully!");
        navigate(`/contract/${id}`); // Reload to ensure UI consistency
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
          <p className="text-gray-600">ID: {contract.id}</p>
          <p className="text-gray-600">
            Created At: {contract.created_at ? new Date(contract.created_at).toLocaleString() : "Not set"}
          </p>
          <p className="text-gray-600">Category: {contract.category}</p>
          <p className="text-gray-600">Event Time: {new Date(contract.time).toLocaleString()}</p>
          <p className="text-gray-600">Stake: {contract.stake} DASH</p>
          <p className="text-gray-600">Creator's Percentage: {contract.percentage}%</p>
          <p className="text-gray-600">Creator Email: {contract.email}</p>
          <p className="text-gray-600">Status: {contract.status}</p>
          <p className="text-gray-600">
            Acceptance Deadline: {new Date(contract.acceptanceDeadline).toLocaleDateString()}
          </p>
          {contract.accepterEmail && (
            <p className="text-gray-600">Accepter Email: {contract.accepterEmail}</p>
          )}
          {contract.status === "cancelled" && (
            <p className="text-yellow-500">
              This contract was cancelled because the creator and accepter emails were identical.
            </p>
          )}
          {contract.status === "accepted" && (
            <p className="text-green-500">This contract has been accepted.</p>
          )}
          {contract.status === "open" && (
            <div className="mt-4 space-y-2">
              <div>
                <label
                  htmlFor="accepterEmail"
                  className="block text-sm font-medium text-gray-600"
                >
                  Your Email
                </label>
                <input
                  id="accepterEmail"
                  type="email"
                  className="border p-2 rounded w-full"
                  value={accepterEmail}
                  onChange={(e) => {
                    console.log("Contract: Accepter email changed:", e.target.value);
                    setAccepterEmail(e.target.value);
                  }}
                  placeholder="Enter your email to accept"
                  aria-label="Accepter email"
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