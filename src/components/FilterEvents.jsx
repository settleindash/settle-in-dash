// src/components/FilterEvents.jsx
// Component to filter and sort events, showing only upcoming events.

import { useState, useMemo, useCallback } from "react";
import { categories } from "../utils/categories";

const FilterEvents = ({
  events,
  onFilterChange,
  eventsPerPage = 20,
  renderContent,
  showFilters = true,
}) => {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortBy, setSortBy] = useState({ field: "", direction: "asc" });
  const [page, setPage] = useState(1);

  // Stable current date/time in CEST
  const now = useMemo(() => {
    const date = new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' });
    console.log("FilterEvents: Calculated now:", date);
    return new Date(date);
  }, []);

  // Memoize filteredEvents
  const filteredEvents = useMemo(() => {
    console.log("FilterEvents: Recalculating filteredEvents, events count:", events?.length || 0);
    return (events || [])
      .filter((e) => {
        const matchesSearch = (e.title || "").toLowerCase().includes(search.toLowerCase());
        const matchesCategory = !categoryFilter || e.category === categoryFilter;
        const eventDate = new Date(e.event_date);
        const isUpcoming = !isNaN(eventDate.getTime()) && eventDate > now;
        if (!isUpcoming && e.event_date) {
          console.log("FilterEvents: Excluded event due to past/invalid event date:", {
            event_id: e.event_id,
            title: e.title,
            event_date: e.event_date,
          });
        }
        return matchesSearch && matchesCategory && isUpcoming;
      })
      .sort((a, b) => {
        if (!sortBy.field) return 0;
        const valueA = a[sortBy.field] || (sortBy.field === "event_date" ? new Date(a.event_date) : "");
        const valueB = b[sortBy.field] || (sortBy.field === "event_date" ? new Date(b.event_date) : "");
        if (sortBy.field === "event_date") {
          const dateA = new Date(a.event_date);
          const dateB = new Date(b.event_date);
          if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) {
            console.log("FilterEvents: Invalid date detected:", {
              event_id_A: a.event_id,
              event_date_A: a.event_date,
              event_id_B: b.event_id,
              event_date_B: b.event_date,
            });
            return 0;
          }
          return sortBy.direction === "asc"
            ? dateA.getTime() - dateB.getTime()
            : dateB.getTime() - dateA.getTime();
        }
        return sortBy.direction === "asc"
          ? String(valueA).localeCompare(String(valueB))
          : String(valueB).localeCompare(String(valueA));
      });
  }, [events, search, categoryFilter, sortBy]);

  const paginatedEvents = useMemo(() => {
    return filteredEvents.slice((page - 1) * eventsPerPage, page * eventsPerPage);
  }, [filteredEvents, page, eventsPerPage]);

  const clearFilters = useCallback(() => {
    setSearch("");
    setCategoryFilter("");
    setSortBy({ field: "", direction: "asc" });
    setPage(1);
    console.log("FilterEvents: Filters cleared");
  }, []);

  return (
    <div className="space-y-6">
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-1/3">
            <label htmlFor="search" className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Search Events
            </label>
            <input
              id="search"
              type="text"
              placeholder="Search by event title..."
              className="border p-2 rounded w-full"
              value={search}
              onChange={(e) => {
                console.log("FilterEvents: Search changed:", e.target.value);
                setSearch(e.target.value);
                setPage(1);
              }}
              aria-label="Search events by title"
            />
          </div>
          <div className="w-full sm:w-1/3">
            <label htmlFor="categoryFilter" className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Filter by Category
            </label>
            <select
              id="categoryFilter"
              className="border p-2 rounded w-full"
              value={categoryFilter}
              onChange={(e) => {
                console.log("FilterEvents: Category filter changed:", e.target.value);
                setCategoryFilter(e.target.value || "");
                setPage(1);
              }}
              aria-label="Filter by event category"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div className="w-full sm:w-1/3">
            <label htmlFor="sortBy" className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Sort By
            </label>
            <select
              id="sortBy"
              className="border p-2 rounded w-full"
              value={sortBy.field}
              onChange={(e) => {
                console.log("FilterEvents: Sort changed:", e.target.value);
                setSortBy({ field: e.target.value, direction: sortBy.direction });
                setPage(1);
              }}
              aria-label="Sort events"
            >
              <option value="">None</option>
              <option value="event_date">Event Date</option>
              <option value="title">Title</option>
            </select>
          </div>
        </div>
      )}
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-1/2 flex items-end">
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 w-full"
              onClick={() => {
                console.log("FilterEvents: Toggling sort direction, current:", sortBy.direction);
                setSortBy((prev) => ({ ...prev, direction: prev.direction === "asc" ? "desc" : "asc" }));
              }}
              aria-label="Toggle sort direction"
            >
              {sortBy.direction === "asc" ? "Ascending" : "Descending"}
            </button>
          </div>
          <div className="w-full sm:w-1/2 flex items-end">
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 w-full"
              onClick={clearFilters}
              aria-label="Clear all filters"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}
      {renderContent ? (
        renderContent(paginatedEvents)
      ) : paginatedEvents.length === 0 ? (
        <p className="text-center text-gray-500 mt-6">No upcoming events found.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-6">
          {paginatedEvents.map((event) => (
            <div key={event.event_id} className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-base font-semibold mb-4">{event.title || "Event"}</h2>
              <p className="text-gray-600 text-sm mb-2">
                Date: {new Date(event.event_date).toLocaleString("en-GB", {
                  timeZone: "Europe/Paris",
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
              <p className="text-gray-600 text-sm mb-4">Category: {event.category || "N/A"}</p>
              <div className="space-y-4">
                {event.possible_outcomes &&
                  (typeof event.possible_outcomes === "string"
                    ? JSON.parse(event.possible_outcomes)
                    : event.possible_outcomes
                  ).map((outcome) => (
                    <button
                      key={outcome}
                      onClick={() =>
                        window.location.href = `/order-book?event_id=${event.event_id}&outcome=${encodeURIComponent(outcome)}&position_type=buy`
                      }
                      className="bg-blue-500 text-white w-full px-3 py-1 rounded text-sm hover:bg-blue-600"
                      aria-label={`Buy ${outcome} for ${event.title || "Event"}`}
                    >
                      {outcome}
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {filteredEvents.length > eventsPerPage && (
        <div className="mt-6 flex justify-center gap-4">
          <button
            className="bg-orange-500 text-white px-4 py-2 rounded disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page === 1}
            aria-label="Previous page"
          >
            Previous
          </button>
          <span className="text-gray-700">Page {page}</span>
          <button
            className="bg-orange-500 text-white px-4 py-2 rounded disabled:opacity-50"
            onClick={() => setPage((p) => p + 1)}
            disabled={page * eventsPerPage >= filteredEvents.length}
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterEvents;