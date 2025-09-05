// src/utils/validation.js
import QRCode from "qrcode";
import dashcore from "@dashevo/dashcore-lib";

const validBase58Chars = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;

console.log("validation.js: Loaded dashcore object:", dashcore);

const generateQRCodeForSigning = async (address, network) => {
  try {
    const message = `SettleInDash:${address}`;
    const qrCode = await QRCode.toDataURL(message);
    return qrCode;
  } catch (err) {
    console.error(`generateQRCodeForSigning: ${err.message}`);
    throw new Error("Failed to generate QR code");
  }
};

export const validateWalletAddress = async (address, network = "testnet", signature = null) => {
  if (!address || address.length !== 34 || !validBase58Chars.test(address)) {
    return { isValid: false, message: "Invalid wallet address", qrCode: null };
  }

  const validPrefixes = { testnet: ["y", "x"], mainnet: ["X"] };
  if (!validPrefixes[network].includes(address[0])) {
    return { isValid: false, message: `Invalid prefix for ${network}`, qrCode: null };
  }

  if (!signature) {
    const qrCode = await generateQRCodeForSigning(address, network);
    return {
      isValid: false,
      message: `Sign 'SettleInDash:${address}' in your Dash wallet`,
      qrCode,
    };
  }

  try {
    const message = `SettleInDash:${address}`;
    const publicKey = dashcore.PublicKey.fromAddress(new dashcore.Address(address, network));
    if (!dashcore.Message(message).verify(publicKey, signature)) {
      throw new Error("Invalid signature");
    }
    console.log(`validateWalletAddress: Verified for ${address}`);
    return { isValid: true, message: "", qrCode: null };
  } catch (err) {
    console.error(`validateWalletAddress: ${err.message}`);
    return { isValid: false, message: `Verification failed: ${err.message}`, qrCode: null };
  }
};

export const validateContractCreation = async (data, event) => {
  const errors = [];
  // ... (existing logic unchanged)
  return { isValid: errors.length === 0, message: errors.join(". "), qrCode: null };
};

export const validateEventCreation = async (data) => {
  const errors = [];
  // ... (existing logic unchanged)
  return { isValid: errors.length === 0, message: errors.join(". "), qrCode: null };
};