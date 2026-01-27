// src/hooks/useContracts.js
// FINAL ULTIMATE VERSION — Updated for generate_settlement_signing_data + message signature

import { useState, useMemo, useCallback } from "react";

const API_BASE = "https://settleindash.com/api/contracts.php";

export const useContracts = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [contracts, setContracts] = useState([]);
  const [contractCache, setContractCache] = useState({});

  // Secure POST helper
  const post = useCallback(async (action, data = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, data }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || result.message || `HTTP ${response.status}`);
      }
      return result;
    } catch (err) {
      const msg = err.message || "Network error";
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // 1. fetchContracts
  const fetchContracts = useCallback(
    async ({ contract_id, event_id, status = null } = {}) => {
      const cacheKey = contract_id || event_id || status;
      if (contractCache[cacheKey]) return contractCache[cacheKey];

      const result = await post("get_contracts", { contract_id, event_id, status });
      const fetched = Array.isArray(result.data) ? result.data : [];
      setContracts(fetched);
      setContractCache((prev) => ({ ...prev, [cacheKey]: fetched }));
      return fetched;
    },
    [post, contractCache]
  );

  // 2. createContract
  const createContract = useCallback(
    async (contractData) => {
      const result = await post("create_contract", contractData);
      if (result.success) {
        setContracts((prev) => [...prev, result.data]);
      }
      return result;
    },
    [post]
  );

  // 3. acceptContract
  const acceptContract = useCallback(
    async (contractId, payload) => {
      const result = await post("accept_contract", {
        contract_id: contractId,
        ...payload
      });

      if (result.success) {
        setContracts((prev) =>
          prev.map((c) =>
            c.contract_id === contractId ? { ...c, ...result.data } : c
          )
        );
      }
      return result;
    },
    [post]
  );

  // 4. settleContract — sends message signature + tx partial hex
  const settleContract = useCallback(
    async (
      contractId,
      resolution,
      reasoning,
      signerAddress,
      partialTxHex,
      messageSignature,           // ← from signmessage
      message                     // ← e.g. "SettleInDASH settlement:contract_id:resolution"
    ) => {
      try {
        if (!partialTxHex) {
          console.warn("DEBUG: No partial_tx_hex provided — only vote will be saved");
        }

        const payload = {
          contract_id: contractId,
          resolution,
          reasoning,
          signer_address: signerAddress,
          signature: messageSignature,   // message signature (from signmessage)
          message,                       // the exact message that was signed
          partial_tx_hex: partialTxHex,
        };

        console.log("DEBUG: settleContract sending:", payload);

        const result = await post("settle_contract", payload);
        return result;
      } catch (err) {
        const msg = err.message || "Network error during settlement";
        setError(msg);
        throw err;
      }
    },
    [post]
  );

  // 5. validateTransaction
  const validateTransaction = useCallback(
    async ({ txid, expected_destination, expected_amount, min_confirmations = 1 }) => {
      return await post("validate_transaction", {
        txid,
        expected_destination,
        expected_amount: Number(expected_amount),
        min_confirmations,
      });
    },
    [post]
  );

  // 6. getTransactionInfo
  const getTransactionInfo = useCallback(
    async (txid) => {
      if (!txid) return null;
      try {
        const result = await post("get_transaction_info", { txid });
        return result.data || null;
      } catch (err) {
        console.error("Failed to fetch tx info:", err);
        return null;
      }
    },
    [post]
  );

  // 7. verifySignature
  const verifySignature = useCallback(
    async (address, signature) => {
      const message = `SettleInDash:${address}`;

      try {
        const response = await fetch(API_BASE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "verify_signature",
            data: { address, message, signature }
          })
        });

        const result = await response.json();

        if (!response.ok) {
          return false;
        }

        return result.isValid === true;
      } catch (err) {
        return false;
      }
    },
    []
  );

  // 8. generateSettlementSigningData — renamed + returns prevtxs etc.
  const generateSettlementSigningData = useCallback(
    async (contractId, resolution) => {
      try {
        const result = await post("generate_settlement_signing_data", {
          contract_id: contractId,
          resolution,
        });
        if (!result.success) {
          throw new Error(result.error || "Failed to generate signing data");
        }
        return result;
      } catch (err) {
        const msg = err.message || "Network error generating signing data";
        setError(msg);
        throw err;
      }
    },
    [post]
  );

  // 9. listUnspent
  const listUnspent = useCallback(
    async (address, minconf = 0) => {
      return await post("listunspent", { address, minconf });
    },
    [post]
  );

  // Helpers
  const formatStatus = useCallback((status) => {
    const map = {
      open: "Open for Acceptance",
      accepted: "Accepted",
      cancelled: "Cancelled",
      settled: "Settled",
      twist: "Twist Resolved",
      expired: "Expired",
    };
    return map[status] || status;
  }, []);

  const accepterStake = useCallback((contract) => {
    if (!contract?.stake || !contract?.odds) return "0.00";
    return (Number(contract.stake) * (Number(contract.odds) - 1)).toFixed(8);
  }, []);

  const toWin = useCallback((contract) => {
    if (!contract?.stake || !contract?.odds) return "0.00";
    const stake = Number(contract.stake);
    const odds = Number(contract.odds);
    return (stake * (odds - 1) * 0.97).toFixed(8); // 3% fee
  }, []);

  const refundDetails = useCallback((contract) => {
    if (!contract || !["cancelled", "expired"].includes(contract.status)) return null;
    return {
      message: contract.status === "cancelled"
        ? "Contract cancelled by creator"
        : "Contract expired — refund available",
      refundTx: contract.refund_transaction_id || contract.refund_txid,
    };
  }, []);

  return useMemo(
    () => ({
      // Core actions
      fetchContracts,
      createContract,
      acceptContract,
      settleContract,
      generateSettlementSigningData,      // ← updated name
      validateTransaction,
      listUnspent,
      getTransactionInfo,
      verifySignature,

      // Data & state
      contracts,
      loading,
      error,
      clearError: () => setError(null),

      // Helpers
      formatStatus,
      accepterStake,
      toWin,
      refundDetails,
    }),
    [
      fetchContracts,
      createContract,
      acceptContract,
      settleContract,
      generateSettlementSigningData,
      validateTransaction,
      listUnspent,
      getTransactionInfo,
      verifySignature,
      contracts,
      loading,
      error,
      formatStatus,
      accepterStake,
      toWin,
      refundDetails,
    ]
  );
};

export default useContracts;