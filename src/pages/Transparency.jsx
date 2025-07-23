// src/pages/Transparency.jsx
import { Link } from "react-router-dom";
import { useContracts } from "../hooks/useContracts";
import FilterContracts from "../components/FilterContracts";

const Transparency = () => {
  const { contracts, loading, error: apiError } = useContracts();

  const handleFilterChange = (filteredContracts) => {
    console.log("Transparency: Filtered Contracts:", filteredContracts);
  };

  const renderTable = (paginatedContracts) => (
    <div className="mt-6">
      <h2 className="text-base sm:text-xl font-semibold mb-4">Contract Overview</h2>
      {paginatedContracts.length === 0 ? (
        <p className="text-gray-600 text-xs sm:text-base">No contracts available.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border rounded-lg shadow">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="p-1 sm:p-4 text-left text-gray-700 text-[10px] sm:text-xs max-w-[50px]">
                  ID
                </th>
                <th className="p-1 sm:p-4 text-left text-gray-700 text-[10px] sm:text-xs max-w-[70px]">
                  Created At
                </th>
                <th className="p-1 sm:p-4 text-left text-gray-700 text-[10px] sm:text-xs max-w-[70px]">
                  Winner
                </th>
                <th className="p-1 sm:p-4 text-left text-gray-700 text-[10px] sm:text-xs max-w-[70px]">
                  Creator Choice
                </th>
                <th className="p-1 sm:p-4 text-left text-gray-700 text-[10px] sm:text-xs max-w-[70px]">
                  Accepter Choice
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedContracts.map((contract) => (
                <tr key={contract.id} className="border-b hover:bg-gray-50">
                  <td className="p-1 sm:p-4 max-w-[50px] truncate break-words text-[10px] sm:text-xs">
                    <Link
                      to={`/contract/${contract.id}`}
                      className="text-blue-500 hover:underline block min-h-[44px]"
                      aria-label={`View details for contract ${contract.id}`}
                    >
                      {contract.id}
                    </Link>
                  </td>
                  <td className="p-1 sm:p-4 max-w-[70px] truncate break-words text-[10px] sm:text-xs">
                    {contract.created_at ? new Date(contract.created_at).toLocaleString() : "Not set"}
                  </td>
                  <td className="p-1 sm:p-4 max-w-[70px] truncate break-words text-[10px] sm:text-xs">
                    {contract.winner || "Not set"}
                  </td>
                  <td className="p-1 sm:p-4 max-w-[70px] truncate break-words text-[10px] sm:text-xs">
                    {contract.creator_winner_choice || "Not set"}
                  </td>
                  <td className="p-1 sm:p-4 max-w-[70px] truncate break-words text-[10px] sm:text-xs">
                    {contract.accepter_winner_choice || "Not set"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  if (loading) {
    return <div className="min-h-screen bg-background p-4">Loading transparency...</div>;
  }

  if (apiError) {
    return (
      <div className="min-h-screen bg-background p-4">
        <header className="bg-primary text-white p-4">
          <h1 className="text-xl sm:text-2xl font-semibold">Transparency</h1>
        </header>
        <main className="max-w-7xl mx-auto p-1 sm:p-6 mt-6">
          <p className="text-red-500 text-xs sm:text-base">Error: {apiError}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <main className="p-1 max-w-7xl mx-auto mt-6 sm:p-6">
        <FilterContracts
          contracts={contracts}
          statusFilter="All"
          userEmail={null}
          onFilterChange={handleFilterChange}
          contractsPerPage={20}
          disabledFilters={[]}
          renderContent={renderTable}
        />
      </main>
    </div>
  );
};

export default Transparency;