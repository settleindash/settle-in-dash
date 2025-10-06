import React, { useEffect, useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEvents } from "../hooks/useEvents";
import PageHeader from "../utils/formats/PageHeader.jsx";
import FilterEvents from "../components/FilterEvents.jsx";

const Marketplace = () => {
  const { events, getEvents, loading: eventsLoading, error: eventsError } = useEvents();
  const navigate = useNavigate();
  const [hasFetched, setHasFetched] = useState(false);

  // Parse possible_outcomes with error handling
  const parseOutcomes = useCallback((outcomes) => {
    if (!outcomes) {
      console.warn("Marketplace: No outcomes provided");
      return [];
    }
    try {
      if (typeof outcomes === "string") {
        const decoded = JSON.parse(outcomes);
        if (Array.isArray(decoded)) {
          return decoded;
        }
        return outcomes.split(",").map((o) => o.trim());
      } else if (Array.isArray(outcomes)) {
        return outcomes;
      }
      console.warn("Marketplace: Unexpected outcomes format:", outcomes);
      return [];
    } catch (error) {
      console.error("Marketplace: Failed to parse outcomes:", outcomes, error);
      return typeof outcomes === "string" ? outcomes.split(",").map((o) => o.trim()) : [];
    }
  }, []);

  // Fetch all events
  const fetchData = useCallback(async () => {
    if (hasFetched) return;
    console.log("Marketplace: Fetching events at", new Date().toLocaleString("en-GB", { timeZone: "Europe/Paris" }));
    try {
      await getEvents({ status: "open" });
      console.log("Marketplace: Events fetched, count:", events?.length || 0);
      setHasFetched(true);
    } catch (error) {
      console.error("Marketplace: Failed to fetch events:", error);
      setHasFetched(true);
    }
  }, [getEvents, hasFetched]);

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debug events changes
  useEffect(() => {
    console.log("Marketplace: Events updated:", events);
  }, [events]);

  // Render event cards
  const renderContent = useCallback(
    (filteredEvents) => {
      if (!filteredEvents || filteredEvents.length === 0) {
        console.log("Marketplace: No filtered events to render");
        return <p className="text-gray-600 text-sm sm:text-base">No upcoming events available.</p>;
      }
      console.log("Marketplace: Rendering filtered events, count:", filteredEvents.length);
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-6">
          {filteredEvents.map((event) => {
            const title = event.title || "Event";
            const outcomes = parseOutcomes(event.possible_outcomes);
            return (
              <div key={event.event_id} className="bg-white p-6 rounded-lg shadow">
                <h2 className="text-base font-semibold mb-4">{title}</h2>
                <p className="text-gray-600 text-sm mb-2">
                  Date: {new Date(event.event_date).toLocaleString("en-GB", {
                    timeZone: "Europe/Paris",
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
                <p className="text-gray-600 text-sm mb-2">Category: {event.category || "N/A"}</p>
                <p className="text-gray-600 text-sm mb-4">Event ID: {event.event_id}</p>
                {outcomes.length > 0 ? (
                  <div className="space-y-4">
                    {outcomes.map((outcome) => (
                      <button
                        key={outcome}
                        onClick={() =>
                          navigate(
                            `/create-contract?event_id=${event.event_id}&outcome=${encodeURIComponent(outcome)}`
                          )
                        }
                        className="bg-blue-500 text-white w-full px-3 py-1 rounded text-sm hover:bg-blue-600"
                        aria-label={`Create contract for ${outcome} in ${title}`}
                      >
                        Create Contract for {outcome}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600 text-sm mt-2">No outcomes available for this event.</p>
                )}
              </div>
            );
          })}
        </div>
      );
    },
    [navigate, parseOutcomes]
  );

  console.log("Marketplace: Rendering with events count:", events?.length || 0);

  return (
    <div className="min-h-screen bg-background p-4">
      <PageHeader title="Marketplace" />
      <main className="max-w-7xl mx-auto p-4 mt-6">
        {eventsLoading ? (
          <div>Loading marketplace...</div>
        ) : eventsError ? (
          <p className="text-red-500 text-sm">Error: {eventsError}</p>
        ) : !hasFetched ? (
          <div>Loading marketplace...</div>
        ) : (
          <FilterEvents
            events={events || []}
            renderContent={renderContent}
            showFilters={true}
            eventsPerPage={20}
            includePastEvents={false}
          />
        )}
      </main>
    </div>
  );
};

export default Marketplace;