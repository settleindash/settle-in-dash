// src/pages/Settle.jsx
// Improved: Search by wallet OR multisig (old/new), better UX, aligned with backend

import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useContracts } from "../hooks/useContracts";
import { useEvents } from "../hooks/useEvents";
import PageHeader from "../utils/formats/PageHeader.jsx";
import FilterContracts from "../components/FilterContracts.jsx";
import SettleContractForm from "../components/SettleContractForm.jsx";
import ResolveTwistForm from "../components/ResolveTwistForm.jsx";

const Settle = () => {
  const { contracts, fetchContracts, settleContract, triggerTwist, loading, error: apiError } = useContracts();
  const { events, getEvents } = useEvents();
  const navigate = useNavigate();

  const [searchValue, setSearchValue] = useState("");
  const [searchMode, setSearchMode] = useState("wallet"); // "wallet" or "multisig"
  const [selectedContractId, setSelectedContractId] = useState(null);
  const [error, setError] = useState("");
  const [filteredContracts, setFilteredContracts] = useState([]);

  const validDashAddress = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{25,35}$/;

  const validateSearchInput = (value) => {
    if (!value) return false;
    // Basic Base58 check for Dash addresses/multisigs
    return validDashAddress.test(value);
  };

  // Fetch data on mount
  useEffect(() => {
    fetchContracts({});
    getEvents({ status: "open" });
  }, [fetchContracts, getEvents]);

  // Filter contracts based on search mode
  const contractsWithEventTitles = useMemo(() => {
    if (!searchValue || !validateSearchInput(searchValue)) return [];

    return contracts
      .filter((c) => {
        if (searchMode === "wallet") {
          return c.WalletAddress === searchValue || c.accepterWalletAddress === searchValue;
        } else {
          // Multisig mode: match old OR new
          return (
            c.multisig_address === searchValue ||
            c.new_multisig_address === searchValue
          );
        }
      })
      .map((contract) => {
        const event = events.find((e) => e.event_id === contract.event_id);
        return {
          ...contract,
          eventTitle: event ? event.title : "Not set",
        };
      });
  }, [contracts, events, searchValue, searchMode]);

  const formatWinner = (contract) => {
    if (contract.winner === "tie") return "Tie";
    if (contract.winner === contract.WalletAddress) return "Creator";
    if (contract.winner === contract.accepterWalletAddress) return "Accepter";
    return "Not set";
  };

  const handleSearchChange = (e) => {
    const val = e.target.value.trim();
    setSearchValue(val);
    setError("");
  };

  const renderTable = (contractsToRender) => (
    <FilterContracts
      contracts={contractsToRender}
      onFilterChange={setFilteredContracts}
      contractsPerPage={20}
      renderContent={(paginatedContracts) => (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-4">Contracts</h2>
          {paginatedContracts.length === 0 ? (
            <p className="text-gray-600">No matching contracts found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border rounded-lg shadow">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="p-4 text-left text-gray-700">Winner</th>
                    <th className="p-4 text-left text-gray-700">Creator Choice</th>
                    <th className="p-4 text-left text-gray-700">Accepter Choice</th>
                    <th className="p-4 text-left text-gray-700">Created</th>
                    <th className="p-4 text-left text-gray-700">Event</th>
                    <th className="p-4 text-left text-gray-700">Outcome</th>
                    <th className="p-4 text-left text-gray-700">Escrow (New)</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedContracts.map((c) => (
                    <tr key={c.contract_id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        {formatWinner(c) === "Not set" ? (
                          <button
                            className="text-blue-500 hover:underline"
                            onClick={() => setSelectedContractId(c.contract_id)}
                          >
                            Not set
                          </button>
                        ) : (
                          formatWinner(c)
                        )}
                      </td>
                      <td className="p-4">{c.creator_winner_choice || "—"}</td>
                      <td className="p-4">{c.accepter_winner_choice || "—"}</td>
                      <td className="p-4">{new Date(c.created_at).toLocaleDateString()}</td>
                      <td className="p-4">{c.eventTitle || "—"}</td>
                      <td className="p-4">{c.outcome || "—"}</td>
                      <td className="p-4 font-mono text-xs break-all">
                        {c.new_multisig_address ? c.new_multisig_address.slice(0, 12) + "..." : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      showFilters={validateSearchInput(searchValue)}
    />
  );

  return (
    <div className="min-h-screen bg-background p-4">
      <PageHeader title="Settle Contracts" />
      <main className="max-w-7xl mx-auto p-6 mt-6">
        <div className="mb-8 bg-white p-6 rounded-lg shadow">
          <label className="block text-lg font-bold mb-2">Search Contracts</label>
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <select
              value={searchMode}
              onChange={(e) => {
                setSearchMode(e.target.value);
                setSearchValue("");
              }}
              className="border p-2 rounded min-w-[200px]"
            >
              <option value="wallet">My Wallet Address</option>
              <option value="multisig">Escrow/Multisig Address</option>
            </select>

            <input
              type="text"
              placeholder={
                searchMode === "wallet"
                  ? "Enter your DASH wallet address..."
                  : "Enter old or new multisig address..."
              }
              className="border p-2 rounded flex-1"
              value={searchValue}
              onChange={handleSearchChange}
            />
          </div>

          <p className="text-sm text-gray-600">
            {searchMode === "wallet"
              ? "Enter your personal DASH wallet address to see your created or accepted contracts."
              : "Enter the **initial escrow** (old 2-of-3) or **final escrow** (new 3-of-3) address where funds are locked. This is the best way to track any contract by its funds."}
          </p>

          {searchValue && !validateSearchInput(searchValue) && (
            <p className="text-red-500 mt-2 text-sm">
              Please enter a valid DASH address (Base58, 25–35 characters).
            </p>
          )}
        </div>

        {searchValue && validateSearchInput(searchValue) && renderTable(contractsWithEventTitles)}

        {selectedContractId && filteredContracts.find(c => c.contract_id === selectedContractId) && (
          <SettleContractForm
            selectedContractId={selectedContractId}
            filteredContracts={filteredContracts}
            settleContract={settleContract}
            setSelectedContractId={setSelectedContractId}
            setError={setError}
            error={error}
          />
        )}

        {selectedContractId && filteredContracts.find(c => c.contract_id === selectedContractId)?.status === "twist" && (
          <ResolveTwistForm
            selectedContractId={selectedContractId}
            filteredContracts={filteredContracts}
            triggerTwist={triggerTwist}
            setSelectedContractId={setSelectedContractId}
            setError={setError}
            error={error}
          />
        )}

        <div className="mt-8">
          <Link
            to="/marketplace"
            className="bg-gray-500 text-white px-6 py-3 rounded hover:bg-gray-600"
          >
            Back to Marketplace
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Settle;