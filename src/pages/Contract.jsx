// src/pages/Contract.jsx
// Page to display a single contract's details using ContractCard.

import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { useContracts } from "../hooks/useContracts";
import { useEvents } from "../hooks/useEvents";
import ContractCard from "../components/ContractCard";

const Contract = () => {
  const { contract_id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { fetchContracts, contracts, error: contractsError, loading: contractsLoading } = useContracts();
  const { events, getEvents } = useEvents();
  const [eventTitle, setEventTitle] = useState("");

  // Fetch contract data
  useEffect(() => {
    console.log("Contract: Fetching contract with contract_id:", contract_id, "route:", location.pathname);
    if (contract_id) {
      fetchContracts({ contract_id });
    }
  }, [contract_id, fetchContracts, location.pathname]);

  // Update event title
  useEffect(() => {
    if (contracts.length > 0 && contract_id) {
      const foundContract = contracts.find((c) => c.contract_id === contract_id);
      if (foundContract?.event_id) {
        const foundEvent = events.find((e) => e.event_id === foundContract.event_id);
        if (foundEvent) {
          setEventTitle(foundEvent.title || "");
          console.log("Contract: Found event title:", foundEvent.title);
        } else {
          getEvents({ status: "open" }).then((eventResult) => {
            const event = Array.isArray(eventResult)
              ? eventResult.find((e) => e.event_id === foundContract.event_id)
              : eventResult;
            setEventTitle(event ? event.title : "");
            console.log("Contract: Fetched event title:", event ? event.title : "Not set");
          });
        }
      }
    }
  }, [contracts, contract_id, events, getEvents]);

  // Handle contract acceptance success
  const handleAcceptSuccess = () => {
    console.log("Contract: onAcceptSuccess triggered, refetching contract_id:", contract_id);
    if (contract_id) {
      fetchContracts({ contract_id });
    }
  };

  if (contractsLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <main className="max-w-3xl mx-auto mt-6">
          <p className="text-gray-600 text-sm">Loading contract...</p>
        </main>
      </div>
    );
  }

  if (contractsError) {
    return (
      <div className="min-h-screen bg-background p-4">
        <main className="max-w-3xl mx-auto mt-6">
          <p className="text-red-500 text-sm">{contractsError}</p>
          <button
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 mt-4 text-sm"
            aria-label="Back to Settle"
            onClick={() => navigate("/settle")}
          >
            Back to Settle
          </button>
        </main>
      </div>
    );
  }

  const contract = contracts.find((c) => c.contract_id === contract_id);
  if (!contract) {
    return (
      <div className="min-h-screen bg-background p-4">
        <main className="max-w-3xl mx-auto mt-6">
          <p className="text-red-500 text-sm">Contract not found for ID: {contract_id}. Please visit the Settle page to view available contracts.</p>
          <button
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 mt-4 text-sm"
            aria-label="Back to Settle"
            onClick={() => navigate("/settle")}
          >
            Back to Settle
          </button>
        </main>
      </div>
    );
  }

  console.log("Contract: Rendering ContractCard with contract_id:", contract.contract_id, "route:", location.pathname);

  return (
    <div className="min-h-screen bg-background p-4">
      <main className="max-w-3xl mx-auto mt-6">
        <ContractCard
          contract={contract}
          eventTitle={eventTitle}
          isSingleView={true}
          navigateTo="/settle"
          onAcceptSuccess={handleAcceptSuccess} // Pass callback to refetch contract
        />
      </main>
    </div>
  );
};

export default Contract;