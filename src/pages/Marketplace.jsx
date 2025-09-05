// src/pages/Marketplace.jsx
// Displays open events with filtering and sorting via FilterEvents component.

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
    if (!outcomes) return [];
    try {
      return typeof outcomes === "string"
        ? JSON.parse(outcomes) || outcomes.split(",").map((o) => o.trim())
        : outcomes;
    } catch (error) {
      console.error("Marketplace: Failed to parse outcomes:", outcomes, error);
      return typeof outcomes === "string" ? outcomes.split(",").map((o) => o.trim()) : [];
    }
  }, []);

  // Fetch all events
  const fetchData = useCallback(async () => {
    if (hasFetched) return; // Prevent re-fetching
    console.log("Marketplace: Fetching events at", new Date().toLocaleString("en-GB", { timeZone: "Europe/Paris" }));
    try {
      await getEvents(); // No status filter, as FilterEvents.jsx handles it
      console.log("Marketplace: Events fetched, count:", events?.length || 0);
      setHasFetched(true);
    } catch (error) {
      console.error("Marketplace: Failed to fetch events:", error);
      setHasFetched(true); // Set even on error to prevent retry loops
    }
  }, [getEvents, hasFetched]); // Add hasFetched to dependencies

  // Fetch data on mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Debug events changes
  useEffect(() => {
    console.log("Marketplace: Events updated, count:", events?.length || 0);
  }, [events]);

  // Render event cards
  const renderContent = useCallback(
    (filteredEvents) => {
      if (!filteredEvents || filteredEvents.length === 0) {
        return <p className="text-gray-600 text-sm sm:text-base">No upcoming events available.</p>;
      }
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
                <p className="text-gray-600 text-sm mb-4">Category: {event.category || "N/A"}</p>
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
          <div>Loading marketplace...</div> // Show loading until fetch completes
        ) : (
          <FilterEvents
            events={events || []}
            renderContent={renderContent}
            showFilters={true}
            eventsPerPage={20}
            includePastEvents={false} // Control past events filtering
          />
        )}
      </main>
    </div>
  );
};

export default Marketplace;