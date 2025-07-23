// src/pages/Marketplace.jsx
import { useContracts } from "../hooks/useContracts";
import FilterContracts from "../components/FilterContracts";

const Marketplace = () => {
  const { contracts, error: apiError, loading } = useContracts();

  const handleFilterChange = (filteredContracts) => {
    console.log("Marketplace: Filtered Contracts:", filteredContracts);
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
    <div className="min-h-screen bg-background p-4">
      <main className="p-4 max-w-7xl mx-auto mt-6">
        <FilterContracts
          contracts={contracts}
          statusFilter="open" // Restrict to open contracts
          userEmail={null} // No user-specific filtering
          onFilterChange={handleFilterChange}
          contractsPerPage={20} // Match original pagination
          disabledFilters={["statusFilter"]} // Disable status filter
        />
      </main>
    </div>
  );
};

export default Marketplace;