// src/components/FilterEvents.jsx
// Fixed: Correct 2-arg renderContent call, debounced search, stats, robust

import { useState, useMemo, useCallback, useEffect } from "react";
import debounce from "lodash/debounce";
import { categories } from "../utils/categories";

const FilterEvents = ({
  events,
  contracts = [],
  renderContent,
  showFilters = true,
  eventsPerPage = 20,
  includePastEvents = false,
  constants,
}) => {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sortBy, setSortBy] = useState({ field: "event_date", direction: "asc" });
  const [page, setPage] = useState(1);

  // Debounce search
  const debouncedSetSearch = useCallback(debounce(setDebouncedSearch, 300), []);

  useEffect(() => {
    debouncedSetSearch(search);
    setPage(1);
  }, [search, debouncedSetSearch]);

  const now = useMemo(() => new Date(), []);

// 1. Liquidity stats — always on full events list (no filter)
const liquidityStats = useMemo(() => {
  const stats = {};

  (events || []).forEach((e) => {
    const eventContracts = contracts.filter(c => c.event_id === e.event_id);

    const openContracts = eventContracts.filter(c => c.status === "open");
    const acceptedContracts = eventContracts.filter(c => c.status === "accepted");

    const totalOpen = openContracts.reduce((sum, c) => sum + Number(c.stake || 0), 0).toFixed(2);
    const totalAccepted = acceptedContracts.reduce((sum, c) => {
      return sum + Number(c.stake || 0) + Number(c.accepter_stake || 0);
    }, 0).toFixed(2);

    stats[e.event_id] = { totalOpen, totalAccepted };
  });

  return stats;
}, [events, contracts]);

// 2. Filtered & sorted events — uses liquidityStats for sort
const filteredEvents = useMemo(() => {
  return (events || [])
    .filter((e) => {
      if (!e.event_id || !e.event_date) return false;

      const matchesSearch = (e.title || "").toLowerCase().includes(debouncedSearch.toLowerCase().trim());
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
        return sortBy.direction === "asc" ? dateA - dateB : dateB - dateA;
      }

      if (sortBy.field === "title") {
        return sortBy.direction === "asc"
          ? (a.title || "").localeCompare(b.title || "")
          : (b.title || "").localeCompare(a.title || "");
      }

      // Liquidity sorting — safe now
      if (sortBy.field === "totalOpen" || sortBy.field === "totalAccepted") {
        const statsA = liquidityStats[a.event_id] || { totalOpen: "0", totalAccepted: "0" };
        const statsB = liquidityStats[b.event_id] || { totalOpen: "0", totalAccepted: "0" };
        const valA = parseFloat(sortBy.field === "totalOpen" ? statsA.totalOpen : statsA.totalAccepted) || 0;
        const valB = parseFloat(sortBy.field === "totalOpen" ? statsB.totalOpen : statsB.totalAccepted) || 0;
        return sortBy.direction === "asc" ? valA - valB : valB - valA;
      }

      return 0;
    });
}, [events, debouncedSearch, categoryFilter, sortBy, includePastEvents, now, liquidityStats]);




  const paginatedEvents = filteredEvents.slice((page - 1) * eventsPerPage, page * eventsPerPage);

  const showingFrom = (page - 1) * eventsPerPage + 1;
  const showingTo = Math.min(page * eventsPerPage, filteredEvents.length);

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("");
    setSortBy({ field: "event_date", direction: "asc" });
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {showFilters && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search Events</label>
              <input
                type="text"
                placeholder="Search by title..."
                className="border border-gray-300 p-2 rounded w-full focus:ring-2 focus:ring-blue-500"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                className="border border-gray-300 p-2 rounded w-full focus:ring-2 focus:ring-blue-500"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                className="border border-gray-300 p-2 rounded w-full focus:ring-2 focus:ring-blue-500"
                value={sortBy.field}
                onChange={(e) => setSortBy({ field: e.target.value, direction: sortBy.direction })}
              >
                <option value="">None</option>
                <option value="event_date">Event Date</option>
                <option value="title">Title</option>
                <option value="totalOpen">Open Liquidity</option> {/* NEW */}
                <option value="totalAccepted">Accepted Liquidity</option> {/* NEW */}
              </select>
            </div>
          </div>

          {/* Controls & Stats */}
          <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <p className="text-sm text-gray-600">
              Showing {showingFrom}–{showingTo} of {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""}
            </p>

            <div className="flex gap-4">
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                onClick={() => setSortBy(prev => ({ ...prev, direction: prev.direction === "asc" ? "desc" : "asc" }))}
              >
                {sortBy.direction === "asc" ? "↑ Asc" : "↓ Desc"}
              </button>
              <button className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700" onClick={clearFilters}>
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW: Liquidity Summary - shown above the event list */}
      {filteredEvents.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow mt-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Market Liquidity Overview</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm font-medium text-green-800">Total Open Liquidity</p>
              <p className="text-2xl font-bold text-green-700">
                {Object.values(liquidityStats).reduce((sum, s) => sum + parseFloat(s.totalOpen || 0), 0).toFixed(2)} DASH
              </p>
              <p className="text-xs text-green-600 mt-1">Sum of creator stakes in open contracts</p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
              <p className="text-sm font-medium text-purple-800">Total Accepted Liquidity</p>
              <p className="text-2xl font-bold text-purple-700">
                {Object.values(liquidityStats).reduce((sum, s) => sum + parseFloat(s.totalAccepted || 0), 0).toFixed(2)} DASH
              </p>
              <p className="text-xs text-purple-600 mt-1">Sum of full pots in accepted contracts</p>
            </div>
          </div>
        </div>
      )}

      {renderContent ? (
        renderContent(paginatedEvents, constants) // ← Restored: 2 arguments (matches Marketplace.jsx)
      ) : paginatedEvents.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow mt-6">
          No events match your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mt-6">
          {paginatedEvents.map((event) => (
            <div key={event.event_id} className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow">
              {/* Your event card content here */}
            </div>
          ))}
        </div>
      )}

      {filteredEvents.length > eventsPerPage && (
        <div className="mt-8 flex justify-center gap-4">
          <button
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(p - 1, 1))}
            className="px-6 py-2 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
          >
            Previous
          </button>
          <span className="font-medium">
            Page {page} of {Math.ceil(filteredEvents.length / eventsPerPage)}
          </span>
          <button
            disabled={page * eventsPerPage >= filteredEvents.length}
            onClick={() => setPage(p => p + 1)}
            className="px-6 py-2 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterEvents;