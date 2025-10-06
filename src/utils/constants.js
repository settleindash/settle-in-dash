// src/utils/constants.js
// Constants for Settle In DASH, including network and validation utilities.

export const NETWORK = "testnet"; // Change to "mainnet" for production
export const SIGNATURE_MESSAGE_PREFIX = "SettleInDash:";

// Validate DASH public key format (33-byte compressed or 65-byte uncompressed, hex)
export const validateDashPublicKey = (publicKey) => {
  if (!publicKey || !/^(02|03)[0-9a-fA-F]{64}$|^04[0-9a-fA-F]{128}$/.test(publicKey)) {
    console.error("constants: Invalid DASH public key format:", publicKey);
    return false;
  }
  return true; // Regex-based validation, no dashcore needed
};

// Fetch constants from backend
export const fetchConstants = async () => {
  try {
    const response = await fetch("https://settleindash.com/api/contracts.php?action=get-constants", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Failed to fetch constants");
    }
    return result;
  } catch (err) {
    console.error("constants: Error fetching constants:", err);
    return {
      SETTLE_IN_DASH_WALLET: "",
      ORACLE_PUBLIC_KEY: "",
    };
  }
};