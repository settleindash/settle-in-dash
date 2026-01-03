
// src/utils/validation.js


export const SIGNATURE_MESSAGE_PREFIX = "SettleInDash:";

export const parseOutcomes = (outcomes) => {
  if (!outcomes) return [];
  try {
    if (Array.isArray(outcomes)) {
      return outcomes.map(o => String(o).trim()).filter(o => o);
    }
    if (typeof outcomes === "string") {
      const parsed = JSON.parse(outcomes);
      if (Array.isArray(parsed)) {
        return parsed.map(o => String(o).trim()).filter(o => o);
      }
      return outcomes.split(",").map(o => o.trim()).filter(o => o);
    }
  } catch (error) {
    console.error("parseOutcomes error:", error, outcomes);
  }
  return [];
};

export const validateEventCreation = async (data) => {
  const { title, category, event_date, possible_outcomes, event_wallet_address, signature } = data;
  console.log("validateEventCreation: Validating data:", data);
  const errors = [];

  // Check required fields
  const requiredFields = ['title', 'category', 'event_date', 'possible_outcomes', 'event_wallet_address'];
  requiredFields.forEach((field) => {
    if (!data[field] || (typeof data[field] === "string" && data[field].trim() === "")) {
      errors.push(`Missing or empty required field: ${field}`);
    }
  });

  // Validate title
  if (title && title.length > 255) {
    errors.push("Title must be 255 characters or less");
  }

  // Validate category
  if (category && category.length > 100) {
    errors.push("Category must be 100 characters or less");
  }

  // Validate event_date
  if (event_date) {
    try {
      const eventDateObj = new Date(event_date);
      const now = new Date();
      if (eventDateObj <= new Date(now.getTime() + 5 * 60 * 1000)) {
        errors.push("Event date must be at least 5 minutes in the future");
      }
    } catch (err) {
      errors.push("Invalid event date format");
    }
  }

  // Validate possible_outcomes
  if (possible_outcomes) {
    const outcomesArray = parseOutcomes(possible_outcomes);
    if (!Array.isArray(outcomesArray) || outcomesArray.length < 2) {
      errors.push("At least two non-empty outcomes are required");
    }
  }

  // Validate event_wallet_address
  if (event_wallet_address && !/^y[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(event_wallet_address)) {
    errors.push("Invalid Dash testnet wallet address (must start with 'y', 26-35 characters)");
  }

  // Validate signature format (optional, basic check)
  if (signature && !/^[A-Za-z0-9+\/=]+$/.test(signature)) {
    errors.push("Invalid signature format (must be base64)");
  }

  console.log("validateEventCreation: Validation result:", {
    isValid: errors.length === 0,
    message: errors.length > 0 ? errors.join(". ") : "",
  });
  return {
    isValid: errors.length === 0,
    message: errors.length > 0 ? errors.join(". ") : "",
  };
};


// Add this new function
export const validateWalletAddress = (address) => {
  if (!address || typeof address !== 'string') {
    return {
      isValid: false,
      message: "Wallet address is required and must be a string"
    };
  }

  if (!/^y[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(address)) {
    return {
      isValid: false,
      message: "Wallet address format looks invalid (must start with 'y', 26-35 characters)"
    };
  }

  return {
    isValid: true,
    message: ""
  };
};


export const validateContractCreation = async (data, selectedEvent) => {
  const errors = [];

  const requiredFields = ['eventId', 'outcome', 'positionType', 'stake', 'odds', 'walletAddress', 'expiration_date', 'signature'];
  requiredFields.forEach((field) => {
    if (!data[field] || (typeof data[field] === "string" && data[field].trim() === "")) {
      errors.push(`Missing or empty required field: ${field}`);
    }
  });

  if (data.eventId && !selectedEvent) {
    errors.push("Selected event not found");
  }

  if (data.outcome && selectedEvent) {
    const outcomes = parseOutcomes(selectedEvent.possible_outcomes);
    if (!outcomes.includes(data.outcome)) {
      errors.push("Invalid outcome: not in event's possible outcomes");
    }
  }

  if (data.positionType && !['buy', 'sell'].includes(data.positionType)) {
    errors.push("Invalid position type: must be 'buy' or 'sell'");
  }

  if (data.stake && (!isFinite(data.stake) || Number(data.stake) <= 0)) {
    errors.push("Invalid stake: must be a positive number");
  }

  if (data.odds && (!isFinite(data.odds) || Number(data.odds) <= 1)) {
    errors.push("Invalid odds: must be greater than 1");
  }

  if (data.expiration_date && selectedEvent) {
    try {
      const expiration = new Date(data.expiration_date);
      const eventDate = new Date(selectedEvent.event_date);
      const now = new Date();
      if (expiration <= now || expiration > eventDate) {
        errors.push("Expiration date must be after now and before or on event date");
      }
    } catch (err) {
      errors.push("Invalid expiration date format");
    }
  }

  if (data.walletAddress) {
    const walletValidation = validateWalletAddress(data.walletAddress);
    if (!walletValidation.isValid) {
      errors.push(walletValidation.message);
    }
  }

  return {
    isValid: errors.length === 0,
    message: errors.length > 0 ? errors.join(". ") : "",
  };
};


export const validateDashPublicKey = (publicKey) => {
  if (
    !publicKey ||
    !(
      /^(02|03)[0-9a-fA-F]{64}$/.test(publicKey) ||
      /^04[0-9a-fA-F]{128}$/.test(publicKey)
    )
  ) {
    console.error("constants: Invalid DASH public key:", publicKey);
    return false;
  }
  return true;
};


export const formatCustomDate = (dateString) => {
  if (!dateString) return "Not set";

  // Force UTC parsing by adding 'Z' (handles both space and T formats)
  const utcString = dateString.replace(' ', 'T') + (dateString.includes('Z') ? '' : 'Z');
  const date = new Date(utcString);

  if (isNaN(date.getTime())) return "Invalid date";

  return date.toLocaleString(undefined, {
    dateStyle: "medium",   // e.g. "Jan 20, 2026"
    timeStyle: "short",    // e.g. "21:00"
  });
};