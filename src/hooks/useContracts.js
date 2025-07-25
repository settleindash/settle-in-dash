// src/hooks/useContracts.js
// Custom hook for managing contract-related logic, including fetching, creating, accepting, settling, and resolving contracts,
// using wallet address-based identification.

import { useState, useEffect } from "react";

export const useContracts = () => {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch contracts
  useEffect(() => {
    const fetchContracts = async () => {
      setLoading(true);
      try {
        const response = await fetch("https://settleindash.com/api/contracts.php");
        if (!response.ok) throw new Error("Failed to fetch contracts");
        const data = await response.json();
        setContracts(data);
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchContracts();
  }, []);

  // Create contract
  const createContract = async (question, time, stake, percentage, category, WalletAddress, acceptanceDeadline) => {
    try {
      const response = await fetch("https://settleindash.com/api/contracts.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, time, stake, percentage, category, WalletAddress, acceptanceDeadline }), // Changed email to WalletAddress
      });
      return await response.json();
    } catch (err) {
      return { error: "Failed to create contract" };
    }
  };

  // Accept contract
  const acceptContract = async (contract_id, accepterWalletAddress) => { // Changed id to contract_id, accepterEmail to accepterWalletAddress
    try {
      const response = await fetch("https://settleindash.com/api/contracts.php", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept", contract_id, accepterWalletAddress }), // Changed id to contract_id, accepterEmail to accepterWalletAddress
      });
      return await response.json();
    } catch (err) {
      return { error: "Failed to accept contract" };
    }
  };

  // Settle contract (submit winner choice)
  const settleContract = async (contract_id, submitterWalletAddress, winnerWalletAddress, reasoning) => { // Changed id to contract_id, submitterEmail to submitterWalletAddress, winnerEmail to winnerWalletAddress
    try {
      const response = await fetch("https://settleindash.com/api/contracts.php", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "settle", contract_id, submitterWalletAddress, winnerWalletAddress, reasoning }), // Changed id to contract_id, submitterEmail to submitterWalletAddress, winnerEmail to winnerWalletAddress
      });
      const result = await response.json();
      if (result.success) {
        setContracts((prev) =>
          prev.map((c) => (c.contract_id === contract_id ? { ...c, ...result.contract } : c)) // Changed id to contract_id
        );
      }
      return result;
    } catch (err) {
      return { error: "Failed to submit settlement" };
    }
  };

  // Resolve twist (via Grok API)
  const triggerTwist = async (contract_id) => { // Changed id to contract_id
    try {
      const response = await fetch("https://settleindash.com/api/contracts.php", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve_twist", contract_id }), // Changed id to contract_id
      });
      const result = await response.json();
      if (result.success) {
        setContracts((prev) =>
          prev.map((c) => (c.contract_id === contract_id ? { ...c, ...result.contract } : c)) // Changed id to contract_id
        );
      }
      return result;
    } catch (err) {
      return { error: "Failed to resolve twist" };
    }
  };

  return { contracts, createContract, acceptContract, settleContract, triggerTwist, loading, error };
};