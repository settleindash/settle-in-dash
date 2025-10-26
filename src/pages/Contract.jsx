// src/pages/Contract.jsx
// Page to display a single contract's details using ContractCard.

import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { useContracts } from "../hooks/useContracts";
import { useEvents } from "../hooks/useEvents";
import ContractCard from "../components/ContractCard";

const Contract = () => {
  const { contract_id } = useParams();
  const navigate = useNavigate();
  const { fetchContracts, contracts, error: contractsError, loading: contractsLoading } = useContracts();
  const { events, getEvents, loading: eventsLoading } = useEvents();
  const [eventTitle, setEventTitle] = useState("");

  // Memoized function to fetch contract data
  const fetchContractData = useCallback(async () => {
    if (!contract_id) return;
    console.log("Contract: Fetching contract with contract_id:", contract_id);
    try {
      await fetchContracts({ contract_id });
    } catch (err) {
      console.error("Contract: Error fetching contract:", err);
    }
  }, [contract_id, fetchContracts]);

  // Fetch contract data on mount or when contract_id changes
  useEffect(() => {
    fetchContractData();
  }, [fetchContractData]);

  // Update event title when contracts or events change
  useEffect(() => {
    if (contracts.length === 0 || !contract_id) return;

    const foundContract = contracts.find((c) => c.contract_id === contract_id);
    if (!foundContract?.event_id) {
      setEventTitle("");
      return;
    }

    const foundEvent = events.find((e) => e.event_id === foundContract.event_id);
    if (foundEvent) {
      setEventTitle(foundEvent.title || "");
      console.log("Contract: Found event title:", foundEvent.title);
    } else if (!eventsLoading) {
      console.log("Contract: Event not found locally, fetching events for event_id:", foundContract.event_id);
      getEvents({ status: "all" }).then((eventResult) => {
        const event = Array.isArray(eventResult)
          ? eventResult.find((e) => e.event_id === foundContract.event_id)
          : eventResult;
        setEventTitle(event ? event.title : "");
        console.log("Contract: Fetched event title:", event ? event.title : "Not set");
      }).catch((err) => {
        console.error("Contract: Error fetching events:", err);
      });
    }
  }, [contracts, contract_id, events, getEvents, eventsLoading]);

  // Handle contract acceptance success
  const handleAcceptSuccess = useCallback(() => {
    console.log("Contract: onAcceptSuccess triggered, refetching contract_id:", contract_id);
    fetchContractData();
  }, [contract_id, fetchContractData]);

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
            aria-label="Back to Marketplace"
            onClick={() => navigate("/marketplace")}
          >
            Back to Marketplace
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
          <p className="text-red-500 text-sm">Contract not found for ID: {contract_id}. Please visit the Marketplace to view available contracts.</p>
          <button
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 mt-4 text-sm"
            aria-label="Back to Marketplace"
            onClick={() => navigate("/marketplace")}
          >
            Back to Marketplace
          </button>
        </main>
      </div>
    );
  }

  console.log("Contract: Rendering ContractCard with contract_id:", contract.contract_id);

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