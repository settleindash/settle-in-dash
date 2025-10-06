// src/components/WalletIntegration.jsx
import { useState, useEffect, useRef } from "react";
import { useContracts } from "../hooks/useContracts";
import { validateWalletAddress } from "../utils/validation";
import { validateDashPublicKey, fetchConstants } from "../utils/constants";
import PageHeader from "../utils/formats/PageHeader.jsx";
import { Html5Qrcode } from "html5-qrcode";
import QRCode from "qrcode";

const WalletIntegration = () => {
  const [walletAddress, setWalletAddress] = useState("");
  const [signature, setSignature] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [transactionQrCode, setTransactionQrCode] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [constants, setConstants] = useState({ SETTLE_IN_DASH_WALLET: "", ORACLE_PUBLIC_KEY: "" });
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const qrReaderRef = useRef(null);
  const { settleContract, triggerTwist, contractsLoading } = useContracts();

  // Fetch constants on mount
  useEffect(() => {
    fetchConstants().then((result) => {
      setConstants(result);
      console.log("WalletIntegration: Fetched constants:", result);
    });
    return () => {
      if (qrReaderRef.current) {
        qrReaderRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const connectWallet = async () => {
    if (!walletAddress) {
      setError("Please enter a wallet address.");
      return;
    }
    try {
      const walletValidation = await validateWalletAddress(walletAddress, "testnet");
      if (walletValidation.isValid) {
        setIsWalletConnected(true);
        setMessage("Wallet connected successfully!");
        setTransactionQrCode(null);
      } else if (walletValidation.qrCode) {
        setTransactionQrCode(walletValidation.qrCode);
        setMessage(
          `Please sign the message 'SettleInDash:${walletAddress}' in Dash Core (Tools &gt; Sign Message).`
        );
        startQRScanner();
      } else {
        setError(walletValidation.message);
      }
      console.log("WalletIntegration: validateWalletAddress:", { walletAddress, qrCode: walletValidation.qrCode });
    } catch (err) {
      setError("Failed to connect wallet: " + err.message);
      console.error("WalletIntegration: Wallet connection error", err);
    }
  };

  const startQRScanner = async () => {
    if (!document.getElementById("qr-reader-wallet")) {
      setError("QR reader element not found. Please refresh the page.");
      return;
    }
    if (qrReaderRef.current) {
      qrReaderRef.current.stop().catch(() => {});
    }
    qrReaderRef.current = new Html5Qrcode("qr-reader-wallet");
    setIsScanning(true);
    try {
      await qrReaderRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          if (decodedText.startsWith("signmessage:")) {
            const [, address, message, sig] = decodedText.split(":");
            if (address === walletAddress && message === `SettleInDash:${walletAddress}`) {
              // Verify signature via backend
              const response = await fetch("https://settleindash.com/api/contracts.php?action=verify-signature", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address, message, signature: sig }),
              });
              const result = await response.json();
              if (result.isValid) {
                setSignature(sig);
                setMessage("Signature captured! Wallet connected.");
                setIsWalletConnected(true);
                qrReaderRef.current.stop().then(() => {
                  setIsScanning(false);
                  setTransactionQrCode(null);
                });
              } else {
                setError(result.message || "Invalid signature from QR code");
                qrReaderRef.current.stop().then(() => setIsScanning(false));
              }
            } else {
              setError("Invalid QR code: Address or message does not match");
              qrReaderRef.current.stop().then(() => setIsScanning(false));
            }
          } else {
            setError(
              `Invalid QR code format. Expected a signature for <code>SettleInDash:${walletAddress}</code>. Use Dash Core (Tools &gt; Sign Message).`
            );
            qrReaderRef.current.stop().then(() => setIsScanning(false));
          }
        },
        (error) => {
          console.warn("QR Scan error:", error);
          setError(`Failed to scan QR code: ${error}. Try signing in Dash Core.`);
        }
      );
    } catch (err) {
      setError(`Failed to start QR scanner: ${err.message}`);
      setIsScanning(false);
      console.error("WalletIntegration: QR scanner error", err);
    }
  };

  const handleSettleContract = async (contractId) => {
    if (!signature) {
      setError("Please connect and sign with your wallet first");
      return;
    }
    try {
      const result = await settleContract(contractId, {
        fee_recipient: walletAddress,
        signature,
      });
      if (result.success) {
        setMessage("Contract settled successfully!");
      } else {
        setError(result.error || "Failed to settle contract");
      }
    } catch (err) {
      setError("Failed to settle contract: " + err.message);
      console.error("WalletIntegration: Settle contract error", err);
    }
  };

  const handleTriggerTwist = async (contractId) => {
    if (!signature) {
      setError("Please connect and sign with your wallet first");
      return;
    }
    try {
      const result = await triggerTwist(contractId, {
        wallet_address: walletAddress,
        signature,
      });
      if (result.success) {
        setMessage("Twist triggered successfully!");
      } else {
        setError(result.error || "Failed to trigger twist");
      }
    } catch (err) {
      setError("Failed to trigger twist: " + err.message);
      console.error("WalletIntegration: Trigger twist error", err);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <PageHeader title="Wallet Integration" />
      <div className="max-w-3xl mx-auto mt-6 bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Connect Your DASH Wallet</h2>
        <div className="mb-6">
          <label htmlFor="walletAddress" className="block text-sm font-medium text-gray-600">
            Your DASH Wallet Address
          </label>
          <input
            id="walletAddress"
            type="text"
            className="border p-2 rounded w-full mt-1 text-sm"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="Enter a valid DASH address (starts with 'y' or 'X' for testnet)"
            disabled={isWalletConnected || contractsLoading}
            aria-label="Wallet address"
          />
        </div>
        <button
          onClick={connectWallet}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
          disabled={isWalletConnected || contractsLoading}
          aria-label="Connect wallet"
        >
          {isWalletConnected ? `Connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "Connect Wallet"}
        </button>
        {transactionQrCode && (
          <div className="mt-4">
            <p className="text-gray-700 text-sm mb-2">
              Scan this QR code to sign <code>SettleInDash:{walletAddress}</code> in Dash Core (Tools &gt; Sign Message).
            </p>
            <img src={transactionQrCode} alt="QR Code" className="w-64 h-64 mx-auto" />
            <button
              onClick={startQRScanner}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 text-sm mt-2"
              disabled={isScanning || contractsLoading}
              aria-label="Start QR Scan"
            >
              {isScanning ? "Scanning..." : "Start QR Scanner"}
            </button>
          </div>
        )}
        <div
          id="qr-reader-wallet"
          style={{ width: "300px", height: "300px", display: isScanning ? "block" : "none", margin: "0 auto" }}
        ></div>
        {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        {message && <p className="text-green-500 text-sm mt-2">{message}</p>}
        {isWalletConnected && (
          <div className="mt-6">
            <h3 className="text-md font-semibold text-gray-700 mb-2">Contract Actions</h3>
            <p className="text-sm text-gray-600 mb-2">
              Use your connected wallet to settle or trigger a twist for contracts.
            </p>
            <button
              onClick={() => handleSettleContract("example_contract_id")}
              className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 text-sm mr-2"
              disabled={contractsLoading}
              aria-label="Settle contract"
            >
              Settle Contract
            </button>
            <button
              onClick={() => handleTriggerTwist("example_contract_id")}
              className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 text-sm"
              disabled={contractsLoading}
              aria-label="Trigger twist"
            >
              Trigger Twist
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletIntegration;