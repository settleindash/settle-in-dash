// src/hooks/useContractDetails.js
// Custom hook to handle contract data fetching, formatting, and calculations for Contract.jsx, ContractCard.jsx, and OrderBook.jsx

import { useState, useEffect } from "react";
import { useContracts } from "./useContracts";

const useContractDetails = (contract_id, contracts = []) => {
  const { fetchContracts, contracts: contextContracts } = useContracts();
  const [contract, setContract] = useState(null);

  // Use provided contracts or context contracts
  const availableContracts = contracts.length > 0 ? contracts : contextContracts;

  // Fetch contract data
  useEffect(() => {
    if (contract_id) {
      const foundContract = availableContracts.find((c) => c.contract_id === contract_id);
      console.log("useContractDetails: Checking for contract_id:", contract_id);

      if (foundContract) {
        setContract(foundContract);
        console.log("useContractDetails: Found contract:", foundContract);
      } else {
        console.log("useContractDetails: No contract found, fetching...");
        fetchContracts({ contract_id }).then((contractResult) => {
          const fetchedContract = Array.isArray(contractResult)
            ? contractResult.find((c) => c.contract_id === contract_id)
            : contractResult;
          if (fetchedContract) {
            setContract(fetchedContract);
            console.log("useContractDetails: Fetched contract:", fetchedContract);
          }
        });
      }
    }
  }, [availableContracts, contract_id, fetchContracts]);

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

  // Format date as YYYY-MM-DD
  const formatDate = (dateString) => {
    return dateString ? new Date(dateString).toISOString().split("T")[0] : "Not set";
  };

  // Calculate Accepter's Stake
  const accepterStake = contract?.odds && contract?.stake
    ? (Number(contract.stake) * (Number(contract.odds) - 1)).toFixed(2) // Accepter's stake for "sell" contract
    : contract?.percentage && contract?.stake // Fallback for legacy contracts
      ? (Number(contract.stake) / Number(contract.percentage)).toFixed(2)
      : "0.00";

  // Calculate To Win based on outcome and position_type
  const toWin = (outcome = contract?.outcome, positionType = contract?.position_type) => {
    if (!contract?.stake || (!contract?.odds && !contract?.percentage)) return "0.00";

    const stake = Number(contract.stake);
    const odds = Number(contract.odds || contract.percentage); // Fallback to percentage for legacy contracts

    if (positionType === "sell") {
      return stake.toFixed(2); // Creator (seller) wins their stake if outcome is false
    }
    return (stake * (odds - 1)).toFixed(2); // Accepter (buyer) wins stake * (odds - 1) if outcome is true
  };

  return {
    contract,
    formatStatus,
    formatDate,
    accepterStake,
    toWin,
  };
};

export default useContractDetails;