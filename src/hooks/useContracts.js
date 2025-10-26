// src/hooks/useContracts.js
// Custom hook to manage contract fetching, creation, acceptance, and details formatting for ContractCard.jsx and CreateContract.jsx

import { useState, useMemo } from "react";

export const useContracts = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [contractCache, setContractCache] = useState({}); // Cache for deduplication

  const API_BASE_URL = "https://settleindash.com/api";

  // Validate a transaction
  const validateTransaction = async ({ txid, expected_destination, expected_amount, min_confirmations = 1 }) => {
    try {
      setLoading(true);
      setError(null);
      const payload = {
        action: "validate_transaction",
        data: {
          txid,
          expected_destination,
          expected_amount: Number(expected_amount),
          min_confirmations,
        },
      };
      console.log("useContracts: validateTransaction payload:", payload);
      const response = await fetch(`${API_BASE_URL}/contracts.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const responseText = await response.text();
      console.log("useContracts: validateTransaction response:", responseText, "status:", response.status);
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} - ${responseText}`);
      }
      const result = JSON.parse(responseText);
      if (!result.success) {
        throw new Error(result.message || "Failed to validate transaction");
      }
      console.log("useContracts: Transaction validated:", txid);
      return { success: true };
    } catch (err) {
      setError(err.message || "Failed to validate transaction. Please try again.");
      console.error("useContracts: Error validating transaction:", err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Fetch all contracts or a specific contract with retry on 503
  const fetchContracts = async ({ contract_id, event_id, status = "open" } = {}, retries = 3) => {
    const cacheKey = contract_id ? `contract_${contract_id}` : `status_${status}_${event_id || "all"}`;
    if (contractCache[cacheKey]) {
      console.log("useContracts: Returning cached contracts for key:", cacheKey);
      return contractCache[cacheKey];
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        setLoading(true);
        setError(null);
        const payload = {
          action: "get_contracts",
          data: {
            ...(contract_id ? { contract_id } : {}),
            ...(event_id ? { event_id } : {}),
            status,
          },
        };
        console.log("useContracts: fetchContracts payload (attempt", attempt, "):", payload);
        const response = await fetch(`${API_BASE_URL}/contracts.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const responseText = await response.text();
        console.log("useContracts: fetchContracts raw response (attempt", attempt, "):", responseText, "status:", response.status);
        if (!response.ok) {
          if (response.status === 503 && attempt < retries) {
            console.log("useContracts: 503 received, retrying after delay...");
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          }
          throw new Error(`HTTP error: ${response.status} - ${responseText}`);
        }
        const result = JSON.parse(responseText);
        if (!result.success) {
          throw new Error(result.error || "Failed to fetch contracts");
        }
        const fetchedContracts = Array.isArray(result.data) ? result.data : [result.data].filter(Boolean);
        setContracts(prev => {
          const updatedContracts = [...prev];
          fetchedContracts.forEach(fc => {
            const index = updatedContracts.findIndex(c => c.contract_id === fc.contract_id);
            if (index !== -1) {
              updatedContracts[index] = fc;
            } else {
              updatedContracts.push(fc);
            }
          });
          return updatedContracts;
        });
        setContractCache(prev => ({ ...prev, [cacheKey]: fetchedContracts }));
        console.log("useContracts: Fetched contracts:", fetchedContracts);
        return fetchedContracts;
      } catch (err) {
        setError(err.message || "Failed to fetch contracts. Please try again.");
        console.error("useContracts: Error fetching contracts (attempt", attempt, "):", err);
        if (attempt === retries) {
          return [];
        }
      } finally {
        setLoading(false);
      }
    }
    return [];
  };

  // Create a new contract
  const createContract = async (contractData) => {
    try {
      setLoading(true);

      // SKIP BALANCE CHECK IF STAKE TX IS VALIDATED
      if (contractData.transaction_id && contractData.multisig_address) {
        console.log("useContracts: Stake transaction validated. Skipping balance check.");
      } else {
        // Only check balance if stake transaction is NOT validated
        const balanceResponse = await fetch(`${API_BASE_URL}/contracts.php`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "get_balance",
            data: {
              address: contractData.creator_address,
              multisig_address: contractData.multisig_address,
            },
          }),
        });
        const balanceResult = await balanceResponse.json();
        if (!balanceResult.success || balanceResult.balance < contractData.stake) {
          throw new Error(
            `Insufficient funds: Available ${balanceResult.balance?.toFixed(2) || 0} DASH, required ${contractData.stake} DASH`
          );
        }
      }

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
      console.log("useContracts: Contract created, contract_id:", result.data.contract_id);
      setContracts(prev => [...prev, { ...contractData, contract_id: result.data.contract_id }]);
      setContractCache(prev => ({
        ...prev,
        [`contract_${result.data.contract_id}`]: [{ ...contractData, contract_id: result.data.contract_id }],
      }));
      return { success: true, contract_id: result.data.contract_id };
    } catch (err) {
      setError(err.message || "Failed to create contract. Please try again.");
      console.error("useContracts: Error creating contract", err);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Accept a contract
  const acceptContract = async (contractId, { accepterWalletAddress, accepter_stake, accepter_transaction_id, accepter_fee_transaction_id, signature, new_multisig_address, accepter_public_key, message }) => {
    try {
      setLoading(true);
      const payload = {
        action: "accept_contract",
        data: {
          contract_id: contractId,
          accepterWalletAddress,
          accepter_stake,
          accepter_transaction_id,
          accepter_fee_transaction_id,
          signature,
          new_multisig_address,
          accepter_public_key,
          message,
        },
      };
      console.log("useContracts: acceptContract payload:", payload);
      const response = await fetch(`${API_BASE_URL}/contracts.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const responseText = await response.text();
      console.log("useContracts: acceptContract response:", responseText, "status:", response.status);
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status} - ${responseText}`);
      }
      const result = JSON.parse(responseText);
      if (!result.success) {
        throw new Error(result.error || "Failed to process contract");
      }
      console.log("useContracts: Contract processed, contract_id:", contractId, "message:", result.message);
      setContracts(prev => prev.map(c => 
        c.contract_id === contractId 
          ? { 
              ...c, 
              status: accepterWalletAddress === c.WalletAddress ? "cancelled" : "accepted",
              accepterWalletAddress,
              accepter_stake,
              accepter_transaction_id,
              accepter_fee_transaction_id,
              new_multisig_address,
              accepter_public_key,
            } 
          : c
      ));
      setContractCache(prev => ({
        ...prev,
        [`contract_${contractId}`]: [{
          ...prev[`contract_${contractId}`]?.[0],
          status: accepterWalletAddress === prev[`contract_${contractId}`]?.[0]?.WalletAddress ? "cancelled" : "accepted",
          accepterWalletAddress,
          accepter_stake,
          accepter_transaction_id,
          accepter_fee_transaction_id,
          new_multisig_address,
          accepter_public_key,
        }],
      }));
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
      expired: "Expired",
    };
    return statusMap[status] || status;
  };

  // Format date for Europe/Paris (CEST, +02:00)
  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid date";
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
    if (!contract || !["cancelled", "open", "expired"].includes(contract.status)) return null;
    if (contract.status === "cancelled") {
      return {
        message: "Contract cancelled: Creator accepted with the same wallet address.",
        refundTx: contract.refund_transaction_id || contract.refund_txid,
      };
    }
    if (contract.status === "expired" || (contract.status === "open" && new Date(contract.acceptanceDeadline) < new Date())) {
      return {
        message: `Contract expired. Use this refund transaction in Dash Core: ${contract.refund_transaction_id || contract.refund_txid}`,
        refundTx: contract.refund_transaction_id || contract.refund_txid,
      };
    }
    return null;
  };

  return {
    fetchContracts,
    createContract,
    acceptContract,
    validateTransaction,
    contracts,
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