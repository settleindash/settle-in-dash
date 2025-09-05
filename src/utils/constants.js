// src/utils/constants.js
// Constants for Settle In DASH, including wallet addresses and oracle public keys.

// Current network environment
export const NETWORK = "testnet"; // Change to "mainnet" for production

// Validate DASH address format (starts with 'X' for mainnet, 'y' or '8' for testnet, 34 chars, alphanumeric)
export const validateDashAddress = (address) => {
  const isValid = /^[Xy8][1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
  if (!isValid) {
    console.error("constants: Invalid DASH wallet address:", address);
  }
  return isValid;
};

// Validate DASH public key format (33-byte compressed or 65-byte uncompressed, hex)
export const validateDashPublicKey = (publicKey) => {
  const isValid = /^(02|03)[0-9a-fA-F]{64}$|^04[0-9a-fA-F]{128}$/.test(publicKey);
  if (!isValid) {
    console.error("constants: Invalid DASH public key:", publicKey);
  }
  return isValid;
};

// Settle In DASH wallet addresses for 2% fee collection
const SETTLE_IN_DASH_WALLET_ADDRESSES = {
  testnet: "ydthMaehov16aYgffPEHwRfrJNWsfbAxZT", // Testnet fee collection address
  mainnet: "XwamYYgoEDjKFVQfL5GTv65bjpXc72H8Cd", // Mainnet fee collection address
};

// Oracle public keys for Grok
const ORACLE_PUBLIC_KEYS = {
  testnet: "027592a6499c3bb8a505c9e1995f71dddf20019a28596dd9069889881564f9b860", // Testnet oracle public key
  mainnet: "027b12405c28f86ee0dbf0806c465df9c6475cf8e54fa632cd7a326ad49bfbecbe", // Mainnet oracle public key
};

// Get the appropriate wallet address and public key based on NETWORK
export const SETTLE_IN_DASH_WALLET = SETTLE_IN_DASH_WALLET_ADDRESSES[NETWORK];
export const ORACLE_PUBLIC_KEY = ORACLE_PUBLIC_KEYS[NETWORK];

// Validate wallet addresses and public keys on import
Object.values(SETTLE_IN_DASH_WALLET_ADDRESSES).forEach((address, index) => {
  if (!validateDashAddress(address)) {
    console.error(`constants: Invalid DASH wallet address for ${Object.keys(SETTLE_IN_DASH_WALLET_ADDRESSES)[index]}: ${address}`);
  }
});

Object.values(ORACLE_PUBLIC_KEYS).forEach((publicKey, index) => {
  if (!validateDashPublicKey(publicKey)) {
    console.error(`constants: Invalid DASH public key for ${Object.keys(ORACLE_PUBLIC_KEYS)[index]}: ${publicKey}`);
  }
});