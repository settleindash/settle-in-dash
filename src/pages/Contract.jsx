import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useContracts } from "../hooks/useContracts";
import { useEvents } from "../hooks/useEvents";
import ContractCard from "../components/ContractCard";

const Contract = () => {
  const { contract_id } = useParams();
  const navigate = useNavigate();
  const { fetchContracts, contracts, error: contractsError, loading: contractsLoading } = useContracts();
  const { events, getEvents } = useEvents();
  const [eventTitle, setEventTitle] = useState("");

  useEffect(() => {
    if (contract_id) {
      fetchContracts({ contract_id });
    }
  }, [contract_id, fetchContracts]);

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

  if (contractsLoading) {
    return <div className="min-h-screen bg-background p-4">Loading contract...</div>;
  }

  if (contractsError) {
    return (
      <div className="min-h-screen bg-background p-4">
        <header className="bg-primary text-white p-4">
          <h1 className="text-2xl font-semibold">Contract Details</h1>
        </header>
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
        <header className="bg-primary text-white p-4">
          <h1 className="text-2xl font-semibold">Contract Details</h1>
        </header>
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

  return (
    <div className="min-h-screen bg-background p-4">
      <header className="bg-primary text-white p-4">
        <h1 className="text-2xl font-semibold">Contract Details</h1>
      </header>
      <main className="max-w-3xl mx-auto mt-6">
        <ContractCard
          contract={contract}
          eventTitle={eventTitle}
          isSingleView={true}
          navigateTo="/settle"
        />
      </main>
    </div>
  );
};

export default Contract;