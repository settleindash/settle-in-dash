import { useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useEvents } from "../hooks/useEvents";

const Marketplace = () => {
  const { events, getEvents, loading: eventsLoading, error: eventsError } = useEvents();
  const navigate = useNavigate();

  // Parse possible_outcomes (JSON string or comma-separated)
  const parseOutcomes = (outcomes) => {
    if (!outcomes) return [];
    try {
      return JSON.parse(outcomes) || outcomes.split(",").map((o) => o.trim());
    } catch {
      return outcomes.split(",").map((o) => o.trim());
    }
  };

  // Fetch open events
  const fetchData = useCallback(async () => {
    console.log("Marketplace: Fetching events at", new Date().toLocaleString("en-GB", { timeZone: "Europe/Paris" }));
    await getEvents({ status: "open" });
    console.log("Marketplace: Events fetched", events);
  }, [getEvents]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (eventsLoading) {
    return <div className="min-h-screen bg-background p-4">Loading marketplace...</div>;
  }

  if (eventsError) {
    return (
      <div className="min-h-screen bg-background p-4">
        <header className="bg-primary text-white p-4">
          <h1 className="text-2xl font-semibold">Marketplace</h1>
        </header>
        <main className="max-w-7xl mx-auto p-4">
          <p className="text-red-500 text-sm">Error: {eventsError}</p>
        </main>
      </div>
    );
  }

  console.log("Marketplace: Rendering events:", events);

  return (
    <div className="min-h-screen bg-background p-4">
      <header className="bg-primary text-white p-4">
        <h1 className="text-2xl font-semibold">Marketplace</h1>
      </header>
      <main className="max-w-7xl mx-auto p-4 mt-6">
        {events.length === 0 ? (
          <p className="text-gray-600 text-sm sm:text-base">No open events available.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {events.map((event) => {
              const title = event.title || "Event";
              const outcomes = parseOutcomes(event.possible_outcomes);
              return (
                <div key={event.event_id} className="mb-6">
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-base font-semibold mb-4">{title}</h2>
                    {outcomes.length > 0 ? (
                      <div className="space-y-4">
                        {outcomes.map((outcome) => (
                          <button
                            key={outcome}
                            onClick={() =>
                              navigate(
                                `/order-book?event_id=${event.event_id}&outcome=${encodeURIComponent(outcome)}&position_type=buy`
                              )
                            }
                            className="bg-blue-500 text-white w-full px-3 py-1 rounded text-sm hover:bg-blue-600"
                            aria-label={`Buy ${outcome} for ${title}`}
                          >
                            {outcome}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-600 text-sm mt-2">No outcomes available for this event.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default Marketplace;