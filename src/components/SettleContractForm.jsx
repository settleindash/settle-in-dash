// src/components/SettleContractForm.jsx
// Updated: Full support for outcome changes, better UX & feedback

import { useState, useMemo, useEffect } from "react";
import { useEvents } from "../hooks/useEvents";

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
  const [prevtxs, setPrevtxs] = useState([]);
  const [redeemScript, setRedeemScript] = useState("");
  const [signedPartial, setSignedPartial] = useState("");
  const [messageSignature, setMessageSignature] = useState("");
  const [loading, setLoading] = useState(false);
  const [signingCommand, setSigningCommand] = useState("");
  const [instructionMessage, setInstructionMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState(""); // New: feedback after submit

  const contract = filteredContracts.find((c) => c.contract_id === selectedContractId);
  if (!contract) return <p className="text-red-500">Contract not found.</p>;

  const possibleOutcomes = useMemo(() => {
    return parseOutcomes(contract?.possible_outcomes || []);
  }, [contract, parseOutcomes]);

  const partyOptions = [
    { value: "creator", label: `Creator: ${contract.WalletAddress}`, address: contract.WalletAddress },
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

  const generateSigningData = async () => {
    if (!walletAddress || !claimedOutcome) {
      setError("Select your role and an outcome first");
      return;
    }

    setLoading(true);
    setError("");
    setStatusMessage("");
    setUnsignedHex("");
    setPrevtxs([]);
    setRedeemScript("");
    setSigningCommand("");

    try {
      const messageToSign = `SettleInDASH settlement:${selectedContractId}:${claimedOutcome}`;

      // Instruction for message signing
      setInstructionMessage(
        `Step 1: In Dash Core Debug console, run:\n\n` +
        `signmessage "${walletAddress}" "${messageToSign}"\n\n` +
        `Copy the full signature (long base64 string) and paste it in the "Message Signature" field below.\n\n` +
        `Then click "Generate Signing Command" again.`
      );

      if (!messageSignature.trim()) {
        setLoading(false);
        return; // Wait for user to paste message sig
      }

      const res = await fetch("https://settleindash.com/api/contracts.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate_settlement_signing_data",
          data: {
            contract_id: selectedContractId,
            resolution: claimedOutcome,
          },
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }

      const data = await res.json();
      console.log("[FRONTEND] generate response:", data);

      if (!data.success) {
        throw new Error(data.error || "Backend failed to generate signing data");
      }

      setUnsignedHex(data.unsigned_tx_hex);
      setPrevtxs(data.prevtxs || []);
      setRedeemScript(data.redeem_script || "");

      const prevtxsJson = JSON.stringify(data.prevtxs, null, 0);
      const cmd = `signrawtransactionwithkey "${data.unsigned_tx_hex}" '["YOUR_PRIVATE_KEY_HERE"]' '${prevtxsJson}'`;
      setSigningCommand(cmd);

      setInstructionMessage(
        `Step 2: Replace "YOUR_PRIVATE_KEY_HERE" with your private key (from dumpprivkey ${walletAddress}), run in Dash Core, then paste the "hex" output below.`
      );

      setStatusMessage("Transaction ready to sign. You can resubmit later to change your outcome (before agreement is reached).");
    } catch (err) {
      console.error("[FRONTEND] generate failed:", err);
      setError("Failed to generate signing data: " + (err.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!signedPartial.trim()) {
      setError("Please paste the signed transaction hex first");
      return;
    }
    if (!messageSignature.trim()) {
      setError("Please paste the message signature first (from signmessage)");
      return;
    }

    setLoading(true);
    setError("");
    setStatusMessage("Submitting your vote & signature...");

    try {
      const messageToSign = `SettleInDASH settlement:${selectedContractId}:${claimedOutcome}`;

      const result = await settleContract(
        selectedContractId,
        claimedOutcome,
        reasoning,
        walletAddress,
        signedPartial,
        messageSignature,
        messageToSign  // ← send the exact message used for signing
      );

      if (result.success) {
        setStatusMessage("Success! Your vote and signature were submitted. The contract will settle automatically when another party agrees.");
        setSelectedContract(null);
      } else {
        setError(result.error || "Submission failed");
      }
    } catch (err) {
      let msg = err.message || "Unknown error";
      if (err.message.includes("502")) {
        msg = "Server timeout — likely during settlement. Check contract status in a minute.";
      } else if (msg.includes("Invalid signature")) {
        msg = "Signature mismatch — make sure you signed the exact message shown in instructions.";
      }
      setError("Error submitting: " + msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 rounded-xl border border-gray-200 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-5">Settle This Contract</h3>

      <div className="space-y-6">
        {/* Outcome */}
        <div>
          <label className="block text-base font-medium text-gray-700 mb-2">
            Your Claimed Outcome
          </label>
          <select
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={claimedOutcome}
            onChange={(e) => setClaimedOutcome(e.target.value)}
          >
            <option value="">Select outcome</option>
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
            className="w-full border border-gray-300 rounded-lg p-3 min-h-[120px]"
            value={reasoning}
            onChange={(e) => setReasoning(e.target.value)}
            placeholder="Why do you believe this is the correct outcome?"
            maxLength={500}
          />
          <p className="text-sm text-gray-500 mt-1">{reasoning.length}/500</p>
        </div>

        {/* Role */}
        <div>
          <label className="block text-base font-medium text-gray-700 mb-2">
            Your Role
          </label>
          <select
            className="w-full border border-gray-300 rounded-lg p-3 bg-white font-mono text-sm"
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

        {/* Message Signature */}
        <div className="mb-4">
          <label className="block text-base font-medium text-gray-700 mb-2">
            Message Signature
          </label>
          <input
            type="text"
            className="w-full border border-gray-300 rounded-lg p-3 font-mono text-sm"
            value={messageSignature}
            onChange={(e) => setMessageSignature(e.target.value)}
            placeholder="Paste output of signmessage here (base64 string)"
          />
          <p className="text-xs text-gray-500 mt-1">
            Run: signmessage "{walletAddress}" "SettleInDASH settlement:{selectedContractId}:{claimedOutcome}"
          </p>
        </div>

        {/* Generate & Sign Transaction */}
        <div className="mb-6">
          <label className="block text-base font-medium text-gray-700 mb-2">
            Sign to Support Your Outcome
          </label>

          <button
            className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            onClick={generateSigningData}
            disabled={loading || !selectedParty || !walletAddress || !claimedOutcome || !messageSignature.trim()}
          >
            {loading ? "Generating..." : "Generate Signing Command"}
          </button>

          {signingCommand && (
            <div className="space-y-4">
              {/* Command + copy */}
              <div className="p-3 bg-gray-100 rounded-lg border border-gray-300 font-mono text-sm break-all">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">Full signing command:</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(signingCommand);
                      alert("Command copied!");
                    }}
                    className="text-blue-600 hover:text-blue-800 text-xs underline"
                  >
                    Copy
                  </button>
                </div>
                {signingCommand}
              </div>

              {/* Instructions */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                <p className="font-medium mb-2">How to sign in Dash Core:</p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Unlock wallet: <code>walletpassphrase "yourpass" 600</code></li>
                  <li>Get key: <code>dumpprivkey {walletAddress}</code></li>
                  <li>Copy command above</li>
                  <li>Paste in Debug console</li>
                  <li>Replace "YOUR_PRIVATE_KEY_HERE" with your key</li>
                  <li>Run → copy <strong>"hex"</strong> value</li>
                  <li>Paste below</li>
                </ol>
                <p className="mt-3 text-red-600 font-medium">
                  Never share your private key!
                </p>
                <p className="mt-2 text-sm text-gray-700">
                  You can resubmit later to change your outcome (before 2 parties agree).
                </p>
              </div>

              {/* Signed tx hex */}
              <textarea
                className="w-full border border-gray-300 rounded-lg p-3 font-mono text-sm min-h-[120px]"
                value={signedPartial}
                onChange={(e) => setSignedPartial(e.target.value)}
                placeholder="Paste the signed transaction hex here (starts with 020000...)"
              />

              <button
                className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                onClick={handleSubmit}
                disabled={loading || !signedPartial.trim() || !messageSignature.trim()}
              >
                {loading ? "Submitting..." : "Submit Vote & Signature"}
              </button>
            </div>
          )}

          {instructionMessage && <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{instructionMessage}</p>}
          {statusMessage && <p className="text-sm text-green-700 mt-2">{statusMessage}</p>}
        </div>

        {/* Bottom buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => setSelectedContract(null)}
            className="flex-1 bg-gray-500 text-white py-3 rounded-lg hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </div>

      {error && <p className="text-red-600 mt-4 text-sm font-medium">{error}</p>}
    </div>
  );
};

export default SettleContractForm;