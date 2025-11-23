// src/components/CreateContract.jsx
import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useConstants } from "../hooks/useConstants.js";
import { useContracts } from "../hooks/useContracts.js";
import { useEvents } from "../hooks/useEvents.js";
import TermsSummary from "./TermsSummary";
import { validateContractCreation, parseOutcomes } from "../utils/validation";
import PageHeader from "../utils/formats/PageHeader.jsx";
import QRCode from "qrcode";

const CreateContract = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Hooks
  const { constants, loading: constantsLoading, error: constantsError } = useConstants();
  const { createContract, loading: contractLoading } = useContracts();
  const { getEvent } = useEvents();

  // State
  const [eventId, setEventId] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [eventLoading, setEventLoading] = useState(true);
  const [eventError, setEventError] = useState("");

  const [outcome, setOutcome] = useState("");
  const [positionType, setPositionType] = useState("sell");
  const [stake, setStake] = useState("");
  const [odds, setOdds] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [acceptanceDeadline, setAcceptanceDeadline] = useState("");
  const [creatorPublicKey, setCreatorPublicKey] = useState("");
  const [error, setError] = useState("");
  const [walletConnected, setWalletConnected] = useState(false);
  const [message, setMessage] = useState("");
  const [multisigAddress, setMultisigAddress] = useState("");
  const [signature, setSignature] = useState("");
  const [manualSignature, setManualSignature] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [redeemScript, setRedeemScript] = useState("");
  const [walletQrCodeUrl, setWalletQrCodeUrl] = useState(null);
  const [stakeQrCodeUrl, setStakeQrCodeUrl] = useState(null);
  const [stakeTxValidated, setStakeTxValidated] = useState(false);
  const [loading, setLoading] = useState(false);

  // 1. FETCH CONSTANTS — INDEPENDENT
  // (already handled inside useConstants.js)

  // 2. FETCH EVENT — SEPARATE EFFECT
  useEffect(() => {
    const fetchEvent = async () => {
      setEventLoading(true);
      setEventError("");

      const eventIdFromUrl = new URLSearchParams(location.search).get("event_id");
      if (!eventIdFromUrl) {
        setEventError("No event selected");
        setEventLoading(false);
        return;
      }

      try {
        const event = await getEvent(eventIdFromUrl);
        if (!event) throw new Error("Event not found");

        setEventId(event.event_id);
        setSelectedEvent(event);

        const outcomeFromUrl = new URLSearchParams(location.search).get("outcome");
        if (outcomeFromUrl && parseOutcomes(event.possible_outcomes).includes(decodeURIComponent(outcomeFromUrl))) {
          setOutcome(decodeURIComponent(outcomeFromUrl));
        }
      } catch (err) {
        setEventError(err.message);
      } finally {
        setEventLoading(false);
      }
    };

    fetchEvent();
  }, [getEvent, location.search]);

  // EARLY RETURN — AFTER ALL HOOKS
  if (constantsLoading || eventLoading) {
    return (
      <div className="min-h-screen bg-background p-8 flex items-center justify-center">
        <p className="text-xl">Loading contract setup...</p>
      </div>
    );
  }

  if (constantsError || eventError || !constants || !selectedEvent) {
    return (
      <div className="min-h-screen bg-background p-8 text-red-500 text-center">
        <p>{constantsError || eventError || "Failed to load required data"}</p>
        <button onClick={() => navigate("/marketplace")} className="mt-4 bg-gray-600 text-white px-6 py-3 rounded">
          Back to Marketplace
        </button>
      </div>
    );
  }

  // SAFE TO USE
  const { NETWORK, ORACLE_PUBLIC_KEY, PLACEHOLDER_PUBLIC_KEY, SETTLE_IN_DASH_WALLET } = constants;

  const minDateTime = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);

  console.log("network", NETWORK);

  // -----------------------------------------------------------------
  // Wallet connection
  // -----------------------------------------------------------------
  const connectWallet = async () => {
    if (!walletAddress) return setError("Please enter your DASH wallet address");
    if (!/^y[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(walletAddress))
      return setError(`Invalid Dash ${NETWORK} wallet address`);

    try {
      setLoading(true);
      const url = await QRCode.toDataURL(`signmessage:${walletAddress}:SettleInDash:${walletAddress}:`);
      setWalletQrCodeUrl(url);
      setMessage(
        `Please sign the message 'SettleInDash:${walletAddress}' in Dash Core (Tools &gt; Sign Message) and enter the signature below.`
      );
    } catch (err) {
      setError("Failed to generate QR code for signing: " + err.message);
      console.error("CreateContract: QR code generation error:", err);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------------------
  // Manual signature verification
  // -----------------------------------------------------------------
  const verifyManualSignature = async (retries = 3) => {
    if (!manualSignature) return setError("Please enter a signature");

    for (let attempt = 1; attempt <= retries; attempt++) {
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

        if (!response.ok) {
          if ((response.status === 400 || response.status === 503) && attempt < retries) {
            await new Promise((r) => setTimeout(r, 1000 * attempt));
            continue;
          }
          throw new Error(`HTTP ${response.status}`);
        }

        if (result.isValid) {
          setSignature(manualSignature);
          setWalletConnected(true);
          setMessage("Wallet successfully connected and signed!");
          setManualSignature("");
          setWalletQrCodeUrl(null);
          return;
        } else {
          setError(result.message || "Failed to verify signature");
          break;
        }
      } catch (err) {
        setError("Failed to verify manual signature: " + err.message);
        console.error("CreateContract: Manual signature verification error:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  // -----------------------------------------------------------------
  // Generate QR codes (multisig + stake)
  // -----------------------------------------------------------------
  const generateTransactionQRCodes = async () => {
    if (!walletConnected || !signature) return setError("Please connect and sign first");
    if (!stake || Number(stake) <= 0) return setError("Please enter a valid stake amount");
    if (!creatorPublicKey) return setError("Please provide your public key");

    try {
      setLoading(true);

      // 1. Create multisig
      const multisigResponse = await fetch("https://settleindash.com/api/contracts.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_multisig",
          data: {
            public_keys: [creatorPublicKey, PLACEHOLDER_PUBLIC_KEY, ORACLE_PUBLIC_KEY],
            required_signatures: 2,
            network: NETWORK,
          },
        }),
      });
      if (!multisigResponse.ok) throw new Error(`HTTP ${multisigResponse.status}`);
      const multisigResult = await multisigResponse.json();
      if (!multisigResult.success) throw new Error(multisigResult.error || "Failed to create multisig");

      setMultisigAddress(multisigResult.multisig_address);
      setRedeemScript(multisigResult.redeemScript || "");

      // 2. Stake QR
      const amount = Number(stake).toFixed(8);
      const stakeQr = await QRCode.toDataURL(`dash:${multisigResult.multisig_address}?amount=${amount}`);
      setStakeQrCodeUrl(stakeQr);
      setMessage(
        `Scan the QR code to send ${amount} DASH to the multisig address ${multisigResult.multisig_address}. Then enter the transaction ID.`
      );
    } catch (err) {
      setError("Failed to generate transaction QR code: " + err.message);
      console.error("CreateContract: QR code generation error:", err);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------------------
  // Transaction validation
  // -----------------------------------------------------------------
  const validateTransaction = async (txid, expectedDestination, expectedAmount, type, retries = 3) => {
    if (!/^[0-9a-fA-F]{64}$/.test(txid)) {
      setError("Invalid transaction ID format.");
      return false;
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        setLoading(true);
        const response = await fetch("https://settleindash.com/api/contracts.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "validate_transaction",
            data: {
              txid,
              expected_destination: expectedDestination,
              expected_amount: Number(expectedAmount),
              min_confirmations: 1,
            },
          }),
        });
        const result = await response.json();

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (!result.success) {
          if (result.message === "Insufficient confirmations" && attempt < retries) {
            setError(`Waiting for confirmations (attempt ${attempt}/${retries})…`);
            await new Promise((r) => setTimeout(r, 30000));
            continue;
          }
          throw new Error(result.message || `Failed to validate ${type} transaction`);
        }

        console.log(`CreateContract: ${type} transaction validated:`, txid);
        return true;
      } catch (err) {
        setError(`Failed to validate ${type} transaction: ${err.message}`);
        console.error(`CreateContract: ${type} validation error (attempt ${attempt}):`, err);
        return false;
      } finally {
        setLoading(false);
      }
    }
    return false;
  };

  const handleValidateTransactions = async () => {
    if (!transactionId) return setError("Please enter the stake transaction ID");
    const amount = Number(stake).toFixed(8);
    if (Number(stake) <= 0) return setError("Stake amount must be greater than 0");

    const ok = await validateTransaction(transactionId, multisigAddress, Number(amount), "stake");
    if (ok) {
      setStakeTxValidated(true);
      setMessage("Stake transaction validated successfully! You can now create the contract.");
    } else {
      setStakeTxValidated(false);
    }
  };

  // -----------------------------------------------------------------
  // Form submission
  // -----------------------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!walletConnected || !signature) return setError("Please connect and sign first");
    if (!stakeTxValidated) return setError("Please validate the stake transaction");
    if (!redeemScript || !/^[0-9a-fA-F]+$/.test(redeemScript))
      return setError("Invalid redeemScript. Please regenerate the multisig address.");

    setLoading(true);
    console.log("CreateContract: Submitting form", {
      eventId,
      outcome,
      positionType,
      stake,
      odds,
      walletAddress,
      acceptanceDeadline,
      creatorPublicKey,
      multisigAddress,
      transactionId,
      signature,
      redeemScript,
    });

    const validationResult = await validateContractCreation(
      {
        eventId,
        outcome,
        positionType,
        stake,
        odds,
        walletAddress,
        expiration_date: acceptanceDeadline,
        signature,
      },
      selectedEvent
    );

    if (!validationResult.isValid) {
      setError(validationResult.message);
      setLoading(false);
      return;
    }

    setError("");

    try {
      const result = await createContract({
        contract_id: `CONTRACT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        event_id: eventId,
        title: selectedEvent?.title || "",
        creator_address: walletAddress,
        outcome,
        position_type: positionType,
        stake: Number(stake),
        odds: Number(odds),
        acceptance_deadline: new Date(`${acceptanceDeadline}:00+02:00`).toISOString(),
        multisig_address: multisigAddress,
        //redeem_script: redeemScript,
        refund_transaction_id: "",
        creator_public_key: creatorPublicKey,
        transaction_id: transactionId,
        fee_transaction_id: "",
        signature,
      });

      if (result.error) {
        setError(result.error);
      } else {
        console.log("CreateContract: Contract created, id:", result.contract_id);
        navigate("/marketplace");
      }
    } catch (err) {
      setError("Failed to create contract: " + err.message);
      console.error("CreateContract: Contract creation error:", err);
    } finally {
      setLoading(false);
    }
  };



  // -----------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------
  return (
    <div className="min-h-screen bg-background p-4">
      <PageHeader title={selectedEvent ? `Create Contract for ${selectedEvent.title}` : "Create Contract"} />
      <main className="max-w-3xl mx-auto mt-6">
        <div className="mb-6 text-center">
          <Link to="/how-it-works" className="text-blue-500 hover:underline text-sm">
            Learn How It Works
          </Link>
        </div>
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {selectedEvent ? (
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-6">
            {/* Event Details */}
            <div className="mb-6">
              <label className="block text-lg font-bold text-primary mb-2">Event Details</label>
              <p className="text-gray-600 text-sm">
                Event: {selectedEvent.title || "N/A"}<br />
                Date: {selectedEvent.event_date
                  ? new Date(selectedEvent.event_date).toLocaleString("en-GB", {
                      timeZone: "Europe/Paris",
                      dateStyle: "medium",
                      timeStyle: "short",
                    })
                  : "N/A"}<br />
                Category: {selectedEvent.category || "N/A"}
              </p>
            </div>

            {/* Wallet Address */}
            <div className="mb-6">
              <label htmlFor="walletAddress" className="block text-lg font-bold text-primary mb-2">
                Your DASH Wallet Address
              </label>
              <input
                id="walletAddress"
                type="text"
                className="border p-2 rounded w-full text-sm"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                placeholder={`Enter your DASH ${NETWORK} address (starts with 'y')`}
                disabled={loading}
                aria-label="DASH wallet address"
              />
              <p className="text-gray-600 text-xs mt-1">
                Enter your DASH {NETWORK} wallet address (26–35 characters, starts with 'y').
              </p>
            </div>

            {/* Public Key */}
            <div className="mb-6">
              <label htmlFor="creatorPublicKey" className="block text-lg font-bold text-primary mb-2">
                Your Public Key
              </label>
              <input
                id="creatorPublicKey"
                type="text"
                className="border p-2 rounded w-full text-sm"
                value={creatorPublicKey}
                onChange={(e) => setCreatorPublicKey(e.target.value)}
                placeholder="Enter your public key from Dash Core (getaddressinfo)"
                disabled={loading}
                aria-label="Creator public key"
              />
              <p className="text-gray-600 text-xs mt-1">
                Run <code>getaddressinfo your_wallet_address</code> in Dash Core ({NETWORK} mode) and copy the <code>pubkey</code> field.
              </p>
            </div>

            {/* Outcome */}
            <div className="mb-6">
              <label htmlFor="outcome" className="block text-lg font-bold text-primary mb-2">
                Outcome
              </label>
              <select
                id="outcome"
                className="border p-2 rounded w-full text-sm"
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                disabled={loading}
                aria-label="Contract outcome"
              >
                <option value="">Select an outcome</option>
                {parseOutcomes(selectedEvent.possible_outcomes).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            {/* Position Type (Sell only) */}
            <div className="mb-6">
              <label className="block text-lg font-bold text-primary mb-2">Position Type</label>
              <p className="text-gray-600 text-sm mb-2">
                Note: You can only create a <strong>Sell</strong> contract here. To accept (Buy), use the order book.
              </p>
              <select
                id="positionType"
                className="border p-2 rounded w-full text-sm"
                value={positionType}
                onChange={(e) => setPositionType(e.target.value)}
                disabled={loading}
                aria-label="Position type"
              >
                <option value="sell">Sell (Lay)</option>
              </select>
            </div>

            {/* Stake */}
            <div className="mb-6">
              <label htmlFor="stake" className="block text-lg font-bold text-primary mb-2">
                Stake (DASH)
              </label>
              <input
                id="stake"
                type="number"
                className="border p-2 rounded w-full text-sm"
                value={stake}
                min="0.01"
                step="0.01"
                onChange={(e) => {
                  const v = e.target.value;
                  if (v === "" || Number(v) > 0) setStake(v);
                }}
                placeholder="Enter stake amount (e.g., 1)"
                disabled={loading}
                aria-label="Stake amount"
              />
              <p className="text-gray-600 text-xs mt-1">
                Note: A small network fee (0.001 DASH) will be deducted from your stake if the contract is refunded or settled.
              </p>
            </div>

            {/* Odds */}
            <div className="mb-6">
              <label htmlFor="odds" className="block text-lg font-bold text-primary mb-2">
                Odds (e.g., 2.00 for 2:1)
              </label>
              <input
                id="odds"
                type="number"
                step="0.01"
                className="border p-2 rounded w-full text-sm"
                value={odds}
                min="1.01"
                onChange={(e) => setOdds(e.target.value)}
                placeholder="Enter odds (e.g., 2.00, must be > 1)"
                disabled={loading}
                aria-label="Odds"
              />
              <p className="text-gray-600 text-xs mt-1">Enter odds greater than 1 (e.g., 1.01 or higher).</p>
            </div>

            {/* Acceptance Deadline */}
            <div className="mb-6">
              <label htmlFor="acceptanceDeadline" className="block text-lg font-bold text-primary mb-2">
                Acceptance Deadline
              </label>
              <input
                id="acceptanceDeadline"
                type="datetime-local"
                className="border p-2 rounded w-full text-sm"
                value={acceptanceDeadline}
                min={minDateTime}
                max={selectedEvent?.event_date?.slice(0, 16)}
                onChange={(e) => setAcceptanceDeadline(e.target.value)}
                disabled={loading}
                aria-label="Acceptance deadline"
              />
              <p className="text-gray-600 text-xs mt-1">
                Select a date and time before or on the event time (at least 5 minutes from now).
              </p>
            </div>

            {/* Wallet Signature */}
            <div className="mb-6">
              <label className="block text-lg font-bold text-primary mb-2">Wallet Signature</label>
              <button
                type="button"
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 text-sm"
                onClick={connectWallet}
                disabled={walletConnected || loading}
                aria-label="Connect wallet and sign"
              >
                {walletConnected ? `Connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "Connect Wallet & Sign"}
              </button>

              {walletQrCodeUrl && !signature && (
                <div className="mt-4">
                  <p className="text-gray-700 text-sm mb-2">
                    Sign the message <code>SettleInDash:{walletAddress}</code> in Dash Core (Tools &gt; Sign Message) and enter the signature below.
                  </p>
                  <img src={walletQrCodeUrl} alt="QR Code for wallet signing" className="w-64 h-64 mx-auto" />
                  <div className="mt-4">
                    <label htmlFor="manualSignature" className="block text-sm text-gray-700 mb-2">
                      Enter signature:
                    </label>
                    <input
                      id="manualSignature"
                      type="text"
                      className="border p-2 rounded w-full text-sm mb-2"
                      value={manualSignature}
                      onChange={(e) => setManualSignature(e.target.value)}
                      placeholder="Paste signature here"
                      aria-label="Manual signature input"
                    />
                    <button
                      onClick={() => verifyManualSignature()}
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
                      disabled={loading}
                      aria-label="Verify manual signature"
                    >
                      Verify Signature
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Fund Multisig */}
            <div className="mb-6">
              <label className="block text-lg font-bold text-primary mb-2">Fund Multisig</label>
              <button
                type="button"
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
                onClick={generateTransactionQRCodes}
                disabled={loading || !walletConnected || !creatorPublicKey || stakeTxValidated}
                aria-label="Generate transaction QR code"
              >
                Generate Transaction QR Code
              </button>

              {stakeQrCodeUrl && (
                <div className="mt-4">
                  <div className="mb-4">
                    <p className="text-gray-700 text-sm mb-2">
                      Stake Transfer: Send {Number(stake).toFixed(8)} DASH to multisig address {multisigAddress}
                    </p>
                    <p className="text-gray-600 text-xs mb-2">
                      Note: A small network fee (0.001 DASH) may be deducted from your stake if the contract is refunded or settled.
                    </p>
                    <img src={stakeQrCodeUrl} alt="Stake QR Code" className="w-64 h-64 mx-auto" />
                    <p className="text-gray-600 text-xs mt-1">Multisig Address: {multisigAddress}</p>
                  </div>

                  <div className="mt-4">
                    <label htmlFor="transactionId" className="block text-sm text-gray-700 mb-2">
                      Stake Transaction ID:
                    </label>
                    <input
                      id="transactionId"
                      type="text"
                      className="border p-2 rounded w-full text-sm mb-2"
                      value={transactionId}
                      onChange={(e) => setTransactionId(e.target.value)}
                      placeholder="Enter stake transaction ID (64-character hex)"
                      disabled={loading || stakeTxValidated}
                      aria-label="Stake transaction ID"
                    />
                    <button
                      onClick={handleValidateTransactions}
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
                      disabled={loading || stakeTxValidated}
                      aria-label="Validate transaction"
                    >
                      Validate Transaction
                    </button>
                  </div>

                  {stakeTxValidated && (
                    <p className="text-green-500 text-sm mt-2">Stake transaction validated successfully!</p>
                  )}
                </div>
              )}
            </div>

            {/* Messages */}
            {message && <p className="text-green-500 text-sm mt-2">{message}</p>}
            {loading && <p className="text-blue-500 text-sm mt-2">Processing…</p>}
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

            {/* Submit */}
            <button
              type="submit"
              className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50 text-sm"
              disabled={contractLoading || !walletConnected || !signature || !stakeTxValidated || loading}
              aria-label="Create Contract"
            >
              {loading || contractLoading ? "Creating..." : "Create Contract"}
            </button>
          </form>
        ) : (
          <p className="text-gray-600 text-sm">No event selected. Please choose an event from the Marketplace.</p>
        )}
        <TermsSummary />
      </main>
    </div>
  );
};

export default CreateContract;