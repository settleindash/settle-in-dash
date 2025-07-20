// src/pages/Marketplace.jsx
// This component displays a paginated, filterable list of open contracts.
// It uses the useContracts hook to access contract data via API.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import ContractCard from "../components/ContractCard";
import { useContracts } from "../hooks/useContracts";
import { categories } from "../utils/categories";

const Marketplace = () => {
  const { openContracts, error: apiError, loading } = useContracts();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [eventTimeStart, setEventTimeStart] = useState("");
  const [eventTimeEnd, setEventTimeEnd] = useState("");
  const [stakeMin, setStakeMin] = useState("");
  const [stakeMax, setStakeMax] = useState("");
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  console.log("Marketplace: Open Contracts:", openContracts);

  const contractsPerPage = 10;

  const filteredContracts = openContracts?.filter(
    (c) =>
      (category === "All" || c.category === category) &&
      c.question.toLowerCase().includes(search.toLowerCase()) &&
      (!eventTimeStart || new Date(c.time) >= new Date(eventTimeStart)) &&
      (!eventTimeEnd || new Date(c.time) <= new Date(eventTimeEnd)) &&
      (!stakeMin || c.stake >= Number(stakeMin)) &&
      (!stakeMax || c.stake <= Number(stakeMax))
  ) || [];

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
    setPage(1);
    console.log("Marketplace: Filters cleared");
  };

  if (loading) {
    return <div className="min-h-screen bg-background p-4">Loading marketplace...</div>;
  }

  if (apiError) {
    return (
      <div className="min-h-screen bg-background p-4">
        <header className="bg-primary text-white p-4">
          <h1 className="text-2xl font-semibold">Marketplace</h1>
        </header>
        <main className="max-w-7xl mx-auto p-4">
          <p className="text-red-500">Error: {apiError}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="p-4 max-w-7xl mx-auto">
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
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
                  console.log("Marketplace: Search changed:", e.target.value);
                  setSearch(e.target.value);
                  setPage(1);
                }}
                aria-label="Search contracts"
              />
            </div>
            <div className="w-full sm:w-1/4">
              <label htmlFor="category" className="block text-lg sm:text-xl font-bold text-primary mb-2">
                Filter by category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => {
                  console.log("Marketplace: Category changed:", e.target.value);
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
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
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
                  console.log("Marketplace: Event Time Start changed:", e.target.value);
                  setEventTimeStart(e.target.value);
                  setPage(1);
                }}
                aria-label="Event time start filter"
              />
            </div>
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
                  console.log("Marketplace: Event Time End changed:", e.target.value);
                  setEventTimeEnd(e.target.value);
                  setPage(1);
                }}
                aria-label="Event time end filter"
              />
            </div>
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
                  console.log("Marketplace: Min Stake changed:", e.target.value);
                  setStakeMin(e.target.value);
                  setPage(1);
                }}
                placeholder="Min stake"
                aria-label="Minimum stake filter"
              />
            </div>
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
                  console.log("Marketplace: Max Stake changed:", e.target.value);
                  setStakeMax(e.target.value);
                  setPage(1);
                }}
                placeholder="Max stake"
                aria-label="Maximum stake filter"
              />
            </div>
          </div>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            onClick={clearFilters}
            aria-label="Clear all filters"
          >
            Clear Filters
          </button>
        </div>

        {paginatedContracts.length === 0 ? (
          <p className="text-center text-gray-500 mt-6">No contracts found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            {paginatedContracts.map((contract) => (
              <ContractCard
                key={contract.id}
                contract={contract}
              />
            ))}
          </div>
        )}
        <div className="mt-6 flex justify-center gap-4">
          <button
            className="bg-orange-500 text-white px-4 py-2 rounded disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            disabled={page === 1 || loading}
            aria-label="Previous page"
          >
            Previous
          </button>
          <span className="text-gray-700">Page {page}</span>
          <button
            className="bg-orange-500 text-white px-4 py-2 rounded disabled:opacity-50"
            onClick={() => setPage((p) => p + 1)}
            disabled={page * contractsPerPage >= filteredContracts.length || loading}
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      </main>
    </div>
  );
};

export default Marketplace;