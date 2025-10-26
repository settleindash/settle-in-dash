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
    const response = await fetch("https://settleindash.com/api/contracts.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "get_constants",
        api_key: "2edae9de6810a6d00fe0c6ff9fd3c40869d7c70b9ff7fef72aaf816dad8a9f2d",
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || `HTTP error: ${response.status}`);
    }
    if (!result.success) {
      throw new Error(result.error || "Failed to fetch constants");
    }
    console.log("constants: Fetched constants:", result.data);
    return {
      SETTLE_IN_DASH_WALLET: result.data.fee_address || "",
      ORACLE_PUBLIC_KEY: result.data.oracle_public_key || "",
      PLACEHOLDER_PUBLIC_KEY: result.data.placeholder_public_key || "",
    };
  } catch (err) {
    console.error("constants: Error fetching constants:", err);
    return {
      SETTLE_IN_DASH_WALLET: "",
      ORACLE_PUBLIC_KEY: "",
      PLACEHOLDER_PUBLIC_KEY: "",
    };
  }
};