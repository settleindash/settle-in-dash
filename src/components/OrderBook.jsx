import { useLocation, useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useContracts } from "../hooks/useContracts";
import { useEvents } from "../hooks/useEvents";
import FilterContracts from "../components/FilterContracts"; // Adjust the import path as needed

const OrderBook = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const event_id = query.get("event_id");
  const [filteredContracts, setFilteredContracts] = useState([]); // State to hold filtered contracts
  const { contracts, fetchContracts, error: contractsError, loading: contractsLoading } = useContracts();
  const { events, getEvents } = useEvents();
  const [eventTitle, setEventTitle] = useState("");

  useEffect(() => {
    console.log("OrderBook: useEffect triggered, event_id:", event_id, "contracts:", contracts);
    if (event_id) {
      fetchContracts({ event_id, status: "open" });
    } else {
      console.log("OrderBook: No event_id found in URL");
    }
  }, [event_id, fetchContracts]);

  useEffect(() => {
    console.log("OrderBook: Events useEffect triggered, event_id:", event_id, "events:", events);
    if (event_id) {
      const foundEvent = events.find((e) => e.event_id === event_id);
      if (foundEvent) {
        setEventTitle(foundEvent.title || "");
        console.log("OrderBook: Found event title:", foundEvent.title);
      } else {
        getEvents({ status: "open" }).then((eventResult) => {
          const event = Array.isArray(eventResult)
            ? eventResult.find((e) => e.event_id === event_id)
            : eventResult;
          setEventTitle(event ? event.title : "");
          console.log("OrderBook: Fetched event title:", event ? event.title : "Not set");
        });
      }
    }
  }, [event_id, events, getEvents]);

  const handleCreateContract = () => {
    console.log("OrderBook: CreateContract button clicked, event_id:", event_id);
    if (!event_id) {
      console.log("OrderBook: Cannot navigate, event_id is undefined");
      return;
    }
    navigate(`/create-contract?event_id=${event_id}`);
  };

  if (contractsLoading) {
    return <div className="min-h-screen bg-background p-4">Loading order book...</div>;
  }

  if (contractsError) {
    return (
      <div className="min-h-screen bg-background p-4">
        <header className="bg-primary text-white p-4">
          <h1 className="text-2xl font-semibold">Order Book</h1>
        </header>
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

  console.log("OrderBook: Rendering, event_id:", event_id, "contracts:", contracts);

  const renderContent = (contractsToRender) => {
    const uniqueOutcomes = [...new Set(contractsToRender.map((c) => c.outcome))];
    return uniqueOutcomes.length === 0 ? (
      <p className="text-gray-600 text-sm">No open contracts available for this event.</p>
    ) : (
      <div className="flex flex-col md:flex-row gap-6">
        {uniqueOutcomes.map((outcome, index) => {
          const outcomeContracts = contractsToRender
            .filter((c) => c.outcome === outcome)
            .sort((a, b) => {
              const percA = Number(a.percentage) || 0;
              const percB = Number(b.percentage) || 0;
              return percB - percA;
            });
          return (
            <div key={index} className="w-full md:w-1/2">
              <h2 className="text-lg font-semibold mb-2">{outcome}</h2>
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border p-2 text-left">Contract ID</th>
                    <th className="border p-2 text-left">Outcome</th>
                    <th className="border p-2 text-left">Odds (%)</th>
                    <th className="border p-2 text-left">Stake (DASH)</th>
                  </tr>
                </thead>
                <tbody>
                  {outcomeContracts.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="border p-2 text-center text-gray-500">
                        No contracts available for this outcome.
                      </td>
                    </tr>
                  ) : (
                    outcomeContracts.map((contract) => (
                      <tr key={contract.contract_id} className="hover:bg-gray-100">
                        <td className="border p-2">
                          <Link
                            to={`/contract/${contract.contract_id}`}
                            className="text-blue-500 hover:underline"
                            aria-label={`View details for contract ${contract.contract_id}`}
                          >
                            {contract.contract_id}
                          </Link>
                        </td>
                        <td className="border p-2">{contract.outcome}</td>
                        <td className="border p-2">
                          {Number(contract.percentage) ? Number(contract.percentage).toFixed(2) : "N/A"}
                        </td>
                        <td className="border p-2">{contract.stake || "N/A"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <header className="bg-primary text-white p-4">
        <h1 className="text-2xl font-semibold">Order Book: {eventTitle || "Event"}</h1>
      </header>
      <main className="max-w-7xl mx-auto mt-6">
        <button
          onClick={handleCreateContract}
          className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 mb-4 text-sm"
          aria-label={`Create contract for event ${event_id}`}
          disabled={!event_id}
        >
          Create Contract
        </button>
        <FilterContracts
          contracts={contracts || []}
          onFilterChange={setFilteredContracts}
          renderContent={renderContent}
          showFilters={false}
        />
        <button
          className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 mt-4 text-sm w-full"
          aria-label="Back to Marketplace"
          onClick={() => navigate("/marketplace")}
        >
          Back to Marketplace
        </button>
      </main>
    </div>
  );
};

export default OrderBook;