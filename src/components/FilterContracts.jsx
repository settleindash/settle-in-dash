// src/components/FilterContracts.jsx
// Component to filter and paginate contracts, rendering them via ContractCard or custom renderContent.

import { useState, useEffect, useMemo, useCallback } from "react";
import ContractCard from "./ContractCard";

const FilterContracts = ({
  contracts,
  onFilterChange,
  contractsPerPage = 20,
  renderContent,
  showFilters = true,
}) => {
  const [search, setSearch] = useState("");
  const [contractIdFilter, setContractIdFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState({ field: "", direction: "asc" });
  const [page, setPage] = useState(1);

  // Calculate now once per render to avoid unnecessary useMemo triggers
  const now = useMemo(() => {
    const date = new Date();
    date.setUTCHours(date.getUTCHours() + 2); // CEST (UTC+2), August 18, 2025, 08:31 PM
    console.log("FilterContracts: Calculated now:", date);
    return date;
  }, []);

  // Memoize filteredContracts
  const filteredContracts = useMemo(() => {
    console.log("FilterContracts: Recalculating filteredContracts");
    return (contracts || [])
      .filter((c) => {
        const matchesSearch = (c.eventTitle || "").toLowerCase().includes(search.toLowerCase());
        const matchesContractId = contractIdFilter === "" || c.contract_id.includes(contractIdFilter);
        const matchesStatus =
          !statusFilter || (Array.isArray(statusFilter) ? statusFilter.includes(c.status) : c.status === statusFilter);
        const isWithinDeadline = !c.acceptanceDeadline || new Date(c.acceptanceDeadline) > now;
        return matchesSearch && matchesContractId && matchesStatus && isWithinDeadline;
      })
      .sort((a, b) => {
        if (!sortBy.field) return 0;
        const valueA = a[sortBy.field] || 0;
        const valueB = b[sortBy.field] || 0;
        if (sortBy.field === "created_at") {
          return sortBy.direction === "asc"
            ? new Date(valueA) - new Date(valueB)
            : new Date(valueB) - new Date(valueA);
        }
        return sortBy.direction === "asc" ? valueA - valueB : valueB - valueA;
      });
  }, [contracts, search, contractIdFilter, statusFilter, sortBy]);

  const paginatedContracts = filteredContracts.slice(
    (page - 1) * contractsPerPage,
    page * contractsPerPage
  );

  const clearFilters = useCallback(() => {
    setSearch("");
    setContractIdFilter("");
    setStatusFilter("");
    setSortBy({ field: "", direction: "asc" });
    setPage(1);
    console.log("FilterContracts: Filters cleared");
  }, []);

  // Notify parent of filtered contracts
  useEffect(() => {
    console.log("FilterContracts: Updating filteredContracts in parent, count:", filteredContracts.length);
    onFilterChange(filteredContracts);
  }, [filteredContracts, onFilterChange]);

  return (
    <div className="space-y-6">
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-1/3">
            <label htmlFor="search" className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Search Contracts
            </label>
            <input
              id="search"
              type="text"
              placeholder="Search by event title..."
              className="border p-2 rounded w-full"
              value={search}
              onChange={(e) => {
                console.log("FilterContracts: Search changed:", e.target.value);
                setSearch(e.target.value);
                setPage(1);
              }}
              aria-label="Search contracts by event title"
            />
          </div>
          <div className="w-full sm:w-1/3">
            <label htmlFor="contractIdFilter" className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Filter by Contract ID
            </label>
            <input
              id="contractIdFilter"
              type="text"
              placeholder="Filter by contract ID..."
              className="border p-2 rounded w-full"
              value={contractIdFilter}
              onChange={(e) => {
                console.log("FilterContracts: Contract ID filter changed:", e.target.value);
                setContractIdFilter(e.target.value);
                setPage(1);
              }}
              aria-label="Filter by contract ID"
            />
          </div>
          <div className="w-full sm:w-1/3">
            <label htmlFor="statusFilter" className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Filter by Status
            </label>
            <select
              id="statusFilter"
              className="border p-2 rounded w-full"
              value={statusFilter}
              onChange={(e) => {
                console.log("FilterContracts: Status filter changed:", e.target.value);
                setStatusFilter(e.target.value || "");
                setPage(1);
              }}
              aria-label="Filter by contract status"
            >
              <option value="">All Statuses</option>
              <option value="open">Open</option>
              <option value="accepted">Accepted</option>
              <option value="cancelled">Cancelled</option>
              <option value="settled">Settled</option>
              <option value="twist">Twist</option>
            </select>
          </div>
        </div>
      )}
      {showFilters && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="w-full sm:w-1/2">
            <label htmlFor="sortBy" className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Sort By
            </label>
            <select
              id="sortBy"
              className="border p-2 rounded w-full"
              value={sortBy.field}
              onChange={(e) => {
                console.log("FilterContracts: Sort changed:", e.target.value);
                setSortBy({ field: e.target.value, direction: sortBy.direction });
                setPage(1);
              }}
              aria-label="Sort contracts"
            >
              <option value="">None</option>
              <option value="odds">Odds</option> {/* Updated from percentage */}
              <option value="stake">Stake</option>
              <option value="created_at">Created At</option>
            </select>
          </div>
          <div className="w-full sm:w-1/2 flex items-end">
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 w-full"
              onClick={() =>
                setSortBy((prev) => ({ ...prev, direction: prev.direction === "asc" ? "desc" : "asc" }))
              }
              aria-label="Toggle sort direction"
            >
              {sortBy.direction === "asc" ? "Ascending" : "Descending"}
            </button>
          </div>
        </div>
      )}
      {showFilters && (
        <button
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          onClick={clearFilters}
          aria-label="Clear all filters"
        >
          Clear Filters
        </button>
      )}
      {renderContent ? (
        renderContent(paginatedContracts)
      ) : paginatedContracts.length === 0 ? (
        <p className="text-center text-gray-500 mt-6">No contracts found for this event.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {paginatedContracts.map((contract) => (
            <ContractCard key={contract.contract_id} contract={contract} eventTitle={contract.eventTitle} />
          ))}
        </div>
      )}
      {filteredContracts.length > contractsPerPage && (
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
            disabled={page * contractsPerPage >= filteredContracts.length}
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default FilterContracts;