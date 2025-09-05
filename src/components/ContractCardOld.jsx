// src/components/CreateContract.jsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useContracts } from "../hooks/useContracts";
import { useEvents } from "../hooks/useEvents";
import TermsSummary from "./TermsSummary";
import { validateWalletAddress, validateContractCreation } from "../utils/validation";
import PageHeader from "../utils/formats/PageHeader.jsx";
import Dash from "dash";
import * as DashCore from "@dashevo/dashcore-lib";
import { ORACLE_PUBLIC_KEY } from "../utils/constants";
import { Buffer } from "buffer";
import { Html5Qrcode } from "html5-qrcode";
import QRCode from "qrcode";
globalThis.Buffer = Buffer;

const CreateContract = () => {
  const [eventId, setEventId] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [outcome, setOutcome] = useState("");
  const [positionType, setPositionType] = useState("sell");
  const [stake, setStake] = useState("");
  const [odds, setOdds] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [acceptanceDeadline, setAcceptanceDeadline] = useState("");
  const [error, setError] = useState("");
  const [walletConnected, setWalletConnected] = useState(false);
  const [client, setClient] = useState(null);
  const [message, setMessage] = useState("");
  const [multisigAddress, setMultisigAddress] = useState("");
  const [signedTx, setSignedTx] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [transactionQrCode, setTransactionQrCode] = useState(null);
  const [signature, setSignature] = useState(null);
  const [manualSignature, setManualSignature] = useState("");
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const qrReaderRef = useRef(null);

  const { createContract, loading: contractLoading } = useContracts();
  const { events, getEvents, loading: eventsLoading, error: eventsError } = useEvents();
  const navigate = useNavigate();
  const location = useLocation();

  const minDateTime = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);

  // Initialize Dash Platform client
  useEffect(() => {
    const dashClient = new Dash.Client({ network: "testnet" });
    setClient(dashClient);
    console.log("CreateContract: Initialized Dash Platform client");
  }, []);

  // Fetch events
  const fetchEvents = useCallback(async () => {
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
        } else {
          setError("Selected event not found");
        }
      }
    }
  }, [getEvents, location.search]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Connect wallet and generate QR code
  const connectWallet = async () => {
    try {
      setLoading(true);
      const validation = await validateWalletAddress(walletAddress, "testnet");
      if (validation.isValid) {
        setWalletConnected(true);
        setMessage("Wallet address validated! Ready to create contract.");
        setQrCodeUrl(null);
      } else if (validation.qrCode) {
        setQrCodeUrl(validation.qrCode);
        setMessage(
          `Please sign the message 'SettleInDash:${walletAddress}' in your Dash wallet. For iPhone users, the Dash Wallet app may not support signing. Use Dash Core on a desktop (Tools &gt; Sign Message) or export your private key to sign manually.`
        );
        setIsScanning(false);
      } else {
        setError(validation.message);
      }
      console.log("validateWalletAddress:", { walletAddress, qrCode: validation.qrCode });
    } catch (err) {
      setError("Failed to initiate wallet connection: " + err.message);
      console.error("CreateContract: Wallet connection error", err);
    } finally {
      setLoading(false);
    }
  };

  // Verify manual signature
  const verifyManualSignature = async () => {
    if (!manualSignature) {
      setError("Please enter a signature");
      return;
    }
    try {
      setLoading(true);
      const validation = await validateWalletAddress(walletAddress, "testnet", manualSignature);
      if (validation.isValid) {
        setSignature(manualSignature);
        setWalletConnected(true);
        setMessage("Wallet successfully connected and signed!");
        setQrCodeUrl(null);
        setManualSignature("");
      } else {
        setError(validation.message);
      }
    } catch (err) {
      setError("Failed to verify manual signature: " + err.message);
      console.error("CreateContract: Manual signature verification error", err);
    } finally {
      setLoading(false);
    }
  };

  // Start QR scanner
  const startQRScanner = (type = "wallet") => {
    if (!document.getElementById("qr-reader")) {
      setError("QR reader element not found. Please refresh the page.");
      return;
    }
    if (qrReaderRef.current) {
      qrReaderRef.current.stop().catch(() => {});
    }
    qrReaderRef.current = new Html5Qrcode("qr-reader");
    setIsScanning(true);
    qrReaderRef.current
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          if (type === "wallet") {
            // Handle signature QR code (if wallet supports it)
            if (decodedText.startsWith("signmessage:")) {
              const [, address, message, sig] = decodedText.split(":");
              if (address === walletAddress && message === `SettleInDash:${walletAddress}`) {
                setSignature(sig);
                setMessage("Signature captured! Verifying...");
                qrReaderRef.current.stop().then(() => {
                  setIsScanning(false);
                  setQrCodeUrl(null);
                  validateWalletAddress(walletAddress, "testnet", sig).then((validation) => {
                    if (validation.isValid) {
                      setWalletConnected(true);
                      setMessage("Wallet successfully connected and signed!");
                    } else {
                      setError(validation.message);
                      setWalletConnected(false);
                    }
                  });
                });
              } else {
                setError("Invalid QR code: Address or message does not match");
                qrReaderRef.current.stop().then(() => setIsScanning(false));
              }
            } else {
              setError(
                `Invalid QR code format. Expected a signature for 'SettleInDash:${walletAddress}'. For iPhone users, use Dash Core on a desktop (Tools &gt; Sign Message) to sign 'SettleInDash:${walletAddress}'.`
              );
              qrReaderRef.current.stop().then(() => setIsScanning(false));
            }
          } else if (type === "transaction") {
            const signedTransaction = decodedText;
            setSignedTx(signedTransaction);
            qrReaderRef.current.stop().then(() => {
              setIsScanning(false);
              setTransactionQrCode(null);
              try {
                const tx = new DashCore.Transaction(signedTransaction);
                if (!tx.verify()) {
                  setError("Invalid signed transaction");
                  setLoading(false);
                  return;
                }
                client
                  .platform.broadcastTransaction(signedTransaction)
                  .then(async (txid) => {
                    setMessage("Transaction broadcasted successfully! Transaction ID: " + txid);
                    const result = await createContract({
                      contract_id: document.id,
                      event_id: eventId,
                      outcome,
                      position_type: positionType,
                      stake: Number(stake),
                      odds: Number(odds),
                      category: selectedEvent.category,
                      WalletAddress: walletAddress,
                      acceptanceDeadline: deadline.toISOString(),
                      additional_contract_creator: additionalContractCreator,
                      transaction_id: txid,
                      multisigAddress,
                      signature,
                    });
                    if (result.error) {
                      setError(result.error);
                      console.log("CreateContract: createContract failed:", result.error);
                    } else {
                      setMessage("Contract created and funds locked! Waiting for acceptance...");
                      console.log("CreateContract: Contract created successfully, contract_id:", result.contract_id);
                      navigate("/marketplace");
                    }
                  })
                  .catch((err) => {
                    setError("Failed to broadcast transaction: " + err.message);
                    console.error("CreateContract: Transaction broadcast error", err);
                  })
                  .finally(() => {
                    setLoading(false);
                  });
              } catch (err) {
                setError("Invalid signed transaction: " + err.message);
                console.error("CreateContract: Transaction verification error", err);
                setLoading(false);
              }
            });
          }
        },
        (error) => {
          console.warn("QR Scan error:", error);
          setError(
            `Failed to scan ${type} QR code: ${error}. For wallet validation, try manually signing 'SettleInDash:${walletAddress}' in a desktop wallet like Dash Core (Tools &gt; Sign Message).`
          );
        }
      )
      .catch((err) => {
        setError(`Failed to start QR scanner for ${type}: ${err.message}`);
        setIsScanning(false);
        console.error("CreateContract: QR scanner error", err);
      });
  };

  // Stop QR scanner on unmount
  useEffect(() => {
    return () => {
      if (qrReaderRef.current) {
        qrReaderRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const handleEventChange = useCallback(
    (e) => {
      const selectedEventId = e.target.value;
      console.log("CreateContract: Event changed:", selectedEventId);
      const event = events.find((e) => e.event_id === selectedEventId);
      setEventId(selectedEventId);
      setSelectedEvent(event);
      setOutcome("");
      setAcceptanceDeadline("");
      setError("");
    },
    [events]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!walletConnected || !client || !signature) {
      setError("Please connect and sign with your wallet first");
      console.log("CreateContract: Attempted contract creation without wallet or signature");
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
    });

    const validationData = {
      eventId,
      outcome,
      positionType,
      stake,
      odds,
      walletAddress,
      acceptanceDeadline,
      signature,
    };
    const validationResult = await validateContractCreation(validationData, selectedEvent);
    if (!validationResult.isValid) {
      setError(validationResult.message);
      console.log("CreateContract: Validation failed:", validationResult.message);
      if (validationResult.qrCode) setQrCodeUrl(validationResult.qrCode);
      setLoading(false);
      return;
    }

    setError("");
    console.log("CreateContract: Calling createContract");

    let document;
    const eventTime = new Date(selectedEvent.event_date);
    const deadline = new Date(`${acceptanceDeadline}:00+02:00`);
    const additionalContractCreator = Number(stake) * 0.1;

    try {
      const creatorPublicKey = new DashCore.PublicKey.fromAddress(new DashCore.Address(walletAddress, "testnet")).toString();
      const accepterPlaceholderKey = new DashCore.PublicKey("02a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef123456789012");
      const oraclePublicKey = new DashCore.PublicKey(ORACLE_PUBLIC_KEY);

      const multisigScript = new DashCore.Script()
        .add(new DashCore.Opcode().fromString("OP_2"))
        .add(creatorPublicKey)
        .add(accepterPlaceholderKey)
        .add(oraclePublicKey)
        .add(new DashCore.Opcode().fromString("OP_3"))
        .add(new DashCore.Opcode().fromString("OP_CHECKMULTISIG"));
      const multisigAddress = new DashCore.Address(multisigScript.toScriptHashOut(), "testnet").toString();
      setMultisigAddress(multisigAddress);

      let identity = await client.platform.identities.getIdentityByPublicKey(creatorPublicKey);
      if (!identity) {
        const { identity: newIdentity } = await client.platform.identities.register();
        identity = newIdentity;
      }
      const dataContract = await client.platform.contracts.create(
        {
          $schema: "http://json-schema.org/draft-07/schema#",
          properties: {
            event_id: { type: "string" },
            outcome: { type: "string" },
            stake: { type: "number" },
            odds: { type: "number" },
            acceptanceDeadline: { type: "string", format: "date-time" },
            creatorWallet: { type: "string" },
            accepterWallet: { type: "string", default: null },
            status: { type: "string", enum: ["open", "accepted", "settled", "cancelled", "twist"] },
            outcomeResult: { type: "boolean", default: null },
            additional_contract_creator: { type: "number", default: null },
            additional_contract_accepter: { type: "number", default: null },
            multisigAddress: { type: "string" },
          },
          required: ["event_id", "outcome", "stake", "odds", "acceptanceDeadline", "creatorWallet", "status", "multisigAddress"],
        },
        identity
      );
      await client.platform.contracts.publish(dataContract, identity);

      document = await client.platform.documents.create(
        `${dataContract.id}.contract`,
        identity,
        {
          event_id: eventId,
          outcome,
          stake: Number(stake),
          odds: Number(odds),
          acceptanceDeadline: deadline.toISOString(),
          creatorWallet: walletAddress,
          status: "open",
          additional_contract_creator: additionalContractCreator,
          multisigAddress,
        }
      );
      await client.platform.documents.broadcast({ create: [document] }, identity);

      const utxoTxId = prompt("Enter UTXO txid from your wallet (e.g., from listunspent)");
      const utxoOutputIndex = parseInt(prompt("Enter UTXO output index (e.g., 0)"));
      const utxoAmount = parseFloat(prompt("Enter UTXO amount in DASH (e.g., 1.0)"));
      if (!utxoTxId || isNaN(utxoOutputIndex) || isNaN(utxoAmount) || utxoAmount < Number(stake) + additionalContractCreator) {
        setError("Invalid UTXO details or insufficient funds");
        console.log("CreateContract: Invalid UTXO input");
        setLoading(false);
        return;
      }

      const totalAmount = (Number(stake) + additionalContractCreator) * 1e8;
      const unsignedTx = new DashCore.Transaction()
        .from(
          new DashCore.Transaction.UnspentOutput({
            txId: utxoTxId,
            outputIndex: utxoOutputIndex,
            address: walletAddress,
            script: new DashCore.Script().fromAddress(walletAddress),
            satoshis: utxoAmount * 1e8,
          })
        )
        .to(multisigAddress, totalAmount)
        .change(walletAddress)
        .fee(10000);

      const unsignedTxHex = unsignedTx.toString();
      const txQrCode = await QRCode.toDataURL(unsignedTxHex);
      setTransactionQrCode(txQrCode);
      setMessage("Scan this QR code with your Dash wallet to sign the transaction to lock funds in the contract.");
      startQRScanner("transaction");
    } catch (err) {
      setError("Failed to create contract: " + err.message);
      console.error("CreateContract: Contract creation error", err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <PageHeader title="Create Contract" />
      <main className="max-w-3xl mx-auto mt-6">
        {/* Wallet Connection */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Connect DASH Wallet</h2>
          <input
            id="walletAddress"
            type="text"
            className="border p-2 rounded w-full text-sm mb-4"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="Enter a valid DASH address (starts with 'X' or 'y' for testnet)"
            disabled={walletConnected || loading}
            aria-label="Creator wallet address"
          />
          <button
            onClick={connectWallet}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
            disabled={walletConnected || loading}
            aria-label="Connect DASH wallet"
          >
            {walletConnected ? `Connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "Connect Wallet"}
          </button>
          {qrCodeUrl && !signature && (
            <div className="mt-4">
              <p className="text-gray-700 text-sm mb-2">
                Scan this QR code to view the message 'SettleInDash:{walletAddress}' to sign. For iPhone users, the Dash Wallet app may not support signing. Use Dash Core on a desktop (Tools &gt; Sign Message) or export your private key to sign manually. Example for Dash Core: <code>signmessage "{walletAddress}" "SettleInDash:{walletAddress}"</code>
              </p>
              <img src={qrCodeUrl} alt="QR Code for wallet signing" className="w-64 h-64 mx-auto" />
              <button
                onClick={() => startQRScanner("wallet")}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 text-sm mt-2"
                disabled={loading || isScanning}
                aria-label="Start QR Scan"
              >
                {isScanning ? "Scanning..." : "Start QR Scanner"}
              </button>
              <div className="mt-4">
                <label htmlFor="manualSignature" className="block text-sm text-gray-700 mb-2">
                  Or enter signature manually:
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
                  onClick={verifyManualSignature}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
                  disabled={loading}
                  aria-label="Verify manual signature"
                >
                  Verify Manual Signature
                </button>
              </div>
            </div>
          )}
          {transactionQrCode && (
            <div className="mt-4">
              <p className="text-gray-700 text-sm mb-2">
                Scan this QR code with your Dash wallet to sign the transaction to lock funds in the contract. Ensure your wallet supports signing raw transaction hex.
              </p>
              <img src={transactionQrCode} alt="Transaction QR Code" className="w-64 h-64 mx-auto" />
              <button
                onClick={() => startQRScanner("transaction")}
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 text-sm mt-2"
                disabled={loading || isScanning}
                aria-label="Start Transaction QR Scan"
              >
                {isScanning ? "Scanning..." : "Start Transaction QR Scanner"}
              </button>
            </div>
          )}
          <div
            id="qr-reader"
            style={{ width: "300px", height: "300px", display: isScanning ? "block" : "none", margin: "0 auto" }}
          ></div>
          {message && <p className="text-green-500 text-sm mt-2">{message}</p>}
          {loading && <p className="text-blue-500 text-sm mt-2">Processing...</p>}
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>

        {/* Add "Learn How It Works" link */}
        <div className="mb-6 text-center">
          <Link
            to="/how-it-works"
            className="text-blue-500 hover:underline text-sm"
          >
            Learn How It Works
          </Link>
        </div>

        {eventsLoading && <p className="text-gray-600 text-sm">Loading events...</p>}
        {eventsError && <p className="text-red-500 text-sm">Error: {eventsError}</p>}
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-6">
          <div className="mb-6">
            <label htmlFor="eventId" className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Select Event
            </label>
            <select
              id="eventId"
              className="border p-2 rounded w-full text-sm sm:text-base"
              value={eventId}
              onChange={handleEventChange}
              disabled={loading}
              aria-label="Select event"
            >
              <option value="">Select an event</option>
              {events.map((event) => (
                <option key={event.event_id} value={event.event_id}>
                  {event.title} ({new Date(event.event_date).toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          {selectedEvent && (
            <div className="mb-6">
              <label htmlFor="outcome" className="block text-lg sm:text-xl font-bold text-primary mb-2">
                Outcome
              </label>
              <select
                id="outcome"
                className="border p-2 rounded w-full text-sm sm:text-base"
                value={outcome}
                onChange={(e) => {
                  console.log("CreateContract: Outcome changed:", e.target.value);
                  setOutcome(e.target.value);
                }}
                disabled={loading}
                aria-label="Contract outcome"
              >
                <option value="">Select an outcome</option>
                {(JSON.parse(selectedEvent.possible_outcomes || "[]") || selectedEvent.possible_outcomes?.split(",") || []).map(
                  (opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  )
                )}
              </select>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-lg sm:text-xl font-bold text-primary mb-2">Position Type</label>
            <p className="text-gray-600 text-sm sm:text-base mb-2">
              Note: You can only create a <strong>Sell</strong> contract here. To accept a contract (Buy), use the order book.
            </p>
            <select
              id="positionType"
              className="border p-2 rounded w-full text-sm sm:text-base"
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
            <label htmlFor="stake" className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Stake (DASH)
            </label>
            <input
              id="stake"
              type="number"
              className="border p-2 rounded w-full text-sm sm:text-base"
              value={stake}
              min="1"
              step="0.01"
              onChange={(e) => {
                console.log("CreateContract: Stake changed:", e.target.value);
                setStake(e.target.value);
              }}
              placeholder="Enter stake amount (e.g., 10)"
              disabled={loading}
              aria-label="Stake amount"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="odds" className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Odds (e.g., 2.00 for 2:1)
            </label>
            <input
              id="odds"
              type="number"
              step="0.01"
              className="border p-2 rounded w-full text-sm sm:text-base"
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
            <p className="text-gray-600 text-xs sm:text-sm mt-1">Enter odds greater than 1 (e.g., 1.01 or higher).</p>
          </div>

          <div className="mb-6">
            <label htmlFor="acceptanceDeadline" className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Acceptance Deadline
            </label>
            <input
              id="acceptanceDeadline"
              type="datetime-local"
              className="border p-2 rounded w-full text-sm sm:text-base"
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
            <p className="text-gray-600 text-xs sm:text-sm mt-1">
              Select a date and time before or on the event time (at least 5 minutes from now).
            </p>
          </div>

          <button
            type="submit"
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50 text-sm sm:text-base"
            disabled={contractLoading || eventsLoading || !walletConnected || !signature || loading}
            aria-label="Create Contract"
          >
            {loading ? "Creating..." : contractLoading ? "Creating..." : "Create Contract"}
          </button>
        </form>
        <TermsSummary />
      </main>
    </div>
  );
};

export default CreateContract;