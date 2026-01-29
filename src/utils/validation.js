
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

 // ────────────────────────────────────────────────────────────────
  // Fixed date validation – handles UTC vs local correctly
  // ────────────────────────────────────────────────────────────────
  if (data.expiration_date && selectedEvent) {
    try {
      // 1. Event date from database → explicitly treat as UTC
      let eventStr = selectedEvent.event_date.trim().replace(/\s+/g, 'T');
      if (!eventStr.includes('Z')) eventStr += 'Z';
      const eventDateUTC = new Date(eventStr);

      // 2. Expiration from <input type="datetime-local"> → local time
      let expStr = data.expiration_date.trim();
      // Add :00 seconds if user didn't select them (very common)
      if (expStr.length === 16) expStr += ':00';
      const expirationLocal = new Date(expStr);

      const now = new Date();

       // ── ADD THESE LOGS ─────────────────────────────────────────────
    console.log("=== DATE VALIDATION DEBUG ===");
    console.log("Event raw (DB)             :", selectedEvent.event_date);
    console.log("Event UTC ISO              :", eventDateUTC.toISOString());
    console.log("Event local display        :", eventDateUTC.toLocaleString(undefined, {dateStyle:"medium", timeStyle:"short"}));
    console.log("Expiration raw (input)     :", data.expiration_date);
    console.log("Expiration local ISO       :", expirationLocal.toISOString());           // ← this should be ~19:00Z if you picked 20:00 CET
    console.log("Expiration local string    :", expirationLocal.toLocaleString());
    console.log("Now (local)                :", now.toLocaleString());
    console.log("expirationLocal.getTime()  :", expirationLocal.getTime());
    console.log("eventDateUTC.getTime()     :", eventDateUTC.getTime());
    console.log("Difference (exp - event) ms:", expirationLocal.getTime() - eventDateUTC.getTime());
    console.log("Should allow?              :", expirationLocal.getTime() <= eventDateUTC.getTime() ? "YES" : "NO");
    console.log("=== END DEBUG ===");
    // ────────────────────────────────────────────────────────────────

  

      if (isNaN(eventDateUTC.getTime()) || isNaN(expirationLocal.getTime())) {
        errors.push("Invalid date format for expiration or event date");
      } else {
        // Must be in the future (compared in local time for user intuition)
        if (expirationLocal <= now) {
          errors.push("Expiration date must be in the future");
        }

        // Core fix: compare UTC timestamps (same moment in time)
        if (expirationLocal.getTime() > eventDateUTC.getTime()) {
          // Show correct event time in user's local timezone
          const eventLocal = eventDateUTC.toLocaleString(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          });
          errors.push(
            `Expiration date must be before or on the event time (${eventLocal}) in your local timezone`
          );
        }
      }
    } catch (err) {
      errors.push(`Invalid expiration date format: ${err.message}`);
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


export const getLocalDateString = (utcDateString) => {
  if (!utcDateString) return undefined;

  // Force parse as UTC
  const utcDate = new Date(utcDateString.replace(' ', 'T') + 'Z');
  if (isNaN(utcDate.getTime())) return undefined;

  // toLocaleString parts in user's timezone
  const options = {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };

  const formatter = new Intl.DateTimeFormat(undefined, options);
  const parts = formatter.formatToParts(utcDate);

  const map = {};
  parts.forEach(({type, value}) => { map[type] = value; });

  const year    = map.year;
  const month   = map.month.padStart(2, '0');
  const day     = map.day.padStart(2, '0');
  const hours   = map.hour.padStart(2, '0');
  const minutes = map.minute.padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};