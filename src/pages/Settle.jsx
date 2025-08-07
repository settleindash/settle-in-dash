// src/pages/Settle.jsx
// Component for settling contracts or resolving twists, filtering by user wallet address.

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
  const [userWalletAddress, setUserWalletAddress] = useState("");
  const [submitterWalletAddress, setSubmitterWalletAddress] = useState("");
  const [winnerWalletAddress, setWinnerWalletAddress] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [selectedContractId, setSelectedContractId] = useState(null);
  const [error, setError] = useState("");
  const [filteredContracts, setFilteredContracts] = useState([]);
  const navigate = useNavigate();

  const validBase58Chars = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;

  const validateWalletAddress = (address) => {
    if (!address) {
      console.log("Settle: validateWalletAddress - Address is empty");
      return false;
    }
    if (address.length !== 34) {
      console.log(`Settle: validateWalletAddress - Invalid length: ${address.length}`);
      return false;
    }
    if (!address.startsWith("X")) {
      console.log("Settle: validateWalletAddress - Does not start with 'X'");
      return false;
    }
    if (!validBase58Chars.test(address)) {
      console.log(`Settle: validateWalletAddress - Invalid characters in: ${address}`);
      return false;
    }
    console.log(`Settle: validateWalletAddress - Valid address: ${address}`);
    return true;
  };

  // Fetch all contracts and events on mount
  useEffect(() => {
    console.log("Settle: Fetching all contracts and events");
    fetchContracts({});
    getEvents({ status: "open" });
  }, [fetchContracts, getEvents]);

  // Map contracts to include eventTitle
  const contractsWithEventTitles = useMemo(() => {
    console.log("Settle: Mapping contracts with event titles, userWalletAddress:", userWalletAddress);
    if (!userWalletAddress || !validateWalletAddress(userWalletAddress)) {
      console.log("Settle: No valid wallet address provided, returning empty array");
      return [];
    }
    const filtered = contracts
      .filter(
        (c) =>
          c.WalletAddress === userWalletAddress || c.accepterWalletAddress === userWalletAddress
      )
      .map((contract) => {
        const event = events.find((e) => e.event_id === contract.event_id);
        return {
          ...contract,
          eventTitle: event ? event.title : "Not set",
        };
      });
    console.log("Settle: Contracts with event titles:", filtered);
    return filtered;
  }, [contracts, events, userWalletAddress]);

  // Debug contracts data
  useEffect(() => {
    console.log("Settle: Raw contracts from useContracts:", contracts);
    console.log("Settle: Filtered contracts with event titles:", contractsWithEventTitles);
    console.log("Settle: Filtered contracts from FilterContracts:", filteredContracts);
  }, [contracts, contractsWithEventTitles, filteredContracts]);

  // Format winner for display
  const formatWinner = (contract) => {
    console.log("Settle: formatWinner, contract_id:", contract.contract_id, "winner:", contract.winner, "accepterWalletAddress:", contract.accepterWalletAddress);
    if (contract.winner === "tie") return "Tie";
    if (contract.winner && contract.winner === contract.WalletAddress) return "Creator";
    if (contract.winner && contract.accepterWalletAddress && contract.winner === contract.accepterWalletAddress) return "Accepter";
    return "Not set";
  };

  // Render table for contracts via FilterContracts
  const renderTable = (contractsToRender) => (
    <FilterContracts
      contracts={contractsToRender}
      onFilterChange={setFilteredContracts}
      contractsPerPage={20}
      renderContent={(paginatedContracts) => (
        <div className="mt-6">
          <h2 className="text-base sm:text-xl font-semibold mb-4">All Contracts</h2>
          {paginatedContracts.length === 0 ? (
            <p className="text-gray-600 text-xs sm:text-base">No contracts available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border rounded-lg shadow">
                <thead>
                  <tr className="bg-gray-100 border-b">
                    <th className="p-1 sm:p-4 text-left text-gray-700 text-[10px] sm:text-xs max-w-[50px]">
                      Winner
                    </th>
                    <th className="p-1 sm:p-4 text-left text-gray-700 text-[10px] sm:text-xs max-w-[50px]">
                      Creator Choice
                    </th>
                    <th className="p-1 sm:p-4 text-left text-gray-700 text-[10px] sm:text-xs max-w-[50px]">
                      Accepter Choice
                    </th>
                    <th className="p-1 sm:p-4 text-left text-gray-700 text-[10px] sm:text-xs max-w-[50px]">
                      Created At
                    </th>
                    <th className="p-1 sm:p-4 text-left text-gray-700 text-[10px] sm:text-xs max-w-[70px]">
                      Event
                    </th>
                    <th className="p-1 sm:p-4 text-left text-gray-700 text-[10px] sm:text-xs max-w-[70px]">
                      Outcome
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedContracts.map((contract) => (
                    <tr key={contract.contract_id} className="border-b hover:bg-gray-50">
                      <td className="p-1 sm:p-4 max-w-[50px] truncate break-words text-[10px] sm:text-xs">
                        {formatWinner(contract) === "Not set" ? (
                          <button
                            className="text-blue-500 hover:underline min-h-[44px]"
                            onClick={() => {
                              console.log("Settle: Selected contract_id for settlement:", contract.contract_id);
                              setSelectedContractId(contract.contract_id);
                            }}
                            aria-label={`Select contract ${contract.contract_id} for settlement or twist resolution`}
                          >
                            Not set
                          </button>
                        ) : (
                          formatWinner(contract)
                        )}
                      </td>
                      <td className="p-1 sm:p-4 max-w-[50px] truncate break-words text-[10px] sm:text-xs">
                        {contract.creator_winner_choice || "Not submitted"}
                      </td>
                      <td className="p-1 sm:p-4 max-w-[50px] truncate break-words text-[10px] sm:text-xs">
                        {contract.accepter_winner_choice || "Not submitted"}
                      </td>
                      <td className="p-1 sm:p-4 max-w-[50px] truncate break-words text-[10px] sm:text-xs">
                        {new Date(contract.created_at).toLocaleString("en-GB", {
                          timeZone: "Europe/Paris",
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="p-1 sm:p-4 max-w-[70px] truncate break-words text-[10px] sm:text-xs">
                        {contract.eventTitle || "Not set"}
                      </td>
                      <td className="p-1 sm:p-4 max-w-[70px] truncate break-words text-[10px] sm:text-xs">
                        {contract.outcome || "Not set"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
      showFilters={validateWalletAddress(userWalletAddress)}
    />
  );

  return (
    <div className="min-h-screen bg-background p-4">
      <PageHeader title="Settle Contracts" />
      <main className="max-w-7xl mx-auto p-1 sm:p-6 mt-6">
        <div className="mb-6">
          <label htmlFor="userWalletAddress" className="block text-base sm:text-lg font-bold text-primary mb-2">
            Your Wallet Address (Required)
          </label>
          <input
            id="userWalletAddress"
            type="text"
            placeholder="Enter your DASH wallet address to view your contracts"
            className="border p-2 rounded w-full sm:w-1/2 min-h-[44px] text-[10px] sm:text-base"
            value={userWalletAddress}
            onChange={(e) => {
              console.log("Settle: Wallet Address changed:", e.target.value);
              setUserWalletAddress(e.target.value);
              setError("");
            }}
            aria-label="Enter your DASH wallet address to view your contracts"
          />
        </div>
        {!userWalletAddress && (
          <p className="text-gray-600 text-xs sm:text-base mb-6">
            Please enter your wallet address to view your contracts.
          </p>
        )}
        {userWalletAddress && !validateWalletAddress(userWalletAddress) && (
          <p className="text-red-500 text-xs sm:text-base mb-6">
            Please enter a valid DASH wallet address (34 characters, starts with 'X').
          </p>
        )}
        {validateWalletAddress(userWalletAddress) && selectedContractId && filteredContracts.find((c) => c.contract_id === selectedContractId) && (
          <SettleContractForm
            selectedContractId={selectedContractId}
            filteredContracts={filteredContracts}
            settleContract={settleContract}
            setSubmitterWalletAddress={setSubmitterWalletAddress}
            setWinnerWalletAddress={setWinnerWalletAddress}
            setReasoning={setReasoning}
            setSelectedContractId={setSelectedContractId}
            setError={setError}
            error={error}
          />
        )}
        {validateWalletAddress(userWalletAddress) && selectedContractId && filteredContracts.find((c) => c.contract_id === selectedContractId)?.status === "twist" && (
          <ResolveTwistForm
            selectedContractId={selectedContractId}
            filteredContracts={filteredContracts}
            triggerTwist={triggerTwist}
            setSelectedContractId={setSelectedContractId}
            setError={setError}
            error={error}
          />
        )}
        {validateWalletAddress(userWalletAddress) && renderTable(contractsWithEventTitles)}
        <div className="mt-6">
          <Link
            to="/marketplace"
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 min-h-[44px] text-[10px] sm:text-base"
            aria-label="Back to Marketplace"
          >
            Back to Marketplace
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Settle;