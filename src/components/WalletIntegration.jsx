// src/components/WalletIntegration.jsx
import { useState } from "react";
import { useContracts } from "../hooks/useContracts.js";
import { useConstants } from "../hooks/useConstants.js";
import PageHeader from "../utils/formats/PageHeader.jsx";
import QRCode from "qrcode";

const WalletIntegration = () => {
  // Load constants (NETWORK, etc.)
  const { constants, loading: constLoading, error: constError } = useConstants();
  const { settleContract, triggerTwist, contractsLoading } = useContracts();

  // UI State
  const [walletAddress, setWalletAddress] = useState("");
  const [signature, setSignature] = useState("");
  const [manualSignature, setManualSignature] = useState("");
  const [walletQrCodeUrl, setWalletQrCodeUrl] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isWalletConnected, setIsWalletConnected] = useState(false);

  // Show loading/error while constants load
  if (constLoading) return <div className="text-center p-4">Loading configuration…</div>;
  if (constError) return <div className="text-red-500 text-center p-4">Error: {constError}</div>;
  if (!constants) return null;

  const { NETWORK } = constants;

  // Generate QR code for signing
  const connectWallet = async () => {
    if (!walletAddress) return setError("Please enter your DASH wallet address");
    if (!/^y[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(walletAddress))
      return setError(`Invalid Dash ${NETWORK} wallet address`);

    try {
      setLoading(true);
      const url = await QRCode.toDataURL(`signmessage:${walletAddress}:SettleInDash:${walletAddress}:`);
      setWalletQrCodeUrl(url);
      setMessage(
        `Scan the QR code or sign the message 'SettleInDash:${walletAddress}' in Dash Core (Tools &gt; Sign Message).`
      );
    } catch (err) {
      setError("Failed to generate QR code: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Verify pasted signature
  const verifySignature = async () => {
    if (!manualSignature) return setError("Please paste your signature");

    try {
      setLoading(true);
      const response = await fetch("https://settleindash.com/api/contracts.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify-signature",
          data: {
            address: walletAddress,
            message: `SettleInDash:${walletAddress}`,
            signature: manualSignature,
          },
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (result.isValid) {
        setSignature(manualSignature);
        setIsWalletConnected(true);
        setMessage("Wallet connected and verified!");
        setManualSignature("");
        setWalletQrCodeUrl(null);
      } else {
        setError(result.message || "Invalid signature");
      }
    } catch (err) {
      setError("Verification failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Contract actions
  const handleSettle = async (contractId) => {
    if (!signature) return setError("Wallet not connected");
    try {
      const result = await settleContract(contractId, {
        fee_recipient: walletAddress,
        signature,
      });
      setMessage(result.success ? "Settled!" : result.error);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleTwist = async (contractId) => {
    if (!signature) return setError("Wallet not connected");
    try {
      const result = await triggerTwist(contractId, {
        wallet_address: walletAddress,
        signature,
      });
      setMessage(result.success ? "Twist triggered!" : result.error);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <PageHeader title="Wallet Integration" />
      <div className="max-w-3xl mx-auto mt-6 bg-white p-6 rounded-lg shadow">

        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          Connect Your DASH Wallet
        </h2>

        {/* Wallet Address */}
        <div className="mb-6">
          <label htmlFor="wallet" className="block text-sm font-medium text-gray-600">
            DASH Wallet Address
          </label>
          <input
            id="wallet"
            type="text"
            className="border p-2 rounded w-full mt-1 text-sm"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder={`Enter ${NETWORK} address (starts with 'y')`}
            disabled={isWalletConnected || loading}
          />
        </div>

        {/* Connect Button */}
        <button
          onClick={connectWallet}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
          disabled={isWalletConnected || loading}
        >
          {isWalletConnected
            ? `Connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
            : "Connect & Sign"}
        </button>

        {/* QR Code + Manual Signature */}
        {walletQrCodeUrl && !isWalletConnected && (
          <div className="mt-6 p-4 border rounded bg-gray-50">
            <p className="text-sm text-gray-700 mb-3">
              Sign the message <code>SettleInDash:{walletAddress}</code> in Dash Core.
            </p>
            <img src={walletQrCodeUrl} alt="Sign QR Code" className="w-64 h-64 mx-auto" />

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Paste Signature:
              </label>
              <input
                type="text"
                className="border p-2 rounded w-full text-sm mb-2"
                value={manualSignature}
                onChange={(e) => setManualSignature(e.target.value)}
                placeholder="Paste base64 signature here"
                disabled={loading}
              />
              <button
                onClick={verifySignature}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 text-sm"
                disabled={loading}
              >
                Verify Signature
              </button>
            </div>
          </div>
        )}

        {/* Messages */}
        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
        {message && <p className="text-green-500 text-sm mt-3">{message}</p>}
        {loading && <p className="text-blue-500 text-sm mt-3">Processing…</p>}

        {/* Contract Actions */}
        {isWalletConnected && (
          <div className="mt-8 pt-6 border-t">
            <h3 className="text-md font-semibold text-gray-700 mb-3">
              Contract Actions
            </h3>
            <div className="space-x-2">
              <button
                onClick={() => handleSettle("example_contract_id")}
                className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 text-sm"
                disabled={contractsLoading}
              >
                Settle Contract
              </button>
              <button
                onClick={() => handleTwist("example_contract_id")}
                className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 text-sm"
                disabled={contractsLoading}
              >
                Trigger Twist
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WalletIntegration;