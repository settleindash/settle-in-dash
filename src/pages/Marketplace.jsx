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
    await fetchContracts({ status: ["open", "accepted"] });
    setHasFetched(true);
  }, [getEvents, fetchContracts, hasFetched]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Add this right after fetchData definition
console.log("fetchData called — hasFetched:", hasFetched);
console.log("Events after fetch:", events);
console.log("Contracts after fetch:", contracts);


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
        const allOutcomes = parseOutcomes(event.possible_outcomes);

        // Always show the event card — no skipping

        // Find open sell contracts for this event
        const eventContracts = contracts.filter(
          c => c.event_id === event.event_id && 
               c.status === "open" && 
               c.position_type === "sell"
        );

        // Only care about "Yes" and "No" outcomes
        const binaryOutcomes = ["Yes", "No"];

        // For each binary outcome, find the best (highest odds) contract
        const bestContracts = binaryOutcomes.reduce((acc, outcome) => {
          const matching = eventContracts.filter(c => c.outcome === outcome);
          if (matching.length === 0) {
            acc[outcome] = null;
            return acc;
          }

          // Sort: highest odds first, then oldest
          const sorted = matching.sort((a, b) => {
            const oddsDiff = Number(b.odds || 0) - Number(a.odds || 0);
            if (oddsDiff !== 0) return oddsDiff;
            return new Date(a.created_at) - new Date(b.created_at);
          });

          acc[outcome] = sorted[0];
          return acc;
        }, {});

        // Liquidity calculation (unchanged)
        const openContracts = contracts.filter(c => c.event_id === event.event_id && c.status === "open");
        const acceptedContracts = contracts.filter(c => c.event_id === event.event_id && c.status === "accepted");
        const totalOpen = openContracts.reduce((sum, c) => sum + Number(c.stake || 0), 0).toFixed(2);
        const totalAccepted = acceptedContracts.reduce((sum, c) => {
          return sum + Number(c.stake || 0) + Number(c.accepter_stake || 0);
        }, 0).toFixed(2);

        return (
          <div key={event.event_id} className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
            {/* Title in orange box + note */}
            <div className="bg-orange-100 border border-orange-300 rounded-lg p-4 mb-4 text-center">
              <h2 className="text-xl font-bold text-orange-800">
                <Link 
                  to={`/orderbook?event_id=${event.event_id}`} 
                  className="hover:underline"
                >
                  {title}
                </Link>
              </h2>
              <p className="text-sm text-orange-700 mt-1">
                Click title to view order book
              </p>
            </div>

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

            <div className="mb-4">
              <h3 className="text-md font-semibold text-gray-700 mb-3">
                Accept Odds on:
              </h3>
              <div className="space-y-3">
                {binaryOutcomes.map((outcome) => {
                  const bestContract = bestContracts[outcome];
                  if (!bestContract) {
                    return (
                      <button
                        key={outcome}
                        disabled
                        className="w-full bg-gray-400 text-white py-2 rounded font-medium cursor-not-allowed flex justify-between items-center px-4"
                      >
                        <span>{outcome}</span>
                        <span className="text-sm bg-gray-500 px-2 py-1 rounded-full">No offers</span>
                      </button>
                    );
                  }

                  const odds = Number(bestContract.odds).toFixed(2);
                  const link = `/contract/${bestContract.contract_id}`;

                  return (
                    <Link
                      key={outcome}
                      to={link}
                      className="w-full bg-green-600 text-white py-2 rounded font-medium hover:bg-green-700 transition-colors flex justify-between items-center px-4"
                    >
                      <span>Accept {outcome}</span>
                      <span className="text-sm bg-green-800 px-2 py-1 rounded-full">
                        {odds}x
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

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