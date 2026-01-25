// src/components/SettleContractForm.jsx
// Updated: Option A - Signed partial tx hex mandatory, no verification step

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
  const [selectedParty, setSelectedParty] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [unsignedHex, setUnsignedHex] = useState("");
  const [signedPartial, setSignedPartial] = useState("");
  const [walletConnected, setWalletConnected] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [message, setMessage] = useState("");

  const contract = filteredContracts.find((c) => c.contract_id === selectedContractId);
  if (!contract) return <p className="text-red-500">Contract not found.</p>;

  const possibleOutcomes = useMemo(() => {
    return parseOutcomes(contract?.possible_outcomes || []);
  }, [contract, parseOutcomes]);

  const partyOptions = [
    {
      value: "creator",
      label: `Creator: ${contract.WalletAddress}`,
      address: contract.WalletAddress,
    },
    {
      value: "accepter",
      label: `Accepter: ${contract.accepterWalletAddress || "Not yet accepted"}`,
      address: contract.accepterWalletAddress,
    },
  ];

  const handlePartyChange = (e) => {
    const party = e.target.value;
    setSelectedParty(party);
    const selected = partyOptions.find((opt) => opt.value === party);
    if (selected && selected.address) {
      setWalletAddress(selected.address);
      setError("");
    } else {
      setWalletAddress("");
      setError("Accepter wallet not set yet");
    }
  };

const connectWallet = async () => {
  if (!walletAddress) return setError("Please select your party");

  try {
    setLoading(true);

    console.log("[FRONTEND DEBUG] Calling generate_unsigned_settlement_tx via proxy");

    const partialRes = await fetch("https://settleindash.com/api/contracts.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "generate_unsigned_settlement_tx",
        data: {
          contract_id: selectedContractId,
          resolution: claimedOutcome,
        }
      }),
    });

    console.log("[FRONTEND DEBUG] Proxy status:", partialRes.status);

    if (!partialRes.ok) {
      const text = await partialRes.text();
      console.error("[FRONTEND DEBUG] Proxy error response:", text);
      throw new Error(`Proxy error ${partialRes.status}: ${text}`);
    }

    const partialData = await partialRes.json();
    console.log("[FRONTEND DEBUG] Proxy response:", partialData);

    if (!partialData.success) {
      throw new Error(partialData.error || "Backend failed to generate tx");
    }

    const unsigned = partialData.unsigned_tx_hex;
    setUnsignedHex(unsigned);

    const url = await QRCode.toDataURL(`signmessage:${walletAddress}:${unsigned}`);
    setQrCodeUrl(url);
    setMessage("Sign this transaction hex in your wallet");
  } catch (err) {
    console.error("[FRONTEND DEBUG] connectWallet failed:", err);
    setError("Failed to generate sign request: " + (err.message || "Unknown error"));
  } finally {
    setLoading(false);
  }
};

  const handleSubmit = async () => {
    setShowConfirmation(false);

    if (!walletConnected || !signedPartial.trim()) {
      setError("Please sign and paste the transaction hex first");
      return;
    }

    const result = await settleContract(
      selectedContractId,
      claimedOutcome,
      reasoning,
      walletAddress,
      signedPartial,  // signed partial tx hex
      `signmessage:${walletAddress}:${unsignedHex}` // optional
    );

    if (result.success) {
      setSelectedContract(null);
      alert(result.message || "Settlement submitted successfully!");
    } else {
      setError(result.error || "Failed to submit settlement");
    }
  };

  return (
    <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-5">Settle This Contract</h3>

      <div className="space-y-6">
        {/* Outcome */}
        <div>
          <label className="block text-base font-medium text-gray-700 mb-2">
            Event Outcome
          </label>
          <select
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          <label className="block text-base font-medium text-gray-700 mb-2">
            Reasoning (optional)
          </label>
          <textarea
            className="w-full border border-gray-300 rounded-lg p-3 min-h-[120px] focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            placeholder="Brief explanation for your choice..."
            maxLength={500}
          />
          <p className="text-sm text-gray-500 mt-1">{reasoning.length}/500 characters</p>
        </div>

        {/* Wallet selection */}
        <div>
          <label className="block text-base font-medium text-gray-700 mb-2">
            Your Role & Wallet
          </label>
          <select
            className="w-full border border-gray-300 rounded-lg p-3 bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
            value={selectedParty}
            onChange={handlePartyChange}
          >
            <option value="">Select your role</option>
            {partyOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Sign Transaction */}
        <div className="mb-6">
          <label className="block text-base font-medium text-gray-700 mb-2">
            Sign Transaction to Approve Settlement
          </label>

          {walletConnected ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
              <p className="text-green-800 font-medium">
                Transaction ready to submit
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={connectWallet}
                disabled={loading || !selectedParty || !walletAddress || !claimedOutcome}
              >
                {loading ? "Generating..." : "Generate Transaction to Sign"}
              </button>

              {qrCodeUrl && (
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-700 mb-3">
                    Sign this transaction hex in your wallet
                  </p>
                  <img src={qrCodeUrl} alt="Sign QR Code" className="w-56 h-56 mx-auto border border-gray-300 rounded-lg" />


                  {/* NEW: Full hex display + copy button */}
                  <div className="mt-4 p-3 bg-gray-100 rounded-lg border border-gray-300 font-mono text-sm break-all">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">Transaction hex to sign:</span>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(unsignedHex);
                          alert("Transaction hex copied to clipboard!");
                        }}
                        className="text-blue-600 hover:text-blue-800 text-xs underline"
                      >
                        Copy
                      </button>
                    </div>
                    {unsignedHex}
                  </div>

                  {/* NEW: Instruction box */}
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                    <p className="font-medium mb-2">How to sign without QR (e.g. Dash Core):</p>
                    <ol className="list-decimal pl-5 space-y-1">
                      <li>Copy the transaction hex above</li>
                      <li>Open Dash Core → Tools → Debug console</li>
                      <li>Type: <code className="bg-blue-100 px-1 rounded">signrawtransactionwithwallet "PASTE_HEX_HERE"</code></li>
                      <li>Press Enter → copy the "hex" value from the output</li>
                      <li>Paste it below</li>
                    </ol>
                  </div>



                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded-lg p-3 mt-4 font-mono text-sm"
                    value={signedPartial}
                    onChange={(e) => setSignedPartial(e.target.value)}
                    placeholder="Paste signed transaction hex here (long string starting with 020000...)"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    The signed hex should start with '020000...' or similar.
                  </p>
                  <button
                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 mt-3 disabled:opacity-50"
                    onClick={handleSubmit}
                    disabled={loading || !signedPartial.trim()}
                  >
                    {loading ? "Submitting..." : "Submit Settlement"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-4">
          <button
            onClick={() => setSelectedContract(null)}
            className="flex-1 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600 transition"
          >
            Cancel
          </button>
          <button
            onClick={() => setShowConfirmation(true)}
            className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            disabled={!claimedOutcome || !walletConnected || !signedPartial.trim()}
          >
            Submit Outcome & Settlement
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Confirm Settlement</h3>
            <div className="space-y-4 text-gray-700 mb-8">
              <p><strong>Outcome:</strong> {claimedOutcome}</p>
              <p><strong>Reasoning:</strong> {reasoning || "None provided"}</p>
              <p><strong>Role:</strong> {selectedParty === "creator" ? "Creator" : "Accepter"}</p>
              <p className="text-sm text-gray-500">
                Wallet: {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
              </p>
            </div>
            <p className="text-red-600 text-sm mb-8">
              This will submit the settlement transaction. Are you sure?
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 bg-gray-300 text-gray-800 py-3 rounded-xl hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl hover:bg-blue-700 transition"
              >
                Confirm & Settle
              </button>
            </div>
          </div>
        </div>
      )}
  
      {error && <p className="text-red-600 mt-4 text-sm font-medium">{error}</p>}
    </div>
  );
};

export default SettleContractForm;