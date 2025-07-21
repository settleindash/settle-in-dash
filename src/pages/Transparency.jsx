// src/pages/Transparency.jsx
// This page displays all contracts in a table for blockchain-like transparency, with filtering by status, event time, and contract ID.
// Links to contract details page for full information, ensuring minimal redundancy.

import { useState } from "react";
import { Link } from "react-router-dom";
import { useContracts } from "../hooks/useContracts";

const Transparency = () => {
  const { contracts, loading, error } = useContracts();
  const [statusFilter, setStatusFilter] = useState("All");
  const [eventTimeStart, setEventTimeStart] = useState("");
  const [eventTimeEnd, setEventTimeEnd] = useState("");
  const [idFilter, setIdFilter] = useState("");

  console.log("Transparency: Contracts:", contracts);

  // Mask email for anonymity (e.g., frederik500@msn.com -> fre****@msn.com)
  const maskEmail = (email) => {
    if (!email) return "N/A";
    const [local, domain] = email.split("@");
    return `${local.slice(0, 3)}****@${domain}`;
  };

  // Format status for display
  const formatStatus = (status) => {
    const statusMap = {
      open: "Open",
      accepted: "Accepted",
      cancelled: "Cancelled",
      settled: "Settled",
      twist: "Twist Resolved"
    };
    return statusMap[status] || status;
  };

  // Filter contracts
  const filteredContracts = contracts?.filter(
    (c) =>
      (statusFilter === "All" || c.status === statusFilter) &&
      (!eventTimeStart || new Date(c.time) >= new Date(eventTimeStart)) &&
      (!eventTimeEnd || new Date(c.time) <= new Date(eventTimeEnd)) &&
      (!idFilter || c.id.toLowerCase().includes(idFilter.toLowerCase()))
  ) || [];

  // Clear filters
  const clearFilters = () => {
    setStatusFilter("All");
    setEventTimeStart("");
    setEventTimeEnd("");
    setIdFilter("");
    console.log("Transparency: Filters cleared");
  };

  if (loading) {
    return <div className="min-h-screen bg-background p-4">Loading contracts...</div>;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4">
        <header className="bg-primary text-white p-4">
          <h1 className="text-2xl font-semibold">Transparency</h1>
        </header>
        <main className="max-w-7xl mx-auto p-4">
          <p className="text-red-500">Error: {error}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <header className="bg-primary text-white p-4">
        <h1 className="text-2xl font-semibold">Transparency</h1>
      </header>
      <main className="max-w-7xl mx-auto p-4">
        <h2 className="text-xl font-semibold mb-4">All Contracts</h2>
        <div className="space-y-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="w-full sm:w-1/4">
              <label htmlFor="statusFilter" className="block text-lg font-bold text-primary mb-2">
                Filter by Status
              </label>
              <select
                id="statusFilter"
                value={statusFilter}
                onChange={(e) => {
                  console.log("Transparency: Status filter changed:", e.target.value);
                  setStatusFilter(e.target.value);
                }}
                className="border p-2 rounded w-full"
                aria-label="Filter by status"
              >
                <option>All</option>
                <option>open</option>
                <option>accepted</option>
                <option>cancelled</option>
                <option>settled</option>
                <option>twist</option>
              </select>
            </div>
            <div className="w-full sm:w-1/4">
              <label htmlFor="eventTimeStart" className="block text-lg font-bold text-primary mb-2">
                Event Time Start
              </label>
              <input
                id="eventTimeStart"
                type="datetime-local"
                className="border p-2 rounded w-full"
                value={eventTimeStart}
                onChange={(e) => {
                  console.log("Transparency: Event Time Start changed:", e.target.value);
                  setEventTimeStart(e.target.value);
                }}
                aria-label="Event time start filter"
              />
            </div>
            <div className="w-full sm:w-1/4">
              <label htmlFor="eventTimeEnd" className="block text-lg font-bold text-primary mb-2">
                Event Time End
              </label>
              <input
                id="eventTimeEnd"
                type="datetime-local"
                className="border p-2 rounded w-full"
                value={eventTimeEnd}
                onChange={(e) => {
                  console.log("Transparency: Event Time End changed:", e.target.value);
                  setEventTimeEnd(e.target.value);
                }}
                aria-label="Event time end filter"
              />
            </div>
            <div className="w-full sm:w-1/4">
              <label htmlFor="idFilter" className="block text-lg font-bold text-primary mb-2">
                Contract ID
              </label>
              <input
                id="idFilter"
                type="text"
                placeholder="Search by ID..."
                className="border p-2 rounded w-full"
                value={idFilter}
                onChange={(e) => {
                  console.log("Transparency: ID filter changed:", e.target.value);
                  setIdFilter(e.target.value);
                }}
                aria-label="Contract ID filter"
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
        {filteredContracts.length === 0 ? (
          <p className="text-gray-600">No contracts found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border rounded-lg shadow">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="p-4 text-left text-gray-700">ID</th>
                  <th className="p-4 text-left text-gray-700">Question</th>
                  <th className="p-4 text-left text-gray-700">Status</th>
                  <th className="p-4 text-left text-gray-700">Event Time</th>
                  <th className="p-4 text-left text-gray-700">Category</th>
                  <th className="p-4 text-left text-gray-700">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredContracts.map((contract) => (
                  <tr key={contract.id} className="border-b hover:bg-gray-50">
                    <td className="p-4">{contract.id}</td>
                    <td className="p-4">{contract.question}</td>
                    <td className="p-4">{formatStatus(contract.status)}</td>
                    <td className="p-4">{new Date(contract.time).toLocaleString()}</td>
                    <td className="p-4">{contract.category}</td>
                    <td className="p-4">
                      <Link
                        to={`/contract/${contract.id}`}
                        className="text-blue-500 hover:underline"
                        aria-label={`View details for contract ${contract.id}`}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="mt-6">
          <Link
            to="/marketplace"
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Back to Marketplace
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Transparency;