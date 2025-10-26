// src/components/CreateContract.jsx
// Component to create a new contract for a selected event, including wallet address input, manual signature verification, and transaction validation.

import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useContracts } from "../hooks/useContracts";
import { useEvents } from "../hooks/useEvents";
import TermsSummary from "./TermsSummary";
import { validateWalletAddress, validateContractCreation, parseOutcomes } from "../utils/validation";
import { validateDashPublicKey, fetchConstants } from "../utils/constants";
import PageHeader from "../utils/formats/PageHeader.jsx";
import QRCode from "qrcode";

const CreateContract = () => {
  const [eventId, setEventId] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
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
  const [constants, setConstants] = useState({
    ORACLE_PUBLIC_KEY: "",
    PLACEHOLDER_PUBLIC_KEY: "",
    SETTLE_IN_DASH_WALLET: "",
  });

  const { createContract, loading: contractLoading } = useContracts();
  const { events, getEvents, loading: eventsLoading, error: eventsError } = useEvents();
  const navigate = useNavigate();
  const location = useLocation();

  const minDateTime = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);

  useEffect(() => {
    fetchConstants().then((result) => {
      setConstants(result);
    }).catch((err) => {
      console.error("CreateContract: Error fetching constants:", err);
      setConstants({
        ORACLE_PUBLIC_KEY: "",
        PLACEHOLDER_PUBLIC_KEY: "",
        SETTLE_IN_DASH_WALLET: "",
      });
    });
  }, []);

  const handleFetchEvents = useCallback(async () => {
    console.log("CreateContract: Fetching events");
    const result = await getEvents({ status: "open" });
    if (result.error) {
      setError(result.error);
      console.log("CreateContract: Error fetching events:", result.error);
    } else {
      const eventIdFromUrl = new URLSearchParams(location.search).get("event_id");
      if (eventIdFromUrl) {
        const event = result.find((e) => e.event_id === eventIdFromUrl);
        if (event) {
          setEventId(eventIdFromUrl);
          setSelectedEvent(event);
          const outcomeFromUrl = new URLSearchParams(location.search).get("outcome");
          if (outcomeFromUrl && parseOutcomes(event.possible_outcomes).includes(decodeURIComponent(outcomeFromUrl))) {
            setOutcome(decodeURIComponent(outcomeFromUrl));
          }
        } else {
          setError("Selected event not found");
        }
      } else {
        setError("No event selected");
      }
    }
  }, [getEvents, location.search]);

  useEffect(() => {
    handleFetchEvents();
  }, [handleFetchEvents]);

// Fetch wallet balance from backend API
const getBalance = async (address, multisigAddress = null) => {
  try {
    const response = await fetch("https://settleindash.com/api/contracts.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "get_balance",
        data: { 
          address,
          multisig_address: multisigAddress
        },
      }),
    });
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || "Failed to fetch balance");
    }
    console.log("CreateContract: getBalance response:", { address, multisigAddress, balance: result.balance });
    return result.balance; // Balance in DASH
  } catch (err) {
    console.error("CreateContract: Error fetching balance:", err);
    setError("Failed to fetch wallet balance. Please check your connection or try again.");
    return 0;
  }
};

  const connectWallet = async () => {
    if (!walletAddress) {
      setError("Please enter your DASH wallet address");
      console.log("CreateContract: No wallet address provided");
      return;
    }
    if (!/^y[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(walletAddress)) {
      setError("Invalid Dash testnet wallet address (must start with 'y', 26-35 characters)");
      console.log("CreateContract: Invalid wallet address:", walletAddress);
      return;
    }
    try {
      setLoading(true);
      const qrCodeUrl = await QRCode.toDataURL(`signmessage:${walletAddress}:SettleInDash:${walletAddress}:`);
      setWalletQrCodeUrl(qrCodeUrl);
      setMessage(
        `Please sign the message 'SettleInDash:${walletAddress}' in Dash Core (Tools > Sign Message) and enter the signature below.`
      );
      console.log("CreateContract: Generated QR code for wallet:", walletAddress);
    } catch (err) {
      setError("Failed to generate QR code for signing: " + err.message);
      console.error("CreateContract: QR code generation error:", err);
    } finally {
      setLoading(false);
    }
  };

  const verifyManualSignature = async (retries = 3) => {
    if (!manualSignature) {
      setError("Please enter a signature");
      console.log("CreateContract: No manual signature provided");
      return;
    }
    for (let attempt = 1; attempt <= retries; attempt++) {
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
        const responseText = await response.text();
        console.log("CreateContract: verifyManualSignature request (attempt", attempt, "):", {
          action: "verify-signature",
          data: {
            address: walletAddress,
            message: `SettleInDash:${walletAddress}`,
            signature: manualSignature,
          },
        });
        console.log("CreateContract: verifyManualSignature response (attempt", attempt, "):", responseText, "status:", response.status);
        if (!response.ok) {
          if ((response.status === 400 || response.status === 503) && attempt < retries) {
            console.log("CreateContract: Error", response.status, "received, retrying after delay...");
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          }
          throw new Error(`HTTP error: ${response.status} - ${responseText}`);
        }
        const result = JSON.parse(responseText);
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
        console.error("CreateContract: Manual signature verification error (attempt", attempt, "):", err);
        if (attempt === retries) {
          return;
        }
      } finally {
        setLoading(false);
      }
    }
  };

const generateTransactionQRCodes = async () => {
    if (!walletConnected || !signature) {
        setError("Please connect and sign with your wallet first");
        console.log("CreateContract: Attempted QR code generation without wallet or signature");
        return;
    }
    if (!stake || Number(stake) <= 0) {
        setError("Please enter a valid stake amount (must be greater than 0)");
        console.log("CreateContract: Invalid stake for QR code generation:", stake);
        return;
    }
    if (!creatorPublicKey) {
        setError("Please provide your public key first");
        console.log("CreateContract: Missing creator public key for multisig");
        return;
    }

    try {
        setLoading(true);
        // Create multisig address
        const multisigResponse = await fetch("https://settleindash.com/api/contracts.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                action: "create-multisig",
                data: {
                    public_keys: [
                        creatorPublicKey,
                        constants.PLACEHOLDER_PUBLIC_KEY,
                        constants.ORACLE_PUBLIC_KEY,
                    ],
                    required_signatures: 2,
                    network: "testnet",
                },
            }),
        });
        if (!multisigResponse.ok) {
            throw new Error(`HTTP error: ${multisigResponse.status}`);
        }
        const multisigResult = await multisigResponse.json();
        if (!multisigResult.success) {
            throw new Error(multisigResult.error || "Failed to create multisig address");
        }
        console.log("CreateContract: Multisig result:", multisigResult); // Debug
        setMultisigAddress(multisigResult.multisig_address);
        setRedeemScript(multisigResult.redeemScript || ""); // Ensure not undefined
        if (!multisigResult.redeemScript) {
            setError("No redeemScript received from server. Please try again.");
            console.error("CreateContract: Missing redeemScript in multisig response");
            setLoading(false);
            return;
        }

        // Generate QR code for stake
        const stakeAmount = Number(stake).toFixed(8);
        const stakeQr = await QRCode.toDataURL(`dash:${multisigResult.multisig_address}?amount=${stakeAmount}`);
        setStakeQrCodeUrl(stakeQr);
        setMessage(
            `Scan the QR code below in your Dash wallet to send ${stakeAmount} DASH to the multisig address ${multisigResult.multisig_address}. Then, enter the transaction ID.`
        );
        console.log("CreateContract: Generated QR code for stake transfer", {
            multisig_address: multisigResult.multisig_address,
            amount: stakeAmount
        });
    } catch (err) {
        setError("Failed to generate transaction QR code: " + err.message);
        console.error("CreateContract: QR code generation error:", err);
    } finally {
        setLoading(false);
    }
};

  const validateTransaction = async (txid, expectedDestination, expectedAmount, type, retries = 3) => {
    if (!/^[0-9a-fA-F]{64}$/.test(txid)) {
      setError("Invalid transaction ID format. It must be a 64-character hexadecimal string.");
      console.error("CreateContract: Invalid transaction ID format:", txid);
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
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }
        const result = await response.json();
        if (!result.success) {
          if (result.message === "Insufficient confirmations" && attempt < retries) {
            setError(`Waiting for transaction confirmations (attempt ${attempt}/${retries}). Please wait a few minutes and try again.`);
            console.error(`CreateContract: ${type} transaction validation error (attempt ${attempt}):`, result.message);
            await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds
            continue;
          }
          throw new Error(result.message || `Failed to validate ${type} transaction`);
        }
        console.log(`CreateContract: ${type} transaction validated:`, txid);
        return true;
      } catch (err) {
        setError(`Failed to validate ${type} transaction: ${err.message}. Ensure the transaction ID is correct, sends ${expectedAmount} DASH to ${expectedDestination}, and has at least 1 confirmation.`);
        console.error(`CreateContract: ${type} transaction validation error (attempt ${attempt}):`, err);
        if (attempt === retries) {
          return false;
        }
      } finally {
        setLoading(false);
      }
    }
    return false;
  };

  const handleValidateTransactions = async () => {
    if (!transactionId) {
      setError("Please enter the stake transaction ID");
      console.log("CreateContract: Missing transaction ID");
      return;
    }
    const stakeAmount = Number(stake).toFixed(8);
    if (Number(stake) <= 0) {
      setError("Stake amount must be greater than 0");
      console.log("CreateContract: Invalid stake amount:", stake);
      return;
    }

    const stakeValid = await validateTransaction(transactionId, multisigAddress, stakeAmount, "stake");

    if (stakeValid) {
      setStakeTxValidated(true);
      setMessage("Stake transaction validated successfully! You can now create the contract.");
    } else {
      setStakeTxValidated(false);
    }
  };

 // Form submission handler
 const handleSubmit = async (e) => {
  e.preventDefault();
  if (!walletConnected || !signature) {
    setError("Please connect and sign with your wallet first");
    console.log("CreateContract: Attempted contract creation without wallet or signature");
    return;
  }
  if (!stakeTxValidated) {
    setError("Please validate the stake transaction before creating the contract");
    console.log("CreateContract: Attempted contract creation without validated transaction");
    return;
  }
  if (!redeemScript || !/^[0-9a-fA-F]+$/.test(redeemScript)) {
    setError("Invalid or missing redeemScript. Please regenerate the multisig address.");
    console.log("CreateContract: Invalid redeemScript:", redeemScript);
    setLoading(false);
    return;
  }

  setLoading(true);
  console.log("CreateContract: Form submitted:", {
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
    redeemScript // Debug
  });

  const validationData = {
    eventId,
    outcome,
    positionType,
    stake,
    odds,
    walletAddress,
    expiration_date: acceptanceDeadline,
    signature,
  };
  const validationResult = await validateContractCreation(validationData, selectedEvent);
  if (!validationResult.isValid) {
    setError(validationResult.message);
    console.log("CreateContract: Validation failed:", validationResult.message);
    setLoading(false);
    return;
  }

  // SKIP BALANCE CHECK — STAKE IS ALREADY IN MULTISIG
  console.log("CreateContract: Stake transaction validated. Skipping wallet balance check.");

  setError("");
  console.log("CreateContract: Creating contract");

  try {
    const result = await createContract({
      contract_id: `CONTRACT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      event_id: eventId,
      title: selectedEvent ? selectedEvent.title : '',
      creator_address: walletAddress,
      outcome,
      position_type: positionType,
      stake: Number(stake),
      odds: Number(odds),
      acceptance_deadline: new Date(`${acceptanceDeadline}:00+02:00`).toISOString(),
      multisig_address: multisigAddress,
      redeem_script: redeemScript,
      refund_transaction_id: '',
      creator_public_key: creatorPublicKey,
      transaction_id: transactionId,
      fee_transaction_id: '',
      signature,
    });
    console.log("CreateContract: Full response from createContract:", JSON.stringify(result)); // Debug
    if (result.error) {
      setError(result.error);
      console.log("CreateContract: createContract failed:", result.error);
    } else {
      console.log("CreateContract: Contract created successfully, contract_id:", result.contract_id);
      navigate("/marketplace");
    }
  } catch (err) {
    setError("Failed to create contract: " + err.message);
    console.error("CreateContract: Contract creation error:", err);
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-background p-4">
      <PageHeader title={selectedEvent ? `Create Contract for ${selectedEvent.title}` : "Create Contract"} />
      <main className="max-w-3xl mx-auto mt-6">
        <div className="mb-6 text-center">
          <Link to="/how-it-works" className="text-blue-500 hover:underline text-sm">
            Learn How It Works
          </Link>
        </div>
        {eventsLoading && <p className="text-gray-600 text-sm">Loading event...</p>}
        {eventsError && <p className="text-red-500 text-sm">Error: {eventsError}</p>}
        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        {selectedEvent ? (
          <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-6">
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

            <div className="mb-6">
              <label htmlFor="walletAddress" className="block text-lg font-bold text-primary mb-2">
                Your DASH Wallet Address
              </label>
              <input
                id="walletAddress"
                type="text"
                className="border p-2 rounded w-full text-sm"
                value={walletAddress}
                onChange={(e) => {
                  console.log("CreateContract: Wallet address changed:", e.target.value);
                  setWalletAddress(e.target.value);
                }}
                placeholder="Enter your DASH testnet wallet address (starts with 'y')"
                disabled={loading}
                aria-label="DASH wallet address"
              />
              <p className="text-gray-600 text-xs mt-1">
                Enter your DASH testnet wallet address (26-35 characters, starting with 'y').
              </p>
            </div>

            <div className="mb-6">
              <label htmlFor="creatorPublicKey" className="block text-lg font-bold text-primary mb-2">
                Your Public Key
              </label>
              <input
                id="creatorPublicKey"
                type="text"
                className="border p-2 rounded w-full text-sm"
                value={creatorPublicKey}
                onChange={(e) => {
                  console.log("CreateContract: Public key changed:", e.target.value);
                  setCreatorPublicKey(e.target.value);
                }}
                placeholder="Enter your public key from Dash Core (validateaddress)"
                disabled={loading}
                aria-label="Creator public key"
              />
              <p className="text-gray-600 text-xs mt-1">
                Run <code>validateaddress your_wallet_address</code> in Dash Core (testnet mode) and copy the <code>pubkey</code> field.
              </p>
            </div>

            <div className="mb-6">
              <label htmlFor="outcome" className="block text-lg font-bold text-primary mb-2">
                Outcome
              </label>
              <select
                id="outcome"
                className="border p-2 rounded w-full text-sm"
                value={outcome}
                onChange={(e) => {
                  console.log("CreateContract: Outcome changed:", e.target.value);
                  setOutcome(e.target.value);
                }}
                disabled={loading}
                aria-label="Contract outcome"
              >
                <option value="">Select an outcome</option>
                {parseOutcomes(selectedEvent.possible_outcomes).map(
                  (opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  )
                )}
              </select>
            </div>

            <div className="mb-6">
              <label className="block text-lg font-bold text-primary mb-2">Position Type</label>
              <p className="text-gray-600 text-sm mb-2">
                Note: You can only create a <strong>Sell</strong> contract here. To accept a contract (Buy), use the order book.
              </p>
              <select
                id="positionType"
                className="border p-2 rounded w-full text-sm"
                value={positionType}
                onChange={(e) => {
                  console.log("CreateContract: Position type changed:", e.target.value);
                  setPositionType(e.target.value);
                }}
                disabled={loading}
                aria-label="Position type"
              >
                <option value="sell">Sell (Lay)</option>
              </select>
            </div>

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
                  const value = e.target.value;
                  if (value === "" || Number(value) > 0) {
                    console.log("CreateContract: Stake changed:", value);
                    setStake(value);
                  }
                }}
                placeholder="Enter stake amount (e.g., 1)"
                disabled={loading}
                aria-label="Stake amount"
              />
              <p className="text-gray-600 text-xs mt-1">
                Note: A small network fee (0.001 DASH) will be deducted from your stake if the contract is refunded or settled.
              </p>
            </div>

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
                onChange={(e) => {
                  console.log("CreateContract: Odds changed:", e.target.value);
                  setOdds(e.target.value);
                }}
                placeholder="Enter odds (e.g., 2.00, must be greater than 1)"
                disabled={loading}
                aria-label="Odds"
              />
              <p className="text-gray-600 text-xs mt-1">Enter odds greater than 1 (e.g., 1.01 or higher).</p>
            </div>

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
                max={selectedEvent ? selectedEvent.event_date.slice(0, 16) : undefined}
                onChange={(e) => {
                  console.log("CreateContract: Acceptance deadline changed:", e.target.value);
                  setAcceptanceDeadline(e.target.value);
                }}
                disabled={loading}
                aria-label="Acceptance deadline"
              />
              <p className="text-gray-600 text-xs mt-1">
                Select a date and time before or on the event time (at least 5 minutes from now).
              </p>
            </div>

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
                    Please sign the message <code>SettleInDash:{walletAddress}</code> in Dash Core (Tools &gt; Sign Message) and enter the signature below.
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
                      Note: A small network fee (0.001 DASH) will be deducted from your stake if the contract is refunded or settled.
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

            {message && <p className="text-green-500 text-sm mt-2">{message}</p>}
            {loading && <p className="text-blue-500 text-sm mt-2">Processing...</p>}
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <button
              type="submit"
              className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50 text-sm"
              disabled={contractLoading || eventsLoading || !walletConnected || !signature || !stakeTxValidated || loading}
              aria-label="Create Contract"
            >
              {loading ? "Creating..." : contractLoading ? "Creating..." : "Create Contract"}
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