// src/pages/Settle.jsx
// Updated: Primary display is settled_outcome, not wallet-based winner

import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useContracts } from "../hooks/useContracts";
import { useEvents } from "../hooks/useEvents";
import { formatCustomDate } from "../utils/validation";
import PageHeader from "../utils/formats/PageHeader.jsx";
import SettleContractForm from "../components/SettleContractForm.jsx";
import debounce from "lodash/debounce";

const Settle = () => {
  const { contracts, fetchContracts, settleContract, loading } = useContracts();
  const { events, getEvents, parseOutcomes } = useEvents();

  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedContract, setSelectedContract] = useState(null);
  const [error, setError] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const validDashAddress = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{25,35}$/;

  const debouncedSetSearch = useMemo(() => debounce(setDebouncedSearch, 400), []);

  useEffect(() => {
    fetchContracts({ status: null });
    getEvents({ status: null });
  }, [fetchContracts, getEvents]);

  useEffect(() => {
    if (debouncedSearch && validateSearchInput(debouncedSearch)) {
      setIsSearching(true);
      searchForContract(debouncedSearch).finally(() => setIsSearching(false));
    } else {
      setSelectedContract(null);
      setError("");
    }
  }, [debouncedSearch]);

  const validateSearchInput = (value) => validDashAddress.test(value);

  const searchForContract = async (multisig) => {
    setError("");
    const found = contracts.find(
      (c) => c.multisig_address === multisig || c.new_multisig_address === multisig
    );

    if (found) {
      setSelectedContract({
        ...found,
        eventTitle: found.event_title || "Unknown Event",
        description: found.event_description || "",
        event_date: found.event_date || null,
        possible_outcomes: found.event_possible_outcomes || null,
        eventResolution: found.event_resolution || null,
        eventStatus: found.event_status || null,
        winning_outcome: found.winning_outcome || null,
      });
    } else {
      setError("No contract found for this multisig address.");
    }
  };

  const handleSearchChange = (e) => {
    const val = e.target.value.trim();
    setSearchValue(val);
    if (val === "") {
      setDebouncedSearch("");
      setSelectedContract(null);
      setError("");
    } else {
      debouncedSetSearch(val);
    }
  };

  const isSettled = (contract) => 
    contract.status === "settled" || !!contract.settlement_transaction_id;

  return (
    <div className="min-h-screen bg-background p-4">
      <PageHeader title="Settle Contracts" />

      <main className="max-w-7xl mx-auto p-6 mt-6">
        {/* Search bar */}
        <div className="mb-8 bg-white p-6 rounded-lg shadow">
          <label className="block text-lg font-bold mb-2">Search by Multisig Address</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Enter old or new multisig address (e.g. 8nrUB7LV...)"
              className="border p-3 rounded w-full font-mono text-sm"
              value={searchValue}
              onChange={handleSearchChange}
              autoFocus
            />
            {searchValue && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 text-xl"
                onClick={() => {
                  setSearchValue("");
                  setDebouncedSearch("");
                  setSelectedContract(null);
                  setError("");
                }}
              >
                ×
              </button>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Find the multisig address in your wallet transaction details.
          </p>
          {searchValue && !validateSearchInput(searchValue) && (
            <p className="text-red-600 mt-2 text-sm">
              Invalid address format (Dash addresses are 25–35 characters)
            </p>
          )}
        </div>

        {isSearching && <p className="text-center text-blue-600 py-6">Searching for contract...</p>}

        {error && (
          <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mt-4 rounded-r">
            <p className="text-yellow-800 font-medium">{error}</p>
            <p className="text-sm text-yellow-700 mt-1">
              • Make sure you copied the correct multisig address<br />
              • Try both the old and new multisig if the contract was accepted
            </p>
          </div>
        )}

        {selectedContract && (
          <div className="bg-white p-6 rounded-lg shadow mb-10">
            {/* Event header */}
            <div className="mb-6 p-5 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="text-xl font-semibold text-gray-800 mb-3">
                {selectedContract.eventTitle || "Event"}
              </h3>
              {selectedContract.description ? (
                <p className="text-gray-700 whitespace-pre-wrap">{selectedContract.description}</p>
              ) : (
                <p className="text-gray-500 italic">No event description available</p>
              )}
            </div>

            {/* Two-column layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {/* Left: Votes & Settled Outcome */}
              <div className="p-5 bg-gray-50 rounded-lg border border-gray-100">
                <h4 className="font-semibold text-gray-800 mb-4">Resolution</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">Creator vote:</span>
                    <span>{selectedContract.creator_winner_choice || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Accepter vote:</span>
                    <span>{selectedContract.accepter_winner_choice || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Oracle vote:</span>
                    <span>{selectedContract.grok_winner_choice || "Pending"}</span>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <span className="font-semibold text-lg block mb-1">
                      {selectedContract.settled_outcome ? "Settled Outcome" : "Outcome"}
                    </span>
                    <span className="text-xl font-medium text-blue-700">
                      {selectedContract.settled_outcome || "Not yet settled"}
                    </span>
                  </div>

                  {isSettled(selectedContract) && selectedContract.winner && (
                    <div className="pt-3">
                      <span className="font-semibold text-lg block mb-1">Settled Winner</span>
                      <span className="text-green-700 font-bold text-xl">
                        {selectedContract.winner === selectedContract.WalletAddress
                          ? "Creator"
                          : selectedContract.winner === selectedContract.accepterWalletAddress
                          ? "Accepter"
                          : selectedContract.winner}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Contract info */}
              <div className="p-5 bg-gray-50 rounded-lg border border-gray-100">
                <h4 className="font-semibold text-gray-800 mb-4">Contract Info</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>Status:</strong> {selectedContract.status}</p>
                  <p><strong>Created:</strong> {formatCustomDate(selectedContract.created_at)}</p>
                  <p><strong>Event time:</strong> {selectedContract.event_date ? formatCustomDate(selectedContract.event_date) : "—"}</p>
                  <p><strong>Outcomes:</strong> {parseOutcomes(selectedContract.possible_outcomes || []).join(", ") || "—"}</p>
                  <p><strong>Creator:</strong> {selectedContract.WalletAddress}</p>
                  <p><strong>Accepter:</strong> {selectedContract.accepterWalletAddress ? selectedContract.accepterWalletAddress : "—"}</p>
                  <p><strong>New multisig:</strong> {selectedContract.new_multisig_address || "—"}</p>
                </div>
              </div>
            </div>

            {/* Settlement status / form */}
            <div className="mt-6">
              {isSettled(selectedContract) ? (
                <div className="p-6 bg-green-50 border border-green-200 rounded-lg text-center">
                  <h4 className="text-xl font-bold text-green-800 mb-2">Contract Settled</h4>
                  <p className="text-green-700 text-lg mb-2">
                    Outcome: <strong>{selectedContract.settled_outcome || "—"}</strong>
                  </p>
                  <p className="text-green-700 text-lg mb-2">
                    Winner address: <strong>{selectedContract.winner}...</strong>
                  </p>
                  <p className="text-sm text-green-600 mt-2">
                    TXID: {selectedContract.settlement_transaction_id}...
                  </p>
                </div>
              ) : (
                <div className="mt-8">
                  <SettleContractForm
                    selectedContractId={selectedContract.contract_id}
                    filteredContracts={[selectedContract]}
                    settleContract={settleContract}
                    setSelectedContract={setSelectedContract}
                    setError={setError}
                    error={error}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        <div className="text-center mt-10">
          <Link
            to="/marketplace"
            className="inline-block bg-gray-600 text-white px-8 py-3 rounded-lg hover:bg-gray-700 transition"
          >
            ← Back to Marketplace
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Settle;