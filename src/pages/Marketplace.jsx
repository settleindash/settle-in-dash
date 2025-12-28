// src/pages/Marketplace.jsx
import { useEffect, useCallback, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useEvents } from "../hooks/useEvents";
import { useContracts } from "../hooks/useContracts"; // ← NEW: import this
import { useConstants } from "../hooks/useConstants";
import PageHeader from "../utils/formats/PageHeader.jsx";
import FilterEvents from "../components/FilterEvents.jsx";
import { categories } from "../utils/categories";

const Marketplace = () => {
  const { events, getEvents, loading: eventsLoading, error: eventsError } = useEvents();
  const { contracts, fetchContracts, loading: contractsLoading } = useContracts(); // ← NEW: fetch contracts
  const { constants, loading: constantsLoading, error: constantsError } = useConstants();
  const navigate = useNavigate();
  const [hasFetched, setHasFetched] = useState(false);

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

          // NEW: Calculate liquidity for this event
          const eventContracts = contracts.filter(c => c.event_id === event.event_id);

          const openContracts = eventContracts.filter(c => c.status === "open");
          const acceptedContracts = eventContracts.filter(c => c.status === "accepted");

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

              {/* NEW: Liquidity display - right below title */}
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
                  {event.event_date
                    ? new Date(event.event_date).toLocaleString(undefined, {
                        dateStyle: "full",
                        timeStyle: "short",
                      })
                    : "N/A"}
                </span>
              </p>
              <p className="text-xs text-gray-500 -mt-1 mb-3">(your local time)</p>

              <p className="text-sm text-gray-600 mb-1">
                <strong>Category:</strong> {event.category || "N/A"}
              </p>
              <p className="text-xs text-gray-500 mb-4">ID: {event.event_id}</p>

              {outcomes.length > 0 ? (
                <div className="space-y-3">
                  {outcomes.map((outcome) => (
                    <button
                      key={outcome}
                      onClick={() => navigate(`/create-contract?event_id=${event.event_id}&outcome=${encodeURIComponent(outcome)}`)}
                      className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 transition-colors"
                    >
                      Create Contract: {outcome}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">No outcomes defined</p>
              )}
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