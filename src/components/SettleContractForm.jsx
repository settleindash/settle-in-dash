// src/components/SettleContractForm.jsx
// Improved: Outcome selection → Wallet signature verification → Submit
// Matches ContractCard style: grey box, QR/manual sign, validation

import { useState, useMemo, useEffect } from "react";
import { useEvents } from "../hooks/useEvents";
import QRCode from "qrcode";

const SettleContractForm = ({
  selectedContractId,
  filteredContracts,
  settleContract,
  setSelectedContract,
  setError,
  error,
}) => {
  const { parseOutcomes } = useEvents();

  const [claimedOutcome, setClaimedOutcome] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [signature, setSignature] = useState("");
  const [manualSignature, setManualSignature] = useState("");
  const [walletConnected, setWalletConnected] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const contract = filteredContracts.find((c) => c.contract_id === selectedContractId);
  if (!contract) return <p className="text-red-500">Contract not found.</p>;

  const possibleOutcomes = useMemo(() => {
    return parseOutcomes(contract?.possible_outcomes || []);
  }, [contract, parseOutcomes]);

  // Wallet signature flow (same as ContractCard)
  const connectWallet = async () => {
    if (!walletAddress) return setError("Please enter your wallet address");
    if (!/^y[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(walletAddress)) {
      return setError("Invalid Dash wallet address");
    }

    // Check if user is creator or accepter
    if (walletAddress !== contract.WalletAddress && walletAddress !== contract.accepterWalletAddress) {
      return setError("You must use the creator or accepter wallet address");
    }

    setError("");
    try {
      setLoading(true);
      const url = await QRCode.toDataURL(`signmessage:${walletAddress}:SettleInDash:${walletAddress}:`);
      setQrCodeUrl(url);
    } catch (err) {
      setError("Failed to generate QR code");
    } finally {
      setLoading(false);
    }
  };

  const verifyManualSignature = async () => {
    if (!manualSignature) return setError("Please enter a signature");

    try {
      setLoading(true);
      const response = await fetch("https://settleindash.com/api/contracts.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify_signature",
          data: {
            address: walletAddress,
            message: `SettleInDash:${walletAddress}`,
            signature: manualSignature,
          },
        }),
      });
      const result = await response.json();

      if (result.isValid) {
        setSignature(manualSignature);
        setWalletConnected(true);
        setError("");
      } else {
        setError("Invalid signature");
      }
    } catch (err) {
      setError("Verification failed");
    } finally {
      setLoading(false);
    }
  };

 const handleSubmit = async () => {
  setShowConfirmation(false);

  if (!walletConnected || !signature) {
    setError("Please connect and sign with your wallet first");
    return;
  }

  // The exact message that was signed (must match what was used in connectWallet)
  const message = `SettleInDash:${walletAddress}`;

  const result = await settleContract(
    selectedContractId,
    claimedOutcome,
    reasoning,
    walletAddress,   // signer_address
    signature,       // ← Add this!
    message          // ← Add this!
  );

  if (result.success) {
    setSelectedContract(null);
    alert(result.message || "Outcome submitted successfully!");
  } else {
    setError(result.error || "Failed to submit outcome");
  }
};

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <h3 className="text-md font-semibold text-gray-700 mb-4">Settle This Contract</h3>

      <div className="space-y-6">
        {/* Outcome */}
        <div>
          <label className="text-md font-semibold text-gray-700 mb-3">Event Outcome</label>
          <select
            className="border p-2 rounded w-full"
            value={claimedOutcome}
            onChange={(e) => setClaimedOutcome(e.target.value)}
          >
            <option value="">Select the correct outcome</option>
            {possibleOutcomes.map((outcome) => (
              <option key={outcome} value={outcome}>
                {outcome}
              </option>
            ))}
          </select>
        </div>

        {/* Reasoning */}
        <div>
          <label className="text-md font-semibold text-gray-700 mb-3">Reasoning (optional)</label>
          <textarea
            className="border p-2 rounded w-full min-h-[100px]"
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            placeholder="Brief reason for your choice (e.g. 'Official source confirmed draw')"
            maxLength={500}
          />
          <p className="text-sm text-gray-500">{reasoning.length}/500 characters</p>
        </div>

        {/* Wallet Signature - same as ContractCard */}
        <div className="mb-6">
          <label className="block text-md font-bold text-gray-700 mb-2">Wallet Signature</label>
          {!walletConnected && (
            <div>
              <input
                type="text"
                className="border p-2 rounded w-full mb-2"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder="Enter your wallet address (creator or accepter)"
              />
              <button
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 text-sm w-full"
                onClick={connectWallet}
                disabled={loading || !walletAddress}
              >
                Connect & Sign
              </button>
              {qrCodeUrl && (
                <div className="mt-4">
                  <p className="text-sm text-gray-700 mb-2">
                    Sign <code>SettleInDash:{walletAddress}</code> in Dash Core
                  </p>
                  <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64 mx-auto" />
                  <input
                    type="text"
                    className="border p-2 rounded w-full mt-2"
                    value={manualSignature}
                    onChange={(e) => setManualSignature(e.target.value)}
                    placeholder="Paste signature here"
                  />
                  <button
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm w-full mt-2"
                    onClick={verifyManualSignature}
                    disabled={loading}
                  >
                    Verify Signature
                  </button>
                </div>
              )}
            </div>
          )}

          {walletConnected && (
            <p className="text-green-600 font-medium">
              Wallet connected & verified: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </p>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <button
            onClick={() => setSelectedContract(null)}
            className="flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            onClick={() => setShowConfirmation(true)}
            className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
            disabled={!claimedOutcome || !walletConnected}
          >
            Submit Outcome
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Confirm Submission</h3>
            <div className="space-y-2 text-sm mb-6">
              <p><strong>Claimed Outcome:</strong> {claimedOutcome}</p>
              <p><strong>Reasoning:</strong> {reasoning || "None"}</p>
            </div>
            <p className="text-sm text-red-600 mb-6">
              This cannot be undone. Are you sure?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-red-500 mt-4 text-sm">{error}</p>}
    </div>
  );
};

export default SettleContractForm;