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
  const createContract = async (question, time, stake, percentage, category, email, acceptanceDeadline) => {
    try {
      const response = await fetch("https://settleindash.com/api/contracts.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, time, stake, percentage, category, email, acceptanceDeadline }),
      });
      return await response.json();
    } catch (err) {
      return { error: "Failed to create contract" };
    }
  };

  // Accept contract
  const acceptContract = async (id, accepterEmail) => {
    try {
      const response = await fetch("https://settleindash.com/api/contracts.php", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept", id, accepterEmail }),
      });
      return await response.json();
    } catch (err) {
      return { error: "Failed to accept contract" };
    }
  };

  // Settle contract (submit winner choice)
  const settleContract = async (id, submitterEmail, winnerEmail, reasoning) => {
    try {
      const response = await fetch("https://settleindash.com/api/contracts.php", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "settle", id, submitterEmail, winnerEmail, reasoning }),
      });
      const result = await response.json();
      if (result.success) {
        setContracts((prev) =>
          prev.map((c) => (c.id === id ? { ...c, ...result.contract } : c))
        );
      }
      return result;
    } catch (err) {
      return { error: "Failed to submit settlement" };
    }
  };

  // Resolve twist (via Grok API)
  const triggerTwist = async (id) => {
    try {
      const response = await fetch("https://settleindash.com/api/contracts.php", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "resolve_twist", id }),
      });
      const result = await response.json();
      if (result.success) {
        setContracts((prev) =>
          prev.map((c) => (c.id === id ? { ...c, ...result.contract } : c))
        );
      }
      return result;
    } catch (err) {
      return { error: "Failed to resolve twist" };
    }
  };

  return { contracts, createContract, acceptContract, settleContract, triggerTwist, loading, error };
};