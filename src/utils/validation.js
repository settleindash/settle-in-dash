export const parseOutcomes = (outcomes) => {
  if (!outcomes) return [];
  try {
    if (typeof outcomes === "string") {
      const decoded = JSON.parse(outcomes);
      if (Array.isArray(decoded)) return decoded;
      return outcomes.split(",").map((o) => o.trim()).filter((o) => o !== "");
    } else if (Array.isArray(outcomes)) {
      return outcomes.filter((o) => o !== "");
    }
    return [];
  } catch (error) {
    console.error("parseOutcomes: Failed to parse outcomes:", outcomes, error);
    return typeof outcomes === "string" ? outcomes.split(",").map((o) => o.trim()).filter((o) => o !== "") : [];
  }
};

export const validateEventCreation = async (data) => {
  const { title, category, event_date, possible_outcomes, oracle_source, event_wallet_address, signature } = data;
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

  // Validate oracle_source
  if (oracle_source && oracle_source.length > 255) {
    errors.push("Oracle source must be 255 characters or less");
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

  if (data.walletAddress && data.signature) {
    const walletValidation = await validateWalletAddress(data.walletAddress, "testnet", data.signature);
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


export const validateWalletAddress = async (address, network, signature = null, isEvent = false) => {
  if (!address || !/^y[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(address)) {
    console.error("validateWalletAddress: Invalid DASH testnet wallet address format:", address);
    return { isValid: false, message: "Invalid DASH testnet wallet address. Must be 26-35 characters starting with 'y'." };
  }

  if (!signature) {
    try {
      const qrCode = await QRCode.toDataURL(`signmessage:${address}:SettleInDash:${address}:`);
      return { isValid: false, qrCode, message: "Please sign the message with your wallet." };
    } catch (err) {
      console.error("validateWalletAddress: QR code generation failed:", err);
      return { isValid: false, message: "Failed to generate QR code for signing." };
    }
  }

  try {
    const endpoint = isEvent
      ? "https://settleindash.com/api/events.php"
      : "https://settleindash.com/api/contracts.php";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "verify-signature",
        data: {
          address,
          message: `SettleInDash:${address}`,
          signature,
        },
      }),
    });
    const responseText = await response.text();
    console.log("validateWalletAddress: Request:", {
      action: "verify-signature",
      data: { address, message: `SettleInDash:${address}`, signature },
    });
    console.log("validateWalletAddress: Response:", responseText, "status:", response.status);
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status} - ${responseText}`);
    }
    const result = JSON.parse(responseText);
    if (result.isValid) {
      return { isValid: true, message: "Wallet address and signature validated." };
    } else {
      console.error("validateWalletAddress: Signature verification failed:", result.message);
      return { isValid: false, message: result.message || "Invalid signature." };
    }
  } catch (err) {
    console.error("validateWalletAddress: Backend verification failed:", err);
    return { isValid: false, message: "Failed to verify wallet address: " + err.message };
  }
};