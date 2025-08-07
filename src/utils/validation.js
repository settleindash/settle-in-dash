// src/utils/validation.js
// Utility functions for validating contract and event-related data

const validBase58Chars = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;

/**
 * Validates a DASH wallet address.
 * - Must be 34 characters long.
 * - Must start with 'X'.
 * - Must contain only valid base58 characters.
 * @param {string} address - The wallet address to validate.
 * @returns {Object} { isValid: boolean, message: string } - Validation result and error message if invalid.
 */
export const validateWalletAddress = (address) => {
  if (!address) {
    console.log("validateWalletAddress: Address is empty");
    return { isValid: false, message: "Wallet address is required" };
  }
  if (address.length !== 34) {
    console.log(`validateWalletAddress: Invalid length: ${address.length}`);
    return { isValid: false, message: "Wallet address must be 34 characters long" };
  }
  if (!address.startsWith("X")) {
    console.log("validateWalletAddress: Does not start with 'X'");
    return { isValid: false, message: "Wallet address must start with 'X'" };
  }
  if (!validBase58Chars.test(address)) {
    console.log(`validateWalletAddress: Invalid characters in: ${address}`);
    return { isValid: false, message: "Wallet address contains invalid characters" };
  }
  console.log(`validateWalletAddress: Valid address: ${address}`);
  return { isValid: true, message: "" };
};

/**
 * Validates contract creation data against event details.
 * @param {Object} data - Contract creation data (eventId, outcome, positionType, stake, percentage, walletAddress, acceptanceDeadline).
 * @param {Object} event - The selected event object.
 * @returns {Object} { isValid: boolean, message: string } - Validation result and combined error message if invalid.
 */
export const validateContractCreation = (data, event) => {
  const errors = [];

  if (!data.eventId || !event) {
    errors.push("Please select an event");
  }
  if (!data.outcome) {
    errors.push("Please select an outcome");
  }
  if (!data.positionType) {
    errors.push("Please select a position type (buy or sell)");
  }
  if (isNaN(data.stake) || Number(data.stake) < 1) {
    errors.push("Stake must be at least 1 DASH");
  }
  if (isNaN(data.percentage) || Number(data.percentage) <= 1) {
    errors.push("Odds must be greater than 1");
  }
  const walletValidation = validateWalletAddress(data.walletAddress);
  if (!walletValidation.isValid) {
    errors.push(walletValidation.message);
  }
  if (!data.acceptanceDeadline) {
    errors.push("Acceptance deadline is required");
  } else {
    const eventTime = new Date(event.event_date);
    const deadline = new Date(`${data.acceptanceDeadline}:00+02:00`);
    if (isNaN(deadline.getTime())) {
      errors.push("Invalid acceptance deadline");
    } else if (deadline > eventTime) {
      errors.push("Acceptance deadline must be before or on the event time");
    } else if (deadline <= new Date(Date.now() + 5 * 60 * 1000)) {
      errors.push("Acceptance deadline must be at least 5 minutes in the future");
    }
  }
  const outcomes = JSON.parse(event.possible_outcomes || "[]") || event.possible_outcomes?.split(",") || [];
  if (!outcomes.includes(data.outcome)) {
    errors.push("Outcome must be valid for the selected event");
  }

  return {
    isValid: errors.length === 0,
    message: errors.length > 0 ? errors.join(". ") : "",
  };
};

/**
 * Validates event creation data.
 * @param {Object} data - Event creation data (title, category, eventDate, possibleOutcomes, oracleSource, eventWalletAddress).
 * @returns {Object} { isValid: boolean, message: string } - Validation result and combined error message if invalid.
 */
export const validateEventCreation = (data) => {
  const errors = [];

  if (!data.title || data.title.length > 255) {
    errors.push("Title must be non-empty and less than 255 characters");
  }
  if (!data.category) {
    errors.push("Category is required");
  }
  if (!data.eventDate) {
    errors.push("Event date is required");
  } else {
    const eventTime = new Date(`${data.eventDate}:00+02:00`);
    if (isNaN(eventTime.getTime())) {
      errors.push("Invalid event date format");
    } else if (eventTime <= new Date(Date.now() + 5 * 60 * 1000)) {
      errors.push("Event date must be at least 5 minutes in the future");
    }
  }
  const validOutcomes = data.possibleOutcomes.filter(outcome => outcome.trim() !== "");
  if (validOutcomes.length < 2) {
    errors.push("At least two non-empty outcomes are required");
  }
  if (data.oracleSource && data.oracleSource.length > 255) {
    errors.push("Oracle source must be less than 255 characters");
  }
  const walletValidation = validateWalletAddress(data.eventWalletAddress);
  if (!walletValidation.isValid) {
    errors.push(walletValidation.message);
  }

  return {
    isValid: errors.length === 0,
    message: errors.length > 0 ? errors.join(". ") : "",
  };
};