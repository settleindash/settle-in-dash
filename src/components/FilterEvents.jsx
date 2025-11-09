// src/components/FilterEvents.jsx
import { useState, useMemo, useCallback } from "react";
import { categories } from "../utils/categories";

const FilterEvents = ({
  events,
  renderContent,
  showFilters = true,
  eventsPerPage = 20,
  includePastEvents = false,
  constants,
}) => {

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortBy, setSortBy] = useState({ field: "", direction: "asc" });
  const [page, setPage] = useState(1);

  const now = useMemo(() => {
    const date = new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' });
    return new Date(date);
  }, []);

  const filteredEvents = useMemo(() => {
    return (events || [])
      .filter((e) => {
        if (!e.event_id || !e.event_date) return false;
        const matchesSearch = (e.title || "").toLowerCase().includes(search.toLowerCase());
        const matchesCategory = !categoryFilter || e.category === categoryFilter;
        const eventDate = new Date(e.event_date);
        const isUpcoming = includePastEvents || (!isNaN(eventDate.getTime()) && eventDate > now);
        return matchesSearch && matchesCategory && isUpcoming;
      })
      .sort((a, b) => {
        if (!sortBy.field) return 0;
        if (sortBy.field === "event_date") {
          const dateA = new Date(a.event_date);
          const dateB = new Date(b.event_date);
          if (isNaN(dateA.getTime()) || isNaN(dateB.getTime())) return 0;
          return sortBy.direction === "asc"
            ? dateA.getTime() - dateB.getTime()
            : dateB.getTime() - dateA.getTime();
        }
        const valueA = a[sortBy.field] || "";
        const valueB = b[sortBy.field] || "";
        return sortBy.direction === "asc"
          ? String(valueA).localeCompare(String(valueB))
          : String(valueB).localeCompare(String(valueA));
      });
  }, [events, search, categoryFilter, sortBy, includePastEvents, now]);

  const paginatedEvents = useMemo(() => {
    return filteredEvents.slice((page - 1) * eventsPerPage, page * eventsPerPage);
  }, [filteredEvents, page, eventsPerPage]);

  const clearFilters = useCallback(() => {
    setSearch("");
    setCategoryFilter("");
    setSortBy({ field: "", direction: "asc" });
    setPage(1);
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
      {renderContent(paginatedEvents, constants)} {/* ← 2 args */}
      {filteredEvents.length > eventsPerPage && (
        <div className="mt-6 flex justify-center gap-4">
          <button
            className="bg-orange-500 text-white px-4 py-2 rounded disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page === 1}
          >
            Previous
          </button>
          <span className="text-gray-700">Page {page}</span>
          <button
            className="bg-orange-500 text-white px-4 py-2 rounded disabled:opacity-50"
            onClick={() => setPage((p) => p + 1)}
            disabled={page * eventsPerPage >= filteredEvents.length}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterEvents;