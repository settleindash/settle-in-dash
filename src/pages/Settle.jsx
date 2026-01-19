// src/pages/Settle.jsx
// Multisig-only search, guided UX, direct display, loading/empty states

import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useContracts } from "../hooks/useContracts";
import { useEvents } from "../hooks/useEvents";
import { formatCustomDate } from "../utils/validation";
import PageHeader from "../utils/formats/PageHeader.jsx";
import SettleContractForm from "../components/SettleContractForm.jsx";
import ResolveTwistForm from "../components/ResolveTwistForm.jsx";
import debounce from "lodash/debounce";



const Settle = () => {
  const { contracts, fetchContracts, settleContract, triggerTwist, loading } = useContracts();
  const { events, getEvents, parseOutcomes  } = useEvents();

  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedContract, setSelectedContract] = useState(null);
  const [error, setError] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const validDashAddress = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]{25,35}$/;

  const debouncedSetSearch = useMemo(() => debounce(setDebouncedSearch, 300), []);

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
      // Use joined event fields directly (fallback to defaults)
      eventTitle: found.event_title || "Unknown Event",
      description: found.event_description || "",
      event_date: found.event_date || null,
      possible_outcomes: found.event_possible_outcomes || null,
      // Bonus: add resolution info if needed
      eventResolution: found.event_resolution || null,
      eventStatus: found.event_status || null
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

  const formatWinner = (contract) => {
    if (contract.winner === "tie") return "Tie";
    if (contract.winner === contract.WalletAddress) return "Creator";
    if (contract.winner === contract.accepterWalletAddress) return "Accepter";
    return "Not set";
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <PageHeader title="Settle Contracts" />
      <main className="max-w-7xl mx-auto p-6 mt-6">
        <div className="mb-8 bg-white p-6 rounded-lg shadow">
          <label className="block text-lg font-bold mb-2">Search by Multisig Address</label>
          <div className="relative">
            <input
              type="text"
              placeholder="Enter old or new multisig address (e.g. 8nrUB7LV...)"
              className="border p-2 rounded w-full"
              value={searchValue}
              onChange={handleSearchChange}
              autoFocus
            />
            {searchValue && (
              <button
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
            Enter the multisig address where funds are locked. Find it in your wallet's transaction history.
          </p>

          {searchValue && !validateSearchInput(searchValue) && (
            <p className="text-red-500 mt-2 text-sm">
              Invalid address — must be 25–35 Base58 characters.
            </p>
          )}
        </div>

        {isSearching && <p className="text-center text-blue-600">Searching...</p>}

        {error && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mt-4">
            <p className="text-yellow-700">{error}</p>
            <p className="text-sm text-yellow-600 mt-2">
              • Double-check the address in your wallet tx history.<br />
              • Try both old (initial 2-of-3) and new (final 3-of-3) multisig.<br />
              • If this is a new contract, settlement may not be available yet.
            </p>
          </div>
        )}

{selectedContract && (
  <div className="bg-white p-6 rounded-lg shadow mb-8">

    {/* Event Title + Description — Prominent grey box at top */}
    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h3 className="text-md font-semibold text-gray-700 mb-2">
        Event: {selectedContract.eventTitle || "—"}
      </h3>
      {selectedContract.description && (
        <p className="text-sm text-gray-700 whitespace-pre-wrap">
          {selectedContract.description}
        </p>
      )}
      {!selectedContract.description && (
        <p className="text-sm text-gray-500 italic">
          No description provided.
        </p>
      )}
    </div>


    {/* Grid: Details + Addresses */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      {/* Left: Contract & Status Details */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="text-md font-semibold text-gray-700 mb-3">Contract Details</h3>
        <div className="space-y-2 text-sm">
          <p><strong>Contract created at:</strong>{" "} {formatCustomDate(selectedContract.created_at)}
          <p><strong>Event Date & Time:</strong>{" "} {selectedContract.event_date ? formatCustomDate(selectedContract.event_date): "—"}</p>
          <p><strong>Status:</strong> {selectedContract.status}</p>
          <p><strong>Outcomes:</strong>{" "}{parseOutcomes(selectedContract.possible_outcomes || []).join(", ") || "—"} </p>
          <p><strong>Creator's Choice:</strong> {selectedContract.creator_winner_choice || "—"}</p>
          <p><strong>Accepter's Choice:</strong> {selectedContract.accepter_winner_choice || "—"}</p>
          <p><strong>Winner:</strong> {formatWinner(selectedContract)}</p>
          </p>
        </div>
      </div>
      

      {/* Right: Parties & Escrow */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h3 className="text-md font-semibold text-gray-700 mb-3">Parties & Escrow</h3>
        <div className="space-y-2 text-sm font-mono break-all">
          <p><strong>Creator Address:</strong> {selectedContract.WalletAddress}</p>
          <p><strong>Accepter Address:</strong> {selectedContract.accepterWalletAddress || "—"}</p>
          <p><strong>Old Multisig:</strong> {selectedContract.multisig_address}</p>
          <p><strong>New Multisig:</strong> {selectedContract.new_multisig_address || "—"}</p>
        </div>
      </div>
    </div>

      {/* Settlement / Twist forms — direct, no extra grey box */}
    {selectedContract.status === "accepted" && formatWinner(selectedContract) === "Not set" && (
      <div className="mt-6"> {/* ← Only small margin for breathing room */}
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

    {selectedContract.status === "twist" && (
      <div className="mt-6">
        <ResolveTwistForm
          selectedContractId={selectedContract.contract_id}
          filteredContracts={[selectedContract]}
          triggerTwist={triggerTwist}
          setSelectedContract={setSelectedContract}
          setError={setError}
          error={error}
        />
      </div>
    )}
  </div>
)}

        <div className="mt-8 text-center">
          <Link to="/marketplace" className="bg-gray-500 text-white px-6 py-3 rounded hover:bg-gray-600">
            Back to Marketplace
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Settle;