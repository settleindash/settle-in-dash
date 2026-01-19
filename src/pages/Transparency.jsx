// src/pages/Transparency.jsx
import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useContracts } from "../hooks/useContracts";
import FilterContracts from "../components/FilterContracts";
import PageHeader from "../utils/formats/PageHeader.jsx";

const Transparency = () => {
  const { contracts, fetchContracts, loading, error: apiError } = useContracts();

  // Fetch all relevant contracts (full history)
  useEffect(() => {
    console.log("Transparency: Fetching contracts");
    fetchContracts({ 
      status: ["open", "accepted", "settled", "expired", "twist"]
    });
  }, [fetchContracts]);

  // Enrich with joined event fields
  const enrichedContracts = useMemo(() => {
    return contracts.map(contract => ({
      ...contract,
      eventTitle: contract.event_title || "Not set",
      eventDescription: contract.event_description || "",
      eventCategory: contract.event_category || "",
      eventDate: contract.event_date || null,
      eventPossibleOutcomes: contract.event_possible_outcomes || null,
      eventResolution: contract.event_resolution || null,
      eventWinningOutcome: contract.event_winning_outcome || null,
      eventStatus: contract.event_status || null,
    }));
  }, [contracts]);

  const handleFilterChange = (filteredContracts) => {
    console.log("Transparency: Filtered Contracts:", filteredContracts);
  };

  const renderTable = (paginatedContracts) => {
    return (
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
                    Contract ID
                  </th>
                  <th className="p-1 sm:p-4 text-left text-gray-700 text-[10px] sm:text-xs max-w-[120px]">
                    Event
                  </th>
                  <th className="p-1 sm:p-4 text-left text-gray-700 text-[10px] sm:text-xs max-w-[80px]">
                    Outcome
                  </th>
                  <th className="p-1 sm:p-4 text-left text-gray-700 text-[10px] sm:text-xs max-w-[80px]">
                    Winner
                  </th>
                  <th className="p-1 sm:p-4 text-left text-gray-700 text-[10px] sm:text-xs max-w-[100px]">
                    Resolution
                  </th>
                  <th className="p-1 sm:p-4 text-left text-gray-700 text-[10px] sm:text-xs max-w-[100px]">
                    Created At
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedContracts.map((contract) => (
                  <tr key={contract.contract_id} className="border-b hover:bg-gray-50">
                    <td className="p-1 sm:p-4 max-w-[50px] truncate break-words text-[10px] sm:text-xs">
                      <Link
                        to={`/contract/${contract.contract_id}`}
                        className="text-blue-500 hover:underline flex items-center min-h-[44px]"
                        aria-label={`View details for contract ${contract.contract_id}`}
                      >
                        {contract.contract_id}
                      </Link>
                    </td>
                    <td className="p-1 sm:p-4 max-w-[120px] truncate break-words text-[10px] sm:text-xs">
                      {contract.eventTitle || "Not set"}
                    </td>
                    <td className="p-1 sm:p-4 max-w-[80px] truncate break-words text-[10px] sm:text-xs">
                      {contract.outcome || "Not set"}
                    </td>
                    <td className="p-1 sm:p-4 max-w-[80px] truncate break-words text-[10px] sm:text-xs">
                      {contract.winner || "Not set"}
                    </td>
                    <td className="p-1 sm:p-4 max-w-[100px] truncate break-words text-[10px] sm:text-xs">
                      {contract.eventResolution || "—"}
                    </td>
                    <td className="p-1 sm:p-4 max-w-[100px] truncate break-words text-[10px] sm:text-xs">
                      {contract.created_at ? new Date(contract.created_at).toLocaleString() : "Not set"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return <div className="min-h-screen bg-background p-4">Loading transparency...</div>;
  }

  if (apiError) {
    return (
      <div className="min-h-screen bg-background p-4">
        <PageHeader title="Transparency" />
        <main className="max-w-7xl mx-auto p-1 sm:p-6 mt-6">
          <p className="text-red-500 text-xs sm:text-sm">Error: {apiError}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <PageHeader title="Transparency" />
      <main className="p-1 max-w-7xl mx-auto mt-6 sm:p-6">
        <FilterContracts
          contracts={enrichedContracts}
          statusFilter="All"
          userWalletAddress=""
          onFilterChange={() => {}}
          contractsPerPage={20}
          disabledFilters={[]}
          renderContent={renderTable}
          showPastDeadlineOption={true}
        />
      </main>
    </div>
  );
};

export default Transparency;