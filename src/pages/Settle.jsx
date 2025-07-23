// src/pages/Settle.jsx
import { useState } from "react";
import { useContracts } from "../hooks/useContracts";
import FilterContracts from "../components/FilterContracts";

const Settle = () => {
  const { contracts, error: apiError, loading } = useContracts();
  const [userEmail, setUserEmail] = useState(""); // Dynamic email input

  const handleFilterChange = (filteredContracts) => {
    console.log("Settle: Filtered Contracts:", filteredContracts);
  };

  if (loading) {
    return <div className="min-h-screen bg-background p-4">Loading settle...</div>;
  }

  if (apiError) {
    return (
      <div className="min-h-screen bg-background p-4">
        <header className="bg-primary text-white p-4">
          <h1 className="text-2xl font-semibold">Settle Contracts</h1>
        </header>
        <main className="max-w-7xl mx-auto p-4 mt-6">
          <p className="text-red-500">Error: {apiError}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <main className="p-4 max-w-7xl mx-auto mt-6">
        <div className="mb-6">
          <label htmlFor="userEmail" className="block text-lg font-bold text-primary mb-2">
            Your Email (Creator or Accepter)
          </label>
          <input
            id="userEmail"
            type="email"
            placeholder="Enter your email"
            className="border p-2 rounded w-full sm:w-1/2"
            value={userEmail}
            onChange={(e) => {
              console.log("Settle: Email changed:", e.target.value);
              setUserEmail(e.target.value);
            }}
            aria-label="Enter your email to filter contracts"
          />
        </div>
        <FilterContracts
          contracts={contracts}
          statusFilter="user" // Filter for user's accepted or twist contracts
          userEmail={userEmail}
          onFilterChange={handleFilterChange}
          contractsPerPage={10} // Smaller pagination for Settle
          disabledFilters={[]} // Enable all filters, including statusFilter
        />
      </main>
    </div>
  );
};

export default Settle;