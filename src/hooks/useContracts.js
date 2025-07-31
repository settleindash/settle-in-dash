// src/hooks/useContracts.js
// Custom hook for managing contract-related logic for Settle In DASH.
// Supports fetching, creating, accepting, settling, and resolving contracts with event-based structure.

import { useState, useCallback } from "react";

export const useContracts = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch contracts with optional filters
  const fetchContracts = useCallback(async (filters = {}) => {
    setLoading(true);
    setError(null);
    console.log("useContracts: Fetching contracts with filters:", filters);
    try {
      const query = new URLSearchParams(filters).toString();
      const response = await fetch(`https://settleindash.com/api/contracts.php${query ? `?${query}` : ''}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      if (result.error) {
        throw new Error(result.error);
      }
      setContracts(result);
      console.log("useContracts: Contracts fetched successfully:", result);
      return result;
    } catch (err) {
      console.error("useContracts: Error fetching contracts:", err.message);
      setError(err.message);
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Create contract
  const createContract = useCallback(async (contractData) => {
    setLoading(true);
    setError(null);
    console.log("useContracts: Creating contract with data:", contractData);
    try {
      const response = await fetch("https://settleindash.com/api/contracts.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contractData),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to create contract");
      }
      console.log("useContracts: Contract created successfully:", result);
      // Refresh contracts
      await fetchContracts();
      return result;
    } catch (err) {
      console.error("useContracts: Error creating contract:", err.message);
      setError(err.message);
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  }, [fetchContracts]);

  // Accept contract
  const acceptContract = useCallback(async (contract_id, accepterData) => {
    setLoading(true);
    setError(null);
    console.log("useContracts: Accepting contract:", contract_id, accepterData);
    try {
      const response = await fetch("https://settleindash.com/api/contracts.php", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept", contract_id, ...accepterData }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to accept contract");
      }
      console.log("useContracts: Contract accepted successfully:", result);
      // Update contract state
      setContracts((prev) =>
        prev.map((c) => (c.contract_id === contract_id ? { ...c, ...result.contract } : c))
      );
      return result;
    } catch (err) {
      console.error("useContracts: Error accepting contract:", err.message);
      setError(err.message);
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Settle contract (submit winner choice)
  const settleContract = useCallback(async (contract_id, submitterWalletAddress, winnerWalletAddress, reasoning) => {
    setLoading(true);
    setError(null);
    console.log("useContracts: Settling contract:", contract_id, { submitterWalletAddress, winnerWalletAddress, reasoning });
    try {
      const response = await fetch("https://settleindash.com/api/contracts.php", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "settle", contract_id, submitterWalletAddress, winnerWalletAddress, reasoning }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to submit settlement");
      }
      console.log("useContracts: Contract settled successfully:", result);
      // Update contract state
      setContracts((prev) =>
        prev.map((c) => (c.contract_id === contract_id ? { ...c, ...result.contract } : c))
      );
      return result;
    } catch (err) {
      console.error("useContracts: Error settling contract:", err.message);
      setError(err.message);
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // Resolve twist (via Grok API)
  const triggerTwist = useCallback(async (contract_id) => {
    setLoading(true);
    setError(null);
    console.log("useContracts: Triggering twist for contract:", contract_id);
    try {
      const response = await fetch("https://settleindash.com/api/contracts.php", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve_twist", contract_id }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Failed to resolve twist");
      }
      console.log("useContracts: Twist resolved successfully:", result);
      // Update contract state
      setContracts((prev) =>
        prev.map((c) => (c.contract_id === contract_id ? { ...c, ...result.contract } : c))
      );
      return result;
    } catch (err) {
      console.error("useContracts: Error resolving twist:", err.message);
      setError(err.message);
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  }, []);

  return { contracts, fetchContracts, createContract, acceptContract, settleContract, triggerTwist, loading, error };
};