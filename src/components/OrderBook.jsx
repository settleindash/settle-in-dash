// src/components/OrderBook.jsx
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useState, useEffect,useCallback } from "react";
import { useContracts } from "../hooks/useContracts";
import { useEvents } from "../hooks/useEvents";
import { useConstants } from "../hooks/useConstants";
import FilterContracts from "../components/FilterContracts";
import PageHeader from "../utils/formats/PageHeader.jsx";

const OrderBook = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const event_id = query.get("event_id");
  const selectedOutcome = query.get("outcome");
  const [filteredContracts, setFilteredContracts] = useState([]);

  const { contracts, fetchContracts, error: contractsError, loading: contractsLoading } = useContracts();
  const { events, getEvents } = useEvents();
  const { constants, loading: constantsLoading, error: constantsError } = useConstants();

  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");


  // Fetch contracts
  useEffect(() => {
    if (event_id) {
      fetchContracts({ event_id, status: "open" });
    }
  }, [event_id, fetchContracts]);

  // Fetch event details
  useEffect(() => {
    if (!event_id) return;
    const found = events.find(e => e.event_id === event_id);
    if (found) {
      setEventTitle(found.title || "");
      setEventDate(found.event_date || "");
    } else {
      getEvents({ status: "open" }).then(result => {
        const event = Array.isArray(result) ? result.find(e => e.event_id === event_id) : result;
        setEventTitle(event?.title || "");
        setEventDate(event?.event_date || "");
      });
    }
  }, [event_id, events, getEvents]);

  const handleCreateContract = () => {
    if (event_id) navigate(`/create-contract?event_id=${event_id}`);
  };

  // Loading contracts
  if (contractsLoading) {
    return <div className="min-h-screen bg-background p-4">Loading order book...</div>;
  }

  if (contractsError) {
    return (
      <div className="min-h-screen bg-background p-4">
        <PageHeader title="Order Book" />
        <main className="max-w-3xl mx-auto mt-6 text-center">
          <p className="text-red-500">{contractsError}</p>
          <button onClick={() => navigate("/marketplace")} className="mt-4 bg-gray-500 text-white px-6 py-2 rounded">
            Back to Marketplace
          </button>
        </main>
      </div>
    );
  }

  const renderContent = (contractsToRender) => {
    const uniqueOutcomes = [...new Set(contractsToRender.map(c => c.outcome))];

    if (uniqueOutcomes.length === 0) {
      return <p className="text-center text-gray-600 mt-8">No open contracts available.</p>;
    }

    const contractsByOutcome = uniqueOutcomes.map(outcome => {
      const outcomeContracts = contractsToRender
        .filter(c => c.outcome === outcome && c.position_type === "sell")
        .sort((a, b) => (Number(b.odds) || 0) - (Number(a.odds) || 0));
      return { outcome, contracts: outcomeContracts };
    });

    const maxContracts = Math.max(...contractsByOutcome.map(g => g.contracts.length), 1);

    const calculatePayoutRatio = (rowIndex) => {
      const odds = contractsByOutcome
        .map(g => g.contracts[rowIndex])
        .filter(Boolean)
        .map(c => Number(c.odds) || 0);
      return odds.length > 0 ? (odds.reduce((a, b) => a + b, 0) / odds.length).toFixed(2) : null;
    };

    return (
      <div className="w-full overflow-x-auto mt-8">
        <table className="w-full border-collapse bg-white shadow rounded">
          <thead>
            <tr className="bg-gray-100">
              {uniqueOutcomes.map(outcome => (
                <th key={outcome} className={`border p-3 text-left font-bold ${selectedOutcome === outcome ? "bg-blue-200" : ""}`}>
                  {outcome}
                </th>
              ))}
              <th className="border p-3 text-left font-bold">Average Odds</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(maxContracts)].map((_, i) => (
              <tr key={i} className="hover:bg-gray-50">
                {uniqueOutcomes.map(outcome => {
                  const contract = contractsByOutcome.find(g => g.outcome === outcome)?.contracts[i];
                  return (
                    <td key={outcome} className={`border p-3 ${selectedOutcome === outcome ? "bg-blue-50" : ""}`}>
                      {contract ? (
                        <Link to={`/contract/${contract.contract_id}`} className="text-blue-600 hover:underline font-medium">
                          {Number(contract.odds).toFixed(2)} ({contract.stake} DASH)
                        </Link>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  );
                })}
                <td className="border p-3 font-medium">
                  {calculatePayoutRatio(i) || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title={`Order Book: ${eventTitle || "Loading..."}`} />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold text-blue-800 mb-3">How to Use the Order Book</h3>
            <p className="text-sm text-gray-700">
              View available contracts to accept. Highest odds at top. Click odds to accept. Create new sell contracts below.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-bold text-blue-800 mb-3">Event Details</h3>
            <p className="text-sm"><strong>Event:</strong> {eventTitle || "N/A"}</p>
            <p className="text-sm">
              <strong>Date:</strong>{" "}
              {eventDate ? new Date(eventDate).toLocaleString("en-GB", {
                timeZone: "Europe/Paris",
                dateStyle: "medium",
                timeStyle: "short",
              }) : "N/A"}
            </p>
          </div>
        </div>

        <button
          onClick={handleCreateContract}
          disabled={!event_id}
          className="w-full md:w-auto bg-orange-500 text-white px-8 py-3 rounded-lg font-bold hover:bg-orange-600 disabled:opacity-50 mb-6"
        >
          Create New Contract
        </button>

        <FilterContracts
          contracts={contracts || []}
          onFilterChange={setFilteredContracts}
          renderContent={renderContent}
          showFilters={false}
          constants={constants}
        />

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate("/marketplace")}
            className="bg-gray-600 text-white px-8 py-3 rounded-lg hover:bg-gray-700"
          >
            Back to Marketplace
          </button>
        </div>
      </main>
    </div>
  );
};

export default OrderBook;