// src/pages/Marketplace.jsx
import { useEffect, useCallback, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useEvents } from "../hooks/useEvents";
import { useConstants } from "../hooks/useConstants";
import PageHeader from "../utils/formats/PageHeader.jsx";
import FilterEvents from "../components/FilterEvents.jsx";

const Marketplace = () => {
  const { events, getEvents, loading: eventsLoading } = useEvents();
  const { constants, loading: constantsLoading, error: constantsError } = useConstants();
  const navigate = useNavigate();
  const [hasFetched, setHasFetched] = useState(false);

  const parseOutcomes = useCallback((outcomes) => {
    if (!outcomes) return [];
    try {
      if (typeof outcomes === "string") {
        const decoded = JSON.parse(outcomes);
        if (Array.isArray(decoded)) return decoded;
        return outcomes.split(",").map((o) => o.trim());
      }
      if (Array.isArray(outcomes)) return outcomes;
      return [];
    } catch {
      return typeof outcomes === "string" ? outcomes.split(",").map((o) => o.trim()) : [];
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (hasFetched) return;
    await getEvents({ status: "open" });
    setHasFetched(true);
  }, [getEvents, hasFetched]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ALL HOOKS FIRST — renderContent BEFORE any return
  const renderContent = useCallback(
    (filteredEvents, constants) => {
      if (!filteredEvents || filteredEvents.length === 0) {
        return <p className="text-center text-gray-600 mt-8">No upcoming events available.</p>;
      }

      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-6">
          {filteredEvents.map((event) => {
            const title = event.title || "Untitled Event";
            const outcomes = parseOutcomes(event.possible_outcomes);

            return (
              <div key={event.event_id} className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
                <h2 className="text-lg font-bold mb-3">
                  <Link to={`/orderbook?event_id=${event.event_id}`} className="text-blue-600 hover:underline">
                    {title}
                  </Link>
                </h2>
                <p className="text-sm text-gray-600 mb-1">
                  <strong>Date:</strong>{' '}
                  <span className="text-gray-800">
                    {event.event_date
                      ? new Date(event.event_date).toLocaleString(undefined, {
                          dateStyle: "full",
                          timeStyle: "short",
                        })
                      : "N/A"}
                  </span>
                </p>
                <p className="text-xs text-gray-500 -mt-3">
                  (your local time)
                </p>
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
                        className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700"
                      >
                        Create Contract: {outcome}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No outcomes</p>
                )}
              </div>
            );
          })}
        </div>
      );
    },
    [navigate, parseOutcomes]
  );

  // NOW SAFE TO RETURN
  if (constantsLoading) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <p className="text-xl">Loading configuration...</p>
      </div>
    );
  }

  if (constantsError) {
    return (
      <div className="min-h-screen bg-background p-8 text-red-500 text-center">
        <p>Failed to load configuration</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Marketplace" />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <FilterEvents
          events={events || []}
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