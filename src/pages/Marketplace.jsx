// src/pages/Marketplace.jsx
// This component displays a paginated, filterable list of open contracts.
// It uses the useContracts hook to access contract data and allows accepting contracts with an email.
// Wallet functionality is removed as email is now used to identify users.

import { useState } from "react"; // Import React's useState hook for managing component state.
import { useNavigate } from "react-router-dom"; // Import useNavigate for redirecting after actions.
import ContractCard from "../components/ContractCard"; // Import ContractCard component for rendering individual contracts.
import mockContracts from "../mocks/contracts.json"; // Import mock contract data.
import { useContracts } from "../hooks/useContracts"; // Custom hook for contract-related logic.
import { categories } from "../utils/categories"; // Import category list from separate file.

// Marketplace component: Displays a paginated, filterable list of open contracts.
const Marketplace = () => {
  // Initialize state for contracts and acceptContract function using custom hook.
  const { contracts, acceptContract } = useContracts(mockContracts);
  // State for search input.
  const [search, setSearch] = useState("");
  // State for category filter.
  const [category, setCategory] = useState("All");
  // State for event time range filters.
  const [eventTimeStart, setEventTimeStart] = useState("");
  const [eventTimeEnd, setEventTimeEnd] = useState("");
  // State for stake size range filters.
  const [stakeMin, setStakeMin] = useState("");
  const [stakeMax, setStakeMax] = useState("");
  // State for current page in pagination.
  const [page, setPage] = useState(1);
  // State for accepter email input (used when accepting a contract).
  const [accepterEmail, setAccepterEmail] = useState("");
  // State for error messages during email validation.
  const [error, setError] = useState("");
  // Initialize navigate for redirecting after accepting a contract.
  const navigate = useNavigate();

  // Log contracts for debugging (visible in browser Console, F12 in VSC).
  console.log("Marketplace: Contracts:", contracts);

  // Define number of contracts to display per page.
  const contractsPerPage = 10;

  // Filter contracts based on status, category, search, event time range, and stake range.
  const filteredContracts = contracts?.filter(
    (c) =>
      c.status === "open" && // Show only open contracts.
      (category === "All" || c.category === category) && // Match category or show all.
      c.question.toLowerCase().includes(search.toLowerCase()) && // Case-insensitive search.
      (!eventTimeStart || new Date(c.time) >= new Date(eventTimeStart)) && // Filter by start time.
      (!eventTimeEnd || new Date(c.time) <= new Date(eventTimeEnd)) && // Filter by end time.
      (!stakeMin || c.stake >= Number(stakeMin)) && // Filter by minimum stake.
      (!stakeMax || c.stake <= Number(stakeMax)) // Filter by maximum stake.
  ) || []; // Fallback to empty array if contracts is undefined.

  // Slice filtered contracts for current page.
  const paginatedContracts = filteredContracts.slice(
    (page - 1) * contractsPerPage, // Start index.
    page * contractsPerPage // End index.
  );

  // Handle accepting a contract.
  const handleAcceptContract = (contractId) => {
    // Validate accepter email: must match a simple email format.
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(accepterEmail)) {
      setError("Please provide a valid email address");
      console.log("Marketplace: Validation failed - invalid accepter email");
      return;
    }

    // Clear any existing error.
    setError("");
    // Log accept attempt for debugging.
    console.log("Marketplace: Accepting contract with ID", contractId, "and email", accepterEmail);

    // Call acceptContract with the contract ID and accepter's email.
    acceptContract(contractId, accepterEmail);

    // Navigate to the contract details page after accepting (or cancelling if emails match).
    navigate(`/contract/${contractId}`);
  };

  return (
    // Main container with minimum screen height and background color.
    <div className="min-h-screen bg-background">
      {/* Main content area with centered max-width container */}
      <main className="p-4 max-w-7xl mx-auto">
        {/* Search, category, time range, and stake range filters */}
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search input for filtering contracts by question text */}
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
                  setSearch(e.target.value); // Update search state.
                }}
                aria-label="Search contracts"
              />
            </div>
            {/* Category filter dropdown */}
            <div className="w-full sm:w-1/4">
              <label htmlFor="category" className="block text-lg sm:text-xl font-bold text-primary mb-2">
                Filter by category
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => {
                  console.log("Marketplace: Category changed:", e.target.value);
                  setCategory(e.target.value); // Update category state.
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
            {/* Event Time Range Filters */}
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
                }}
                aria-label="Event time end filter"
              />
            </div>
            {/* Stake Size Range Filters */}
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
                }}
                placeholder="Max stake"
                aria-label="Maximum stake filter"
              />
            </div>
          </div>
        </div>

        {/* Email input for accepting contracts */}
        <div className="mb-6 mt-6">
          <label htmlFor="accepterEmail" className="block text-lg sm:text-xl font-bold text-primary mb-2">
            Your Email (to accept contracts)
          </label>
          <input
            id="accepterEmail"
            type="email"
            className="border p-2 rounded w-full sm:w-1/2"
            value={accepterEmail}
            onChange={(e) => {
              console.log("Marketplace: Accepter email changed:", e.target.value);
              setAccepterEmail(e.target.value); // Update accepter email state.
            }}
            placeholder="Enter your email to accept a contract"
            aria-label="Accepter email"
          />
          {error && <p className="text-red-500">{error}</p>}
        </div>
        {/* Display message if no contracts match filters */}
        {paginatedContracts.length === 0 ? (
          <p className="text-center text-gray-500">No contracts found.</p>
        ) : (
          // Grid layout for contract cards (responsive: 1-3 columns)
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedContracts.map((contract) => (
              // Render ContractCard for each contract
              <ContractCard
                key={contract.id} // Unique key for React rendering.
                contract={contract} // Pass contract data to component.
                onAccept={() => handleAcceptContract(contract.id)} // Pass accept handler with contract ID.
              />
            ))}
          </div>
        )}
        {/* Pagination controls */}
        <div className="mt-6 flex justify-center gap-4">
          {/* Previous page button */}
          <button
            className="bg-orange-500 text-white px-4 py-2 rounded disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(p - 1, 1))} // Decrease page, minimum 1.
            disabled={page === 1} // Disable if on first page.
            aria-label="Previous page"
          >
            Previous
          </button>
          {/* Display current page number */}
          <span className="text-gray-700">Page {page}</span>
          {/* Next page button */}
          <button
            className="bg-orange-500 text-white px-4 py-2 rounded disabled:opacity-50"
            onClick={() => setPage((p) => p + 1)} // Increase page.
            disabled={page * contractsPerPage >= filteredContracts.length} // Disable if no more contracts.
            aria-label="Next page"
          >
            Next
          </button>
        </div>
      </main>
    </div>
  );
};

// Export the Marketplace component as default.
export default Marketplace;