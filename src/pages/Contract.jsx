// src/pages/Contract.jsx
import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useCallback, useState } from "react";
import { useContracts } from "../hooks/useContracts";
import { useEvents } from "../hooks/useEvents";
import ContractCard from "../components/ContractCard";

const Contract = () => {
  const { contract_id } = useParams();
  const navigate = useNavigate();
  const { fetchContracts, contracts, error: contractsError, loading: contractsLoading } = useContracts();
  const { getEvent } = useEvents();

  const [eventTitle, setEventTitle] = useState("");

  const fetchContractData = useCallback(async () => {
    if (!contract_id) return;
    try {
      const fetchedContracts = await fetchContracts({ contract_id });
      const contract = fetchedContracts[0];
      if (contract?.event_id) {
        const event = await getEvent(contract.event_id);
        setEventTitle(event?.title || "");
      }
    } catch (err) {
      console.error("Contract: Error fetching contract:", err);
    }
  }, [contract_id, fetchContracts, getEvent]);

  useEffect(() => {
    fetchContractData();
  }, [fetchContractData]);

  const handleAcceptSuccess = useCallback(() => {
    fetchContractData();
  }, [fetchContractData]);

  // SAFE LOADING & ERROR STATES
  if (contractsLoading) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <p className="text-xl">Loading contract...</p>
      </div>
    );
  }

  if (contractsError) {
    return (
      <div className="min-h-screen bg-background p-8 text-red-500 text-center">
        <p>Error loading contract</p>
        <button onClick={() => navigate("/marketplace")} className="mt-4 bg-gray-600 text-white px-6 py-3 rounded">
          Back to Marketplace
        </button>
      </div>
    );
  }

  if (!Array.isArray(contracts) || contracts.length === 0) {
    return (
      <div className="min-h-screen bg-background p-8 text-center">
        <p className="text-xl text-gray-600">No contract found</p>
        <button onClick={() => navigate("/marketplace")} className="mt-4 bg-gray-600 text-white px-6 py-3 rounded">
          Back to Marketplace
        </button>
      </div>
    );
  }

  const contract = contracts.find((c) => c.contract_id === contract_id);
  if (!contract) {
    return (
      <div className="min-h-screen bg-background p-8 text-center">
        <p className="text-xl text-gray-600">Contract not found</p>
        <button onClick={() => navigate("/marketplace")} className="mt-4 bg-gray-600 text-white px-6 py-3 rounded">
          Back to Marketplace
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <main className="max-w-3xl mx-auto mt-6">
        <ContractCard
          contract={contract}
          eventTitle={eventTitle}
          isSingleView={true}
          navigateTo="/marketplace"
          onAcceptSuccess={handleAcceptSuccess}
        />
      </main>
    </div>
  );
};

export default Contract;