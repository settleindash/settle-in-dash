import { useLocation, useNavigate, Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { useContracts } from "../hooks/useContracts";
import { useEvents } from "../hooks/useEvents";
import FilterContracts from "../components/FilterContracts"; // Adjust the import path as needed
import PageHeader from "../utils/formats/PageHeader.jsx"; // Reusable header component

const OrderBook = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const query = new URLSearchParams(location.search);
  const event_id = query.get("event_id");
  const selectedOutcome = query.get("outcome"); // Get the outcome from URL (from Marketplace)
  const [filteredContracts, setFilteredContracts] = useState([]); // State to hold filtered contracts
  const { contracts, fetchContracts, error: contractsError, loading: contractsLoading } = useContracts();
  const { events, getEvents } = useEvents();
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState(""); // State for event date

  // Fetch contracts and event details
  useEffect(() => {
    console.log("OrderBook: useEffect triggered, event_id:", event_id, "contracts:", contracts);
    if (event_id) {
      fetchContracts({ event_id, status: "open" });
    } else {
      console.log("OrderBook: No event_id found in URL");
    }
  }, [event_id, fetchContracts]);

  // Fetch event title and date
  useEffect(() => {
    console.log("OrderBook: Events useEffect triggered, event_id:", event_id, "events:", events);
    if (event_id) {
      const foundEvent = events.find((e) => e.event_id === event_id);
      if (foundEvent) {
        setEventTitle(foundEvent.title || "");
        setEventDate(foundEvent.event_date || "");
        console.log("OrderBook: Found event title:", foundEvent.title, "date:", foundEvent.event_date);
      } else {
        getEvents({ status: "open" }).then((eventResult) => {
          const event = Array.isArray(eventResult)
            ? eventResult.find((e) => e.event_id === event_id)
            : eventResult;
          setEventTitle(event ? event.title : "");
          setEventDate(event ? event.event_date : "");
          console.log("OrderBook: Fetched event title:", event ? event.title : "Not set", "date:", event ? event.event_date : "Not set");
        });
      }
    }
  }, [event_id, events, getEvents]);

  // Handle navigation to create a contract
  const handleCreateContract = () => {
    console.log("OrderBook: CreateContract button clicked, event_id:", event_id);
    if (!event_id) {
      console.log("OrderBook: Cannot navigate, event_id is undefined");
      return;
    }
    navigate(`/create-contract?event_id=${event_id}`);
  };

  // Handle loading state
  if (contractsLoading) {
    return <div className="min-h-screen bg-background p-4">Loading order book...</div>;
  }

  // Handle error state
  if (contractsError) {
    return (
      <div className="min-h-screen bg-background p-4">
        <PageHeader title="Order Book" />
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

  // Render the order book table
  const renderContent = (contractsToRender) => {
    // Get unique outcomes
    const uniqueOutcomes = [...new Set(contractsToRender.map((c) => c.outcome))];

    // Return message if no contracts are available
    if (uniqueOutcomes.length === 0) {
      return <p className="text-gray-600 text-sm">No open contracts available for this event.</p>;
    }

    // Group contracts by outcome and sort by percentage in descending order
    const contractsByOutcome = uniqueOutcomes.map((outcome) => {
      const outcomeContracts = contractsToRender
        .filter((c) => c.outcome === outcome && c.position_type === "sell") // Only show sell contracts (for buying)
        .sort((a, b) => {
          const percA = Number(a.percentage) || 0;
          const percB = Number(b.percentage) || 0;
          return percB - percA; // Descending order (highest odds at the top)
        });
      return { outcome, contracts: outcomeContracts };
    });

    // Find the maximum number of contracts for any outcome to set row count
    const maxContracts = Math.max(
      ...contractsByOutcome.map((group) => group.contracts.length),
      1 // Ensure at least one row
    );

    // Calculate payout ratio for each row
    const calculatePayoutRatio = (rowIndex) => {
      const percentages = contractsByOutcome
        .map((group) => {
          const contract = group.contracts[rowIndex];
          return contract ? Number(contract.percentage) || 0 : null;
        })
        .filter((p) => p !== null); // Exclude null (no contract)
      if (percentages.length === 0) return null;
      const sum = percentages.reduce((acc, curr) => acc + curr, 0);
      return ((sum / percentages.length - 1) * 100).toFixed(0) + "%"; // Convert to percentage
    };

    return (
      <div className="w-full overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-200">
              {uniqueOutcomes.map((outcome) => (
                <th
                  key={outcome}
                  className={`border p-2 text-left min-w-[150px] ${
                    selectedOutcome === outcome ? "bg-blue-200" : ""
                  }`} // Darker highlight for selected outcome
                >
                  {outcome}
                </th>
              ))}
              <th className="border p-2 text-left min-w-[150px]">Total Payout Ratio</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(maxContracts)].map((_, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50">
                {uniqueOutcomes.map((outcome) => {
                  const { contracts } = contractsByOutcome.find(
                    (group) => group.outcome === outcome
                  ) || { contracts: [] };
                  const contract = contracts[rowIndex];
                  return (
                    <td
                      key={`${outcome}-${rowIndex}`}
                      className={`border p-2 ${
                        selectedOutcome === outcome ? "bg-blue-100" : ""
                      }`} // Darker highlight for selected outcome
                    >
                      {contract ? (
                        <Link
                          to={`/contract/${contract.contract_id}`}
                          className="text-blue-500 hover:underline"
                          aria-label={`View contract ${contract.contract_id} for ${outcome}`}
                        >
                          {Number(contract.percentage)
                            ? `${Number(contract.percentage).toFixed(2)} (${contract.stake} DASH)`
                            : "N/A"}
                        </Link>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                  );
                })}
                <td className="border p-2">
                  {calculatePayoutRatio(rowIndex) || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <PageHeader title={`Order Book: ${eventTitle || "Event"}`} />
      <main className="max-w-7xl mx-auto mt-6">
        <div className="flex flex-col md:flex-row md:space-x-4 mb-6">
          {/* Explanatory Text Box */}
          <div className="flex-1 p-4 bg-white border rounded-lg shadow text-sm text-gray-600 mb-4 md:mb-0">
            <h3 className="text-lg font-medium text-blue-800 mb-2">How to Use the Order Book</h3>
            <p>
              Welcome to the Order Book for {eventTitle || "this event"}. Here, you can view available
              contracts to buy (accept) for each outcome. Each column shows contracts for an outcome,
              sorted by odds (highest first). Click the odds to view and accept a contract. The Total
              Payout Ratio shows the average odds across outcomes, helping you assess the spread. To
              create a new sell contract, click "Create Contract".
            </p>
          </div>
          {/* Event Info Box */}
          <div className="flex-1 p-4 bg-white border rounded-lg shadow text-sm text-gray-600">
            <h3 className="text-lg font-medium text-blue-800 mb-2">Event Details</h3>
            <p>
              <strong>Event:</strong> {eventTitle || "N/A"}
            </p>
            <p>
              <strong>Date & Time:</strong>{" "}
              {eventDate ? new Date(eventDate).toLocaleString("en-GB", { 
                timeZone: "Europe/Paris",
                dateStyle: "medium",
                timeStyle: "short"
              }) : "N/A"}
            </p>
          </div>
        </div>
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