// src/pages/Transparency.jsx
// Displays contracts with filtering via FilterContracts, using PageHeader for consistent headline formatting.

import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useContracts } from "../hooks/useContracts";
import { useEvents } from "../hooks/useEvents";
import FilterContracts from "../components/FilterContracts";
import PageHeader from "../utils/formats/PageHeader.jsx";

const Transparency = () => {
  const { contracts, fetchContracts, loading, error: apiError } = useContracts();
  const { events, getEvents } = useEvents();

  // Fetch contracts and events on mount
  useEffect(() => {
    console.log("Transparency: Fetching contracts and events");
    fetchContracts({}); // Added to fetch contracts
    getEvents({ status: "open" });
  }, [fetchContracts, getEvents]);

  // Debug contracts and events
  useEffect(() => {
    console.log("Transparency: Raw contracts from useContracts:", contracts);
    console.log("Transparency: Raw events from useEvents:", events);
  }, [contracts, events]);

  // Enrich contracts with eventTitle
  const enrichedContracts = useMemo(() => {
    console.log("Transparency: Enriching contracts with event titles");
    const enriched = contracts.map((contract) => {
      const event = events.find((e) => e.event_id === contract.event_id);
      return {
        ...contract,
        eventTitle: event ? event.title : "Not set",
      };
    });
    console.log("Transparency: Enriched contracts:", enriched);
    return enriched;
  }, [contracts, events]);

  const handleFilterChange = (filteredContracts) => {
    console.log("Transparency: Filtered Contracts:", filteredContracts);
  };

  const renderTable = (paginatedContracts) => {
    console.log("Transparency: Paginated contracts:", paginatedContracts);
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
                  <th className="p-1 sm:p-4 text-left text-gray-700 text-[10px] sm:text-xs max-w-[70px]">
                    Event
                  </th>
                  <th className="p-1 sm:p-4 text-left text-gray-700 text-[10px] sm:text-xs max-w-[70px]">
                    Outcome
                  </th>
                  <th className="p-1 sm:p-4 text-left text-gray-700 text-[10px] sm:text-xs max-w-[70px]">
                    Winner
                  </th>
                  <th className="p-1 sm:p-4 text-left text-gray-700 text-[10px] sm:text-xs max-w-[70px]">
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
                    <td className="p-1 sm:p-4 max-w-[70px] truncate break-words text-[10px] sm:text-xs">
                      {contract.eventTitle || "Not set"}
                    </td>
                    <td className="p-1 sm:p-4 max-w-[70px] truncate break-words text-[10px] sm:text-xs">
                      {contract.outcome || "Not set"}
                    </td>
                    <td className="p-1 sm:p-4 max-w-[70px] truncate break-words text-[10px] sm:text-xs">
                      {contract.winner || "Not set"}
                    </td>
                    <td className="p-1 sm:p-4 max-w-[70px] truncate break-words text-[10px] sm:text-xs">
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