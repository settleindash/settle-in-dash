// src/hooks/useContracts.js
// This is a custom React hook for managing contracts (bets) in a web application.
// It allows users to create, accept, settle, and trigger a "Twist" for contracts.
// The creator is now identified by their email, so the 'creator' field is removed.

import { useState } from "react";
// Importing useState from React to manage the state of contracts.

export const useContracts = (initialContracts) => {
  // Custom hook that takes an optional initialContracts array and returns contract data and management functions.

  const [contracts, setContracts] = useState(initialContracts || []);
  // State variable 'contracts' initialized with initialContracts (or empty array if none provided).
  // setContracts is used to update the contracts state.

  const createContract = (question, time, stake, percentage, category, email, terminationDate) => {
    // Function to create a contract with fields: question, time, stake, percentage, category, email, and terminationDate.

    console.log("useContracts: Creating contract with:", { question, time, stake, percentage, category, email, terminationDate });
    // Logs input parameters for debugging, visible in the browser's Console (F12 in VSC).

    // Validation for question: must end with a question mark.
    if (!question.includes("?")) {
      console.log("useContracts: Validation failed - no question mark");
      return { error: "Question must end with ?" };
    }

    // Validation for stake: must be at least 1 DASH.
    if (stake < 1) {
      console.log("useContracts: Validation failed - invalid stake");
      return { error: "Minimum 1 DASH stake" };
    }

    // Validation for percentage: must be a number between 0 and 100.
    if (typeof percentage !== "number" || percentage < 0 || percentage > 100) {
      console.log("useContracts: Validation failed - invalid percentage");
      return { error: "Percentage must be a number between 0 and 100" };
    }

    // Email validation: checks for a simple email format (e.g., name@domain.com).
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log("useContracts: Validation failed - invalid email");
      return { error: "Please provide a valid email address" };
    }

    // Validation for time: ensure it's a valid date string (e.g., "2025-07-20T14:00:00").
    if (isNaN(Date.parse(time))) {
      console.log("useContracts: Validation failed - invalid time");
      return { error: "Time must be a valid date and time" };
    }

    // Validation for terminationDate: ensure it's valid and after the event time.
    if (isNaN(Date.parse(terminationDate)) || new Date(terminationDate) <= new Date(time)) {
      console.log("useContracts: Validation failed - invalid termination date");
      return { error: "Termination date must be valid and after the event time" };
    }

    const newContract = {
      // Creates a new contract object with updated fields, excluding the 'creator' field.
      id: String(contracts.length + 1), // Unique ID based on the number of existing contracts.
      question, // The question for the contract (e.g., "Will it rain today?").
      time, // The date and time when the event in the question starts (e.g., "2025-07-20T14:00:00").
      stake, // The amount staked on the contract (in DASH).
      percentage, // The percentage (0-100) of the total pot the creator is responsible for.
      category, // The category of the contract (e.g., "Weather", "Sports").
      email, // The creator's email, used as their identifier and for notifications.
      terminationDate, // The date when the contract ends and changes status.
      status: "open", // Initial status of the contract.
      accepter: null, // Initially, no one has accepted the contract.
    };
    setContracts([...contracts, newContract]);
    // Adds the new contract to the existing contracts array using the spread operator.
    console.log("useContracts: New contract created:", JSON.stringify(newContract, null, 2));
    // Logs the new contract details in a formatted JSON string for debugging.
    alert("Contract created successfully! Copy the console output to src/mocks/contracts.json to persist.");
    // Alerts the user to confirm creation and reminds them to update the mock file.
    return { success: true };
    // Returns a success object to indicate the contract was created.
  };

  const acceptContract = (contractId, accepterEmail) => {
    // Function to accept a contract, taking contractId and accepterEmail as parameters.
    console.log("useContracts: Accepting contract:", contractId, "Accepter email:", accepterEmail);
    // Logs the contract ID and accepter's email for debugging.

    // Find the contract to check the creator's email.
    const contract = contracts.find((c) => c.id === contractId);
    if (!contract) {
      console.log("useContracts: Contract not found");
      return alert("Contract not found");
    }

    // Validate accepter's email format.
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(accepterEmail)) {
      console.log("useContracts: Validation failed - invalid accepter email");
      return alert("Please provide a valid accepter email address");
    }

    // Check if the creator's email (contract.email) matches the accepter's email.
    if (contract.email === accepterEmail) {
      console.log("useContracts: Contract cancelled - creator and accepter emails are identical");
      setContracts(
        contracts.map((c) =>
          c.id === contractId ? { ...c, status: "cancelled", accepter: "0xMockAccepter", accepterEmail } : c
          // If emails match, set status to "cancelled" and store accepter's email for reference.
        )
      );
      alert(`Contract ${contractId} cancelled! Creator and accepter cannot have the same email. Update src/mocks/contracts.json manually.`);
      return;
    }

    // Proceed with accepting the contract if emails are different.
    setContracts(
      contracts.map((c) =>
        c.id === contractId && !c.accepter
          ? { ...c, accepter: "0xMockAccepter", status: "accepted", accepterEmail } // Store accepterEmail for notifications.
          : c
          // If contract ID matches and no accepter exists, update with mock accepter and status.
      )
    );
    alert(`Contract ${contractId} accepted! Update src/mocks/contracts.json manually.`);
    // Alerts the user to confirm acceptance and reminds them to update the mock file.
  };

  const settleContract = (contractId, winnerEmail) => {
    // Function to settle a contract, updated to use winnerEmail instead of winner (since creator is now identified by email).
    console.log("useContracts: Settling contract:", contractId, "Winner email:", winnerEmail);
    // Logs the contract ID and winner's email for debugging.
    const contract = contracts.find((c) => c.id === contractId);
    if (!contract) return alert("Contract not found");
    // If no contract is found, shows an alert and exits.
    if (contract.status !== "accepted") return alert("Contract not accepted");
    // If contract isn't accepted, shows an alert and exits.

    // Calculate payout based on whether the winner is the creator (contract.email) or accepter (contract.accepterEmail).
    const payout = winnerEmail === contract.email ? contract.stake * 0.97 : contract.stake * 0.95;
    // Payout is 0.97x stake for creator, 0.95x for accepter.
    alert(`Contract settled! ${winnerEmail} receives ${payout} DASH. Update src/mocks/contracts.json manually.`);
    // Alerts the user with settlement details and reminds them to update the mock file.
    setContracts(
      contracts.map((c) =>
        c.id === contractId ? { ...c, status: "settled" } : c
        // Updates the contract status to "settled" if the ID matches.
      )
    );
  };

  const triggerTwist = (contractId) => {
    // Function to trigger a "Twist" (mock resolution) for a PLEASE assistant: a contract.
    console.log("useContracts: Triggering Twist for contract:", contractId);
    // Logs the contract ID for debugging.
    setContracts(
      contracts.map((c) =>
        c.id === contractId && c.status === "accepted"
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
    alert(`Twist triggered for contract ${contractId}! Grok resolved: Yes outcome. Update src/mocks/contracts.json manually.`);
    // Alerts the user to confirm the Twist and reminds them to update the mock file.
  };

  return { contracts, createContract, acceptContract, settleContract, triggerTwist };
  // Returns the contracts state and management functions.
};