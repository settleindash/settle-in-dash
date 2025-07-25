// src/components/FilterContracts.jsx
// This component filters and displays contracts based on various criteria.
// It supports filtering by category, search term, contract ID, event time, stake, and status,
// using wallet address-based identification for user-specific filtering.

import { useState, useEffect } from "react";
import ContractCard from "./ContractCard";
import { categories } from "../utils/categories";

const FilterContracts = ({
  contracts,
  statusFilter,
  userWalletAddress, // Changed from userEmail to userWalletAddress
  onFilterChange,
  contractsPerPage = 20,
  disabledFilters = [],
  renderContent, // New prop for custom rendering
}) => {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [eventTimeStart, setEventTimeStart] = useState("");
  const [eventTimeEnd, setEventTimeEnd] = useState("");
  const [stakeMin, setStakeMin] = useState("");
  const [stakeMax, setStakeMax] = useState("");
  const [contractIdFilter, setContractIdFilter] = useState(""); // Changed from idFilter to contractIdFilter
  const [localStatusFilter, setLocalStatusFilter] = useState(statusFilter || "All");
  const [page, setPage] = useState(1);

  // Minimal error handling for time filtering
  const isValidDate = (date) => date && !isNaN(date.getTime());

  // Filter contracts based on provided criteria
  const filteredContracts = contracts?.filter((c) => {
    const contractTime = c.time ? new Date(c.time) : null;
    const startTime = eventTimeStart ? new Date(eventTimeStart) : null;
    const endTime = eventTimeEnd ? new Date(eventTimeEnd) : null;

    if (c.time && !isValidDate(contractTime)) {
      console.warn("FilterContracts: Invalid contract time:", c.time);
      return false;
    }
    if (eventTimeStart && !isValidDate(startTime)) {
      console.warn("FilterContracts: Invalid eventTimeStart:", eventTimeStart);
      return false;
    }
    if (eventTimeEnd && !isValidDate(endTime)) {
      console.warn("FilterContracts: Invalid eventTimeEnd:", eventTimeEnd);
      return false;
    }

    return (
      (statusFilter === "user"
        ? (c.status === "accepted" || c.status === "twist") &&
          (c.WalletAddress === userWalletAddress || c.accepterWalletAddress === userWalletAddress) // Changed email/accepterEmail to WalletAddress/accepterWalletAddress
        : localStatusFilter === "All"
        ? true
        : c.status === localStatusFilter) &&
      (category === "All" || c.category === category) &&
      c.question.toLowerCase().includes(search.toLowerCase()) &&
      (contractIdFilter === "" || c.contract_id.includes(contractIdFilter)) && // Changed id to contract_id
      (!eventTimeStart || (contractTime && startTime && contractTime >= startTime)) &&
      (!eventTimeEnd || (contractTime && endTime && contractTime <= endTime)) &&
      (!stakeMin || c.stake >= Number(stakeMin)) &&
      (!stakeMax || c.stake <= Number(stakeMax))
    );
  }) || [];

  console.log("FilterContracts: Filtered Contracts:", filteredContracts);

  const paginatedContracts = filteredContracts.slice(
    (page - 1) * contractsPerPage,
    page * contractsPerPage
  );

  const clearFilters = () => {
    setSearch("");
    setCategory("All");
    setEventTimeStart("");
    setEventTimeEnd("");
    setStakeMin("");
    setStakeMax("");
    setContractIdFilter(""); // Changed from setIdFilter to setContractIdFilter
    setLocalStatusFilter(statusFilter || "All");
    setPage(1);
    console.log("FilterContracts: Filters cleared");
  };

  // Notify parent component of filtered contracts
  useEffect(() => {
    onFilterChange(filteredContracts);
  }, [filteredContracts, onFilterChange]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4">
        {!disabledFilters.includes("category") && (
          <div className="w-full sm:w-1/4">
            <label htmlFor="category" className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Filter by category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => {
                console.log("FilterContracts: Category changed:", e.target.value);
                setCategory(e.target.value);
                setPage(1);
              }}
              className="border p-2 rounded w-full"
              aria-label="Filter by category"
            >
              <option>All</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        )}
        {!disabledFilters.includes("search") && (
          <div className="w-full sm:w-1/4">
            <label htmlFor="search" className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Search contracts
            </label>
            <input
              id="search"
              type="text"
              placeholder="Search contracts..."
              className="border p-2 rounded w-full"
              value={search}
              onChange={(e) => {
                console.log("FilterContracts: Search changed:", e.target.value);
                setSearch(e.target.value);
                setPage(1);
              }}
              aria-label="Search contracts"
            />
          </div>
        )}
        {!disabledFilters.includes("contractIdFilter") && ( // Changed idFilter to contractIdFilter
          <div className="w-full sm:w-1/4">
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
        )}
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        {!disabledFilters.includes("eventTimeStart") && (
          <div className="w-full sm:w-1/4">
            <label htmlFor="eventTimeStart" className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Event Time Start
            </label>
            <input
              id="eventTimeStart"
              type="datetime-local"
              className="border p-2 rounded w-full"
              value={eventTimeStart}
              onChange={(e) => {
                console.log("FilterContracts: Event Time Start changed:", e.target.value);
                setEventTimeStart(e.target.value);
                setPage(1);
              }}
              aria-label="Event time start filter"
            />
          </div>
        )}
        {!disabledFilters.includes("eventTimeEnd") && (
          <div className="w-full sm:w-1/4">
            <label htmlFor="eventTimeEnd" className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Event Time End
            </label>
            <input
              id="eventTimeEnd"
              type="datetime-local"
              className="border p-2 rounded w-full"
              value={eventTimeEnd}
              onChange={(e) => {
                console.log("FilterContracts: Event Time End changed:", e.target.value);
                setEventTimeEnd(e.target.value);
                setPage(1);
              }}
              aria-label="Event time end filter"
            />
          </div>
        )}
        {!disabledFilters.includes("stakeMin") && (
          <div className="w-full sm:w-1/4">
            <label htmlFor="stakeMin" className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Min Stake (DASH)
            </label>
            <input
              id="stakeMin"
              type="number"
              className="border p-2 rounded w-full"
              value={stakeMin}
              onChange={(e) => {
                console.log("FilterContracts: Min Stake changed:", e.target.value);
                setStakeMin(e.target.value);
                setPage(1);
              }}
              placeholder="Min stake"
              aria-label="Minimum stake filter"
            />
          </div>
        )}
        {!disabledFilters.includes("stakeMax") && (
          <div className="w-full sm:w-1/4">
            <label htmlFor="stakeMax" className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Max Stake (DASH)
            </label>
            <input
              id="stakeMax"
              type="number"
              className="border p-2 rounded w-full"
              value={stakeMax}
              onChange={(e) => {
                console.log("FilterContracts: Max Stake changed:", e.target.value);
                setStakeMax(e.target.value);
                setPage(1);
              }}
              placeholder="Max stake"
              aria-label="Maximum stake filter"
            />
          </div>
        )}
      </div>
      {!disabledFilters.includes("statusFilter") && (
        <div className="w-full sm:w-1/4">
          <label htmlFor="statusFilter" className="block text-lg sm:text-xl font-bold text-primary mb-2">
            Filter by Status
          </label>
          <select
            id="statusFilter"
            value={localStatusFilter}
            onChange={(e) => {
              console.log("FilterContracts: Status filter changed:", e.target.value);
              setLocalStatusFilter(e.target.value);
              setPage(1);
            }}
            className="border p-2 rounded w-full"
            aria-label="Filter by status"
          >
            <option>All</option>
            <option>open</option>
            <option>accepted</option>
            <option>twist</option>
            <option>settled</option>
            <option>cancelled</option>
          </select>
        </div>
      )}
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        onClick={clearFilters}
        aria-label="Clear all filters"
      >
        Clear Filters
      </button>
      {renderContent ? (
        renderContent(paginatedContracts)
      ) : paginatedContracts.length === 0 ? (
        <p className="text-center text-gray-500 mt-6">No contracts found.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
          {paginatedContracts.map((contract) => (
            <ContractCard key={contract.contract_id} contract={contract} /> // Changed id to contract_id
          ))}
        </div>
      )}
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
    </div>
  );
};

export default FilterContracts;