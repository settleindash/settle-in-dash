// src/hooks/useContracts.js
// Custom hook to manage contract fetching, creation, acceptance, and details formatting for ContractCard.jsx and CreateContract.jsx

import { useState, useEffect } from "react";

export const useContracts = ({ contract_id } = {}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [contract, setContract] = useState(null);

  const API_BASE_URL = "https://settleindash.com/api"; // Hardcoded base URL

  // Fetch all contracts or a specific contract
  const fetchContracts = async ({ contract_id: cid } = {}) => {
    try {
      setLoading(true);
      const payload = {
        action: "get_contracts",
        data: cid ? { contract_id: cid } : {},
      };
      const response = await fetch(`${API_BASE_URL}/contracts.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch contracts");
      }
      const fetchedContracts = Array.isArray(result.data) ? result.data : [result.data];
      setContracts(fetchedContracts);
      console.log("useContracts: Fetched contracts:", fetchedContracts);
      if (cid) {
        const foundContract = fetchedContracts.find((c) => c.contract_id === cid);
        setContract(foundContract || null);
        console.log("useContracts: Fetched contract for id:", cid, foundContract);
      }
      return fetchedContracts;
    } catch (err) {
      setError(err.message || "Failed to fetch contracts. Please try again.");
      console.error("useContracts: Error fetching contracts", err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Create a new contract
  const createContract = async (contractData) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/contracts.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_contract",
          data: contractData,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to create contract");
      }
      console.log("useContracts: Contract created, contract_id:", result.contract_id);
      setContracts([...contracts, { ...contractData, contract_id: result.contract_id }]);
      return { success: true, contract_id: result.contract_id };
    } catch (err) {
      setError(err.message || "Failed to create contract. Please try again.");
      console.error("useContracts: Error creating contract", err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Accept a contract
  const acceptContract = async (contractId, { accepterWalletAddress, accepter_stake, accepter_transaction_id, signature, multisig_address }) => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/contracts.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "accept_contract",
          data: {
            contract_id: contractId,
            accepterWalletAddress,
            accepter_stake,
            accepter_transaction_id,
            signature,
            multisig_address,
          },
        }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to process contract");
      }
      console.log("useContracts: Contract processed, contract_id:", contractId, "message:", result.message);
      setContracts(contracts.map((c) => (c.contract_id === contractId ? { ...c, ...result.data, status: result.message ? "cancelled" : "accepted" } : c)));
      return result;
    } catch (err) {
      setError(err.message || "Failed to process contract. Please try again.");
      console.error("useContracts: Error processing contract", err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Format status for display
  const formatStatus = (status) => {
    const statusMap = {
      open: "Open for Acceptance",
      accepted: "Accepted",
      cancelled: "Cancelled",
      settled: "Settled",
      twist: "Twist Resolved",
    };
    return statusMap[status] || status;
  };

  // Format date for Europe/Paris (CEST, +02:00)
  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Europe/Paris",
    }).replace(/(\d+)\/(\d+)\/(\d+)/, "$2/$1/$3");
  };

  // Calculate Accepter's Stake
  const accepterStake = (contract) => {
    if (!contract?.odds || !contract?.stake) return "0.00";
    return (Number(contract.stake) * (Number(contract.odds) - 1)).toFixed(2);
  };

  // Calculate To Win based on outcome and position_type
  const toWin = (contract, outcome = contract?.outcome, positionType = contract?.position_type) => {
    if (!contract?.stake || !contract?.odds) return "0.00";
    const stake = Number(contract.stake);
    const odds = Number(contract.odds);
    if (positionType === "sell") {
      return (stake * 0.98).toFixed(2); // Creator (seller) wins their stake minus 2% fee
    }
    return ((stake * (odds - 1)) * 0.98).toFixed(2); // Accepter (buyer) wins stake * (odds - 1) minus 2% fee
  };

  // Get refund transaction details
  const refundDetails = (contract) => {
    if (!contract || !["cancelled", "open"].includes(contract.status)) return null;
    if (contract.status === "cancelled") {
      return {
        message: "Contract cancelled: Creator accepted with the same wallet address.",
        refundTx: contract.refund_transaction_id,
      };
    }
    if (contract.status === "open" && new Date(contract.acceptanceDeadline) < new Date()) {
      return {
        message: `Contract expired. Use this refund transaction in Dash Core: ${contract.refund_transaction_id}`,
        refundTx: contract.refund_transaction_id,
      };
    }
    return null;
  };

  // Fetch contract details for a specific contract_id
  useEffect(() => {
    if (contract_id) {
      const foundContract = contracts.find((c) => c.contract_id === contract_id);
      console.log("useContracts: Checking for contract_id:", contract_id);
      if (foundContract) {
        setContract(foundContract);
        console.log("useContracts: Found contract:", foundContract);
      } else {
        console.log("useContracts: No contract found, fetching...");
        fetchContracts({ contract_id }).then((contractResult) => {
          const fetchedContract = Array.isArray(contractResult)
            ? contractResult.find((c) => c.contract_id === contract_id)
            : contractResult;
          if (fetchedContract) {
            setContract(fetchedContract);
            console.log("useContracts: Fetched contract:", fetchedContract);
          } else {
            console.log("useContracts: No contract found for contract_id:", contract_id);
          }
        }).catch((err) => {
          console.error("useContracts: Error fetching contract:", err);
          setError(err.message);
        });
      }
    }
  }, [contract_id, contracts]);

  return {
    fetchContracts,
    createContract,
    acceptContract,
    contracts,
    contract,
    formatStatus,
    formatDate,
    accepterStake,
    toWin,
    refundDetails,
    loading,
    error,
  };
};

export default useContracts;