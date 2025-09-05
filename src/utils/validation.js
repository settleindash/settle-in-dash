// src/utils/validation.js
// Utility functions for validating contract and event-related data

import Dash from "dash";
import QRCode from "qrcode";
import dashcore from "@dashevo/dashcore-lib"; // Direct import

const validBase58Chars = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;

// Initialize dashcore
dashcore.configure();
console.log("validation.js: Loaded and initialized dashcore object:", dashcore);

/**
 * Generates a QR code with the message to be signed for wallet verification.
 * @param {string} address - The wallet address to validate.
 * @param {string} network - The network to validate against.
 * @returns {Promise<string>} QR code data URL.
 */
const generateQRCodeForSigning = async (address, network) => {
  try {
    const message = `SettleInDash:${address}`;
    const qrData = message; // Plain message for signing
    const qrCode = await QRCode.toDataURL(qrData);
    return qrCode;
  } catch (err) {
    console.error(`generateQRCodeForSigning: Failed to generate QR code for ${address}: ${err.message}`);
    throw new Error("Failed to generate QR code");
  }
};

/**
 * Validates a DASH wallet address using QR code or manual signature.
 * - Generates a QR code with the message 'SettleInDash:<address>' to be signed.
 * - Verifies the signature if provided.
 * @param {string} address - The wallet address to validate.
 * @param {string} [network="testnet"] - The network to validate against.
 * @param {string} [signature] - The signature returned from the wallet scan or manual input.
 * @returns {Promise<Object>} { isValid: boolean, message: string, qrCode: string } - Validation result, message, and QR code.
 */
export const validateWalletAddress = async (address, network = "testnet", signature = null) => {
  if (!address) {
    console.log("validateWalletAddress: Address is empty");
    return { isValid: false, message: "Wallet address is required", qrCode: null };
  }
  if (address.length !== 34) {
    console.log(`validateWalletAddress: Invalid length: ${address.length}`);
    return { isValid: false, message: "Wallet address must be 34 characters long", qrCode: null };
  }
  if (!validBase58Chars.test(address)) {
    console.log(`validateWalletAddress: Invalid characters in: ${address}`);
    return { isValid: false, message: "Wallet address contains invalid characters", qrCode: null };
  }

  const validPrefixes = {
    testnet: ["y", "x"],
    mainnet: ["X"],
  };
  const prefix = address[0];
  if (!validPrefixes[network].includes(prefix)) {
    console.log(`validateWalletAddress: Invalid prefix '${prefix}' for ${network}`);
    return { isValid: false, message: `Wallet address must start with ${validPrefixes[network].join(" or ")} for ${network}`, qrCode: null };
  }

  if (!signature) {
    try {
      const qrCode = await generateQRCodeForSigning(address, network);
      console.log(`validateWalletAddress: Generated QR code for ${address}`);
      return {
        isValid: false,
        message: `Please sign the message 'SettleInDash:${address}' in your Dash wallet. For iPhone users, use a desktop wallet like Dash Core (Tools > Sign Message) or export your private key to sign manually.`,
        qrCode,
      };
    } catch (err) {
      console.error(`validateWalletAddress: QR code generation failed: ${err.message}`);
      return { isValid: false, message: "Failed to generate QR code", qrCode: null };
    }
  }

  try {
    // Debug: Log the dashcore object and its PublicKey property
    console.log("validateWalletAddress: Using dashcore object:", dashcore);
    console.log("validateWalletAddress: dashcore.PublicKey:", dashcore.PublicKey);

    // Check if PublicKey.fromAddress is available
    if (!dashcore.PublicKey || typeof dashcore.PublicKey.fromAddress !== "function") {
      // Fallback: Use Address and attempt verification with signature
      const message = `SettleInDash:${address}`;
      const addressObj = new dashcore.Address(address, network);
      // Note: Direct public key derivation from address alone is not possible without the private key or signature context
      // Rely on signature verification with the address
      const isValidSignature = dashcore.Message(message).verify(addressObj, signature); // This may not work directly; adjust below
      if (!isValidSignature) {
        throw new Error("Invalid signature or incompatible API for address verification");
      }
      console.log(`validateWalletAddress: Signature verified for ${address} using address object`);
      return { isValid: true, message: "", qrCode: null };
    }

    // Original logic if fromAddress is available
    const message = `SettleInDash:${address}`;
    const publicKey = dashcore.PublicKey.fromAddress(new dashcore.Address(address, network));
    const isValidSignature = dashcore.Message(message).verify(publicKey, signature);
    if (!isValidSignature) {
      throw new Error("Invalid signature");
    }
    console.log(`validateWalletAddress: Signature verified for ${address}`);
    return { isValid: true, message: "", qrCode: null };
  } catch (err) {
    console.error(`validateWalletAddress: Signature verification failed: ${err.message}`);
    return {
      isValid: false,
      message: `Failed to verify wallet address signature: ${err.message}. Please ensure you're using a compatible version of @dashevo/dashcore-lib (e.g., 6.0.2) or check the signature. Current version: ${dashcore.version}`,
      qrCode: null,
    };
  }
};

/**
 * Validates contract creation data against event details.
 * @param {Object} data - Contract creation data (eventId, outcome, positionType, stake, odds, walletAddress, acceptanceDeadline, signature).
 * @param {Object} event - The selected event object.
 * @returns {Promise<Object>} { isValid: boolean, message: string, qrCode: string } - Validation result, message, and QR code if needed.
 */
export const validateContractCreation = async (data, event) => {
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
  if (isNaN(data.odds) || Number(data.odds) <= 1) {
    errors.push("Odds must be greater than 1");
  }
  if (!data.walletAddress) {
    console.log("validateContractCreation: walletAddress is missing in data:", data);
    errors.push("Wallet address is required");
  } else {
    const walletValidation = await validateWalletAddress(data.walletAddress, "testnet", data.signature);
    if (!walletValidation.isValid) {
      errors.push(walletValidation.message);
      return { isValid: false, message: walletValidation.message, qrCode: walletValidation.qrCode };
    }
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
    qrCode: null,
  };
};

/**
 * Validates event creation data.
 * @param {Object} data - Event creation data (title, category, eventDate, possibleOutcomes, oracleSource, eventWalletAddress, signature).
 * @returns {Promise<Object>} { isValid: boolean, message: string, qrCode: string } - Validation result, message, and QR code if needed.
 */
export const validateEventCreation = async (data) => {
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
  const validOutcomes = data.possibleOutcomes.filter((outcome) => outcome.trim() !== "");
  if (validOutcomes.length < 2) {
    errors.push("At least two non-empty outcomes are required");
  }
  if (data.oracleSource && data.oracleSource.length > 255) {
    errors.push("Oracle source must be less than 255 characters");
  }
  if (!data.eventWalletAddress) {
    console.log("validateEventCreation: eventWalletAddress is missing in data:", data);
    errors.push("Event wallet address is required");
  } else {
    const walletValidation = await validateWalletAddress(data.eventWalletAddress, "testnet", data.signature);
    if (!walletValidation.isValid) {
      errors.push(walletValidation.message);
      return { isValid: false, message: walletValidation.message, qrCode: walletValidation.qrCode };
    }
  }

  return {
    isValid: errors.length === 0,
    message: errors.length > 0 ? errors.join(". ") : "",
    qrCode: null,
  };
};