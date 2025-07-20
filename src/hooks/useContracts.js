// src/hooks/useContracts.js
// Custom React hook for managing contracts (bets) via API.
// Handles creating, accepting, settling, and triggering a "Twist" for contracts.
// Provides filtered openContracts for the marketplace.

import { useState, useEffect } from "react";

export const useContracts = () => {
  const [contracts, setContracts] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Determine API base URL based on environment
  const API_BASE_URL = process.env.NODE_ENV === 'development'
    ? 'http://localhost:8000/api'
    : 'https://settleindash.com/api';

  // Fetch contracts on mount
  useEffect(() => {
    const fetchContracts = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${API_BASE_URL}/contracts.php`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
        const data = await response.json();
        setContracts(data);
        console.log("useContracts: Fetched contracts", data);
      } catch (err) {
        setError(err.message);
        console.error("useContracts: Error fetching contracts", err);
      } finally {
        setLoading(false);
      }
    };
    fetchContracts();
  }, []);

  const createContract = async (question, time, stake, percentage, category, email, acceptanceDeadline) => {
    console.log("useContracts: Creating contract with:", { question, time, stake, percentage, category, email, acceptanceDeadline });

    // Client-side validation
    if (!question.endsWith("?")) {
      console.log("useContracts: Validation failed - no question mark");
      return { error: "Question must end with ?" };
    }
    if (typeof stake !== "number" || stake < 1) {
      console.log("useContracts: Validation failed - invalid stake");
      return { error: "Minimum 1 DASH stake" };
    }
    if (typeof percentage !== "number" || percentage < 0 || percentage > 100) {
      console.log("useContracts: Validation failed - invalid percentage");
      return { error: "Percentage must be a number between 0 and 100" };
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("useContracts: Validation failed - invalid email");
      return { error: "Please provide a valid email address" };
    }
    const currentDateTime = new Date();
    const eventTime = new Date(time);
    if (isNaN(eventTime) || eventTime <= currentDateTime) {
      console.log("useContracts: Validation failed - invalid or past event time");
      return { error: "Event time must be a valid date and after the current time" };
    }
    const deadline = new Date(acceptanceDeadline);
    if (isNaN(deadline) || deadline <= currentDateTime) {
      console.log("useContracts: Validation failed - invalid or past acceptance deadline");
      return { error: "Acceptance deadline must be a valid date and after the current time" };
    }
    if (deadline > eventTime) {
      console.log("useContracts: Validation failed - acceptance deadline after event time");
      return { error: "Acceptance deadline must be before or on the event time" };
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/contracts.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: String(contracts.length + 1),
          question,
          time,
          stake,
          percentage,
          category,
          email,
          acceptanceDeadline,
        }),
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const result = await response.json();
      if (result.success) {
        setContracts((prev) => [
          ...prev,
          {
            id: result.id || String(contracts.length + 1),
            question,
            time,
            stake,
            percentage,
            category,
            email,
            acceptanceDeadline,
            status: "open",
            accepter: null,
            accepterEmail: null,
            resolutionDetails: null,
          },
        ]);
        console.log("useContracts: Contract created", result);
        return { success: true };
      }
      throw new Error(result.error || "Failed to create contract");
    } catch (err) {
      setError(err.message);
      console.error("useContracts: Error creating contract", err);
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const acceptContract = async (contractId, accepterEmail) => {
    console.log("useContracts: Accepting contract:", contractId, "Accepter email:", accepterEmail);
    const contract = contracts.find((c) => c.id === contractId);
    if (!contract) {
      console.log("useContracts: Contract not found");
      return { error: "Contract not found" };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(accepterEmail)) {
      console.log("useContracts: Validation failed - invalid accepter email");
      return { error: "Please provide a valid accepter email address" };
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/contracts.php`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept", id: contractId, accepterEmail }),
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const result = await response.json();
      if (result.success) {
        setContracts((prev) =>
          prev.map((c) =>
            c.id === contractId
              ? {
                  ...c,
                  status: c.email === accepterEmail ? "cancelled" : "accepted",
                  accepter: c.email === accepterEmail ? null : "0xMockAccepter",
                  accepterEmail: c.email === accepterEmail ? null : accepterEmail,
                }
              : c
          )
        );
        console.log("useContracts: Contract accepted", result);
        return result;
      }
      throw new Error(result.error || "Failed to accept contract");
    } catch (err) {
      setError(err.message);
      console.error("useContracts: Error accepting contract", err);
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const settleContract = async (contractId, winnerEmail) => {
    console.log("useContracts: Settling contract:", contractId, "Winner email:", winnerEmail);
    const contract = contracts.find((c) => c.id === contractId);
    if (!contract) {
      console.log("useContracts: Contract not found");
      return { error: "Contract not found" };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(winnerEmail)) {
      console.log("useContracts: Validation failed - invalid winner email");
      return { error: "Please provide a valid winner email address" };
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/contracts.php`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "settle", id: contractId, winnerEmail }),
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const result = await response.json();
      if (result.success) {
        setContracts((prev) =>
          prev.map((c) => (c.id === contractId ? { ...c, status: "settled" } : c))
        );
        console.log("useContracts: Contract settled", result);
        return result;
      }
      throw new Error(result.error || "Failed to settle contract");
    } catch (err) {
      setError(err.message);
      console.error("useContracts: Error settling contract", err);
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const triggerTwist = async (contractId) => {
    console.log("useContracts: Triggering Twist for contract:", contractId);
    const contract = contracts.find((c) => c.id === contractId);
    if (!contract) {
      console.log("useContracts: Contract not found");
      return { error: "Contract not found" };
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/contracts.php`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "twist", id: contractId }),
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const result = await response.json();
      if (result.success) {
        setContracts((prev) =>
          prev.map((c) =>
            c.id === contractId
              ? {
                  ...c,
                  status: "twist",
                  resolution: "Yes",
                  resolutionDetails: {
                    reasoning: "Mock Grok response based on public data",
                    timestamp: new Date().toISOString(),
                  },
                }
              : c
          )
        );
        console.log("useContracts: Twist triggered", result);
        return result;
      }
      throw new Error(result.error || "Failed to trigger twist");
    } catch (err) {
      setError(err.message);
      console.error("useContracts: Error triggering twist", err);
      return { error: err.message };
    } finally {
      setLoading(false);
    }
  };

  // Filter open contracts for marketplace
  const openContracts = contracts.filter((c) => c.status === "open");

  return { contracts, openContracts, createContract, acceptContract, settleContract, triggerTwist, error, loading };
};