// src/pages/Marketplace.jsx
// This component displays a paginated, filterable list of contracts.
// It uses the useContracts hook to access contract data and allows accepting contracts with an email.
// Wallet functionality is removed as email is now used to identify users.

import { useState } from "react"; // Import React's useState hook for managing component state.
import { useNavigate } from "react-router-dom"; // Import useNavigate for redirecting after actions.
import ContractCard from "../components/ContractCard"; // Import ContractCard component for rendering individual contracts.
import mockContracts from "../mocks/contracts.json"; // Import mock contract data.
import { useContracts } from "../hooks/useContracts"; // Custom hook for contract-related logic.

// Marketplace component: Displays a paginated, filterable list of contracts.
const Marketplace = () => {
  // Initialize state for contracts and acceptContract function using custom hook.
  const { contracts, acceptContract } = useContracts(mockContracts);
  // State for search input.
  const [search, setSearch] = useState("");
  // State for category filter.
  const [category, setCategory] = useState("All");
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

  // Filter contracts based on category and search input.
  const filteredContracts = contracts?.filter(
    (c) =>
      (category === "All" || c.category === category) && // Match category or show all.
      c.question.toLowerCase().includes(search.toLowerCase()) // Case-insensitive search.
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
        {/* Search and filter controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Search input for filtering contracts by question text */}
          <input
            type="text"
            placeholder="Search contracts..."
            className="border p-2 rounded w-full sm:w-1/2"
            value={search}
            onChange={(e) => {
              console.log("Marketplace: Search changed:", e.target.value);
              setSearch(e.target.value); // Update search state.
            }}
            aria-label="Search contracts"
          />
          {/* Category filter dropdown */}
          <select
            value={category}
            onChange={(e) => {
              console.log("Marketplace: Category changed:", e.target.value);
              setCategory(e.target.value); // Update category state.
            }}
            className="border p-2 rounded w-full sm:w-1/4"
            aria-label="Filter by category"
          >
            <option>All</option>
            <option>Crypto</option>
            <option>Sports</option>
            <option>Other</option>
          </select>
        </div>
        {/* Email input for accepting contracts */}
        <div className="mb-6">
          <label htmlFor="accepterEmail" className="block text-sm font-medium text-gray-700">
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