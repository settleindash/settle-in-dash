// src/components/ResolveTwistForm.jsx
// Component to handle twist resolution for a selected contract.

const ResolveTwistForm = ({
  selectedContractId,
  filteredContracts,
  triggerTwist,
  setSelectedContract,
  setError,
  error, // Added prop
}) => {
  const handleResolveTwist = async (e) => {
    e.preventDefault();
    console.log("ResolveTwistForm: Resolving twist for contract_id:", selectedContractId);
    setError("");

    if (!selectedContractId) {
      setError("Please select a contract.");
      console.log("ResolveTwistForm: Validation failed - no contract selected for twist");
      return;
    }
    const contract = filteredContracts.find((c) => c.contract_id === selectedContractId);
    if (!contract) {
      setError("Selected contract not found.");
      console.log("ResolveTwistForm: Validation failed - contract not found for twist");
      return;
    }

    const result = await triggerTwist(selectedContractId);
    if (result.success) {
      console.log("ResolveTwistForm: Twist resolved successfully:", result.message);
      setSelectedContract(null);
      alert(result.message);
    } else {
      setError(`Error: ${result.error}`);
      console.error("ResolveTwistForm: Failed to resolve twist:", result.error);
    }
  };

  return (
    <div className="space-y-6 mb-6">
      <h3 className="text-base sm:text-lg font-semibold">Resolve Twist for Contract #{selectedContractId}</h3>
      <form onSubmit={handleResolveTwist} className="space-y-4">
        <p className="text-gray-600 text-[10px] sm:text-base">Click below to resolve this twist using the xAI Grok API.</p>
        {error && <p className="text-red-500 text-xs sm:text-base">{error}</p>} {/* Added error display */}
        <button
          type="submit"
          className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50 min-h-[44px] text-[10px] sm:text-base"
          disabled={false}
          aria-label="Resolve twist with Grok API"
        >
          Resolve with Grok API
        </button>
      </form>
    </div>
  );
};

export default ResolveTwistForm;