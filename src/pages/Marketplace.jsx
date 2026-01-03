// src/pages/Marketplace.jsx
import { useEffect, useCallback, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useEvents } from "../hooks/useEvents";
import { useContracts } from "../hooks/useContracts"; // ← NEW: import this
import { useConstants } from "../hooks/useConstants";
import { formatCustomDate } from "../utils/validation";
import PageHeader from "../utils/formats/PageHeader.jsx";
import FilterEvents from "../components/FilterEvents.jsx";

const Marketplace = () => {
  const { events, getEvents, loading: eventsLoading, error: eventsError } = useEvents();
  const { contracts, fetchContracts, loading: contractsLoading } = useContracts(); // ← NEW: fetch contracts
  const { constants, loading: constantsLoading, error: constantsError } = useConstants();
  const navigate = useNavigate();
  const [hasFetched, setHasFetched] = useState(false);

console.log(Intl.DateTimeFormat().resolvedOptions().timeZone);  // What timezone is your browser using?

  const parseOutcomes = useCallback((outcomes) => {
    if (!outcomes) return [];
    try {
      if (typeof outcomes === "string") {
        const parsed = JSON.parse(outcomes);
        if (Array.isArray(parsed)) return parsed;
        return outcomes.split(",").map(o => o.trim());
      }
      if (Array.isArray(outcomes)) return outcomes;
      return [];
    } catch {
      return typeof outcomes === "string" ? outcomes.split(",").map(o => o.trim()) : [];
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (hasFetched) return;
    await getEvents({ status: "open" });
    await fetchContracts({}); // ← NEW: fetch all contracts
    setHasFetched(true);
  }, [getEvents, fetchContracts, hasFetched]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

const renderContent = useCallback((filteredEvents, constants) => {
  if (!filteredEvents || filteredEvents.length === 0) {
    return (
      <div className="text-center py-12 text-gray-600">
        <p className="text-xl font-semibold mb-4">No upcoming events found</p>
        <p className="text-sm">Try refreshing or check back later!</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-6">
      {filteredEvents.map((event) => {
        const title = event.title || "Untitled Event";
        const outcomes = parseOutcomes(event.possible_outcomes);

        // Calculate liquidity & probabilities for this event
        const eventContracts = contracts.filter(c => c.event_id === event.event_id && c.status === "open");

        const probabilities = outcomes.reduce((acc, outcome) => {
          const sellContracts = eventContracts.filter(
            c => c.outcome === outcome && c.position_type === "sell"
          );

          if (sellContracts.length === 0) {
            acc[outcome] = null;
            return acc;
          }

          const bestOdds = Math.min(...sellContracts.map(c => Number(c.odds || Infinity)));

          if (bestOdds === Infinity || bestOdds <= 1) {
            acc[outcome] = null;
          } else {
            acc[outcome] = (100 / bestOdds).toFixed(0) + "%";
          }

          return acc;
        }, {});

        // Liquidity for display
        const openContracts = contracts.filter(c => c.event_id === event.event_id && c.status === "open");
        const acceptedContracts = contracts.filter(c => c.event_id === event.event_id && c.status === "accepted");

        const totalOpen = openContracts.reduce((sum, c) => sum + Number(c.stake || 0), 0).toFixed(2);
        const totalAccepted = acceptedContracts.reduce((sum, c) => {
          return sum + Number(c.stake || 0) + Number(c.accepter_stake || 0);
        }, 0).toFixed(2);

        return (
          <div key={event.event_id} className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
            <h2 className="text-lg font-bold mb-3">
              <Link to={`/orderbook?event_id=${event.event_id}`} className="text-blue-600 hover:underline">
                {title}
              </Link>
            </h2>

            {/* Liquidity display */}
            <div className="mb-4 text-sm">
              <p className="text-green-700 font-medium">
                Open Liquidity: {contractsLoading ? "Loading..." : totalOpen} DASH
              </p>
              <p className="text-purple-700 font-medium">
                Accepted Liquidity: {contractsLoading ? "Loading..." : totalAccepted} DASH
              </p>
            </div>

            <p className="text-sm text-gray-600 mb-1">
              <strong>Date:</strong>{" "}
              <span className="text-gray-800">
                {formatCustomDate(event.event_date)}
              </span>
            </p>
            <p className="text-xs text-gray-500 -mt-1 mb-3">(your local time)</p>

            <p className="text-sm text-gray-600 mb-4">
              <strong>Category:</strong> {event.category || "N/A"}
            </p>

            {outcomes.length > 0 ? (
              <div className="mb-4">
                <h3 className="text-md font-semibold text-gray-700 mb-3">
                  Create a Position on:
                </h3>
                <div className="space-y-3">
                  {outcomes.map((outcome) => {
                    const prob = probabilities[outcome];
                    return (
                      <button
                        key={outcome}
                        onClick={() => navigate(`/create-contract?event_id=${event.event_id}&outcome=${encodeURIComponent(outcome)}`)}
                        className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 transition-colors flex justify-between items-center px-4"
                      >
                        <span>{outcome}</span>
                        <span className="text-sm bg-blue-800 px-2 py-1 rounded-full">
                          {prob || "—"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic mb-4">No outcomes defined</p>
            )}

            <p className="text-xs text-gray-500 mt-2">
              ID: {event.event_id}
            </p>
          </div>
        );
      })}
    </div>
  );
}, [navigate, parseOutcomes, contracts, contractsLoading]);


  if (constantsLoading || eventsLoading || contractsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-xl font-semibold text-gray-700">Loading marketplace...</p>
          <p className="text-sm text-gray-500 mt-2">Fetching events, contracts, and configuration</p>
        </div>
      </div>
    );
  }

  if (constantsError || eventsError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center">
        <p className="text-xl font-semibold text-red-600 mb-4">
          {constantsError || eventsError || "Failed to load marketplace"}
        </p>
        <button
          onClick={() => {
            setHasFetched(false);
            fetchData();
          }}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 mb-4"
        >
          Retry
        </button>
        <button
          onClick={() => navigate("/")}
          className="text-blue-600 hover:underline"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Marketplace" />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <h1 className="text-2xl font-bold">Upcoming Events</h1>
          <button
            onClick={() => {
              setHasFetched(false);
              fetchData();
            }}
            disabled={eventsLoading || contractsLoading}
            className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {eventsLoading || contractsLoading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <FilterEvents
          events={events || []}
          contracts={contracts || []} // ← NEW: Pass contracts here
          renderContent={renderContent}
          showFilters={true}
          eventsPerPage={20}
          includePastEvents={false}
          constants={constants}
        />
      </main>
    </div>
  );
};

export default Marketplace;