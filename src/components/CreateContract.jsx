import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useContracts } from "../hooks/useContracts";
import { useEvents } from "../hooks/useEvents";
import TermsSummary from "./TermsSummary";
import { validateWalletAddress, validateContractCreation, parseOutcomes } from "../utils/validation";
import { validateDashPublicKey, fetchConstants } from "../utils/constants";
import PageHeader from "../utils/formats/PageHeader.jsx";
import { Html5Qrcode } from "html5-qrcode";
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
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [constants, setConstants] = useState({ SETTLE_IN_DASH_WALLET: "", ORACLE_PUBLIC_KEY: "" });
  const qrReaderRef = useRef(null);

  const { createContract, loading: contractLoading } = useContracts();
  const { events, getEvents, loading: eventsLoading, error: eventsError } = useEvents();
  const navigate = useNavigate();
  const location = useLocation();

  const minDateTime = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);

  // Fetch constants on mount
  useEffect(() => {
    fetchConstants().then((result) => {
      setConstants(result);
      console.log("CreateContract: Fetched constants:", result);
    }).catch((err) => {
      console.error("CreateContract: Error fetching constants:", err);
      setConstants({ SETTLE_IN_DASH_WALLET: "", ORACLE_PUBLIC_KEY: "" });
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
      }
    }
  }, [getEvents, location.search]);

  useEffect(() => {
    handleFetchEvents();
  }, [handleFetchEvents]);

  useEffect(() => {
    return () => {
      if (qrReaderRef.current) {
        qrReaderRef.current.stop().catch(() => {});
      }
    };
  }, []);

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
          `Please sign the message 'SettleInDash:${walletAddress}' in Dash Core (Tools > Sign Message).`
        );
        setIsScanning(false);
      } else {
        setError(validation.message);
      }
      console.log("CreateContract: validateWalletAddress:", { walletAddress, qrCode: validation.qrCode });
    } catch (err) {
      setError("Failed to initiate wallet connection: " + err.message);
      console.error("CreateContract: Wallet connection error", err);
    } finally {
      setLoading(false);
    }
  };

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
        setManualSignature("");
        setQrCodeUrl(null);
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

  const startQRScanner = async () => {
    if (!document.getElementById("qr-reader")) {
      setError("QR reader element not found. Please refresh the page.");
      return;
    }
    if (qrReaderRef.current) {
      qrReaderRef.current.stop().catch(() => {});
    }
    qrReaderRef.current = new Html5Qrcode("qr-reader");
    setIsScanning(true);
    try {
      await qrReaderRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          if (decodedText.startsWith("signmessage:")) {
            const [, address, message, sig] = decodedText.split(":");
            if (address === walletAddress && message === `SettleInDash:${walletAddress}`) {
              const response = await fetch("https://settleindash.com/api/contracts.php?action=verify-signature", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ address, message, signature: sig }),
              });
              const result = await response.json();
              console.log("CreateContract: startQRScanner request:", { address, message, signature: sig });
              console.log("CreateContract: startQRScanner response:", result);
              if (result.isValid) {
                setSignature(sig);
                setMessage("Signature captured! Wallet connected.");
                setWalletConnected(true);
                qrReaderRef.current.stop().then(() => {
                  setIsScanning(false);
                  setQrCodeUrl(null);
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
              `Invalid QR code format. Expected a signature for <code>SettleInDash:${walletAddress}</code>. Use Dash Core (Tools > Sign Message).`
            );
            qrReaderRef.current.stop().then(() => setIsScanning(false));
          }
        },
        (error) => {
          console.warn("CreateContract: QR Scan error:", error);
          setError(`Failed to scan signature QR code: ${error}. Try entering signature manually.`);
          setIsScanning(false);
        }
      );
    } catch (err) {
      setError(`Failed to start QR scanner: ${err.message}`);
      setIsScanning(false);
      console.error("CreateContract: QR scanner error", err);
    } finally {
      setLoading(false);
    }
  };

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
    if (!walletConnected || !signature) {
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
      creatorPublicKey,
      multisigAddress,
      signature,
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

    setError("");
    console.log("CreateContract: Creating contract");

    try {
      const creatorPublicKeyInput = prompt(
        `Enter the public key for your wallet address (${walletAddress}).\n` +
        `In Dash Core (testnet mode), run: validateaddress "${walletAddress}"\n` +
        `Copy the "pubkey" field.`
      );
      if (!creatorPublicKeyInput || !validateDashPublicKey(creatorPublicKeyInput)) {
        throw new Error("Invalid or missing public key. Ensure you entered the correct 'pubkey' from Dash Core.");
      }
      setCreatorPublicKey(creatorPublicKeyInput);

      // Create multisig address
      const multisigResponse = await fetch("https://settleindash.com/api/contracts.php?action=create-multisig", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          public_keys: [creatorPublicKeyInput, constants.ORACLE_PUBLIC_KEY],
          required_signatures: 2,
          network: "testnet",
        }),
      });
      const multisigResult = await multisigResponse.json();
      if (!multisigResult.success) {
        throw new Error(multisigResult.error || "Failed to create multisig address");
      }
      setMultisigAddress(multisigResult.multisig_address);

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
        multisig_address: multisigResult.multisig_address,
        refund_transaction_id: '',
        creator_public_key: creatorPublicKeyInput,
        signature,
      });
      if (result.error) {
        setError(result.error);
        console.log("CreateContract: createContract failed:", result.error);
      } else {
        console.log("CreateContract: Contract created successfully, contract_id:", result.contract_id);
        navigate("/marketplace");
      }
    } catch (err) {
      setError("Failed to create contract: " + err.message);
      console.error("CreateContract: Contract creation error", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <PageHeader title="Create Contract" />
      <main className="max-w-3xl mx-auto mt-6">
        <div className="mb-6 text-center">
          <Link to="/how-it-works" className="text-blue-500 hover:underline text-sm">
            Learn How It Works
          </Link>
        </div>
        {eventsLoading && <p className="text-gray-600 text-sm">Loading events...</p>}
        {eventsError && <p className="text-red-500 text-sm">Error: {eventsError}</p>}
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-6">
          <div className="mb-6">
            <label htmlFor="eventId" className="block text-lg font-bold text-primary mb-2">
              Select Event
            </label>
            <select
              id="eventId"
              className="border p-2 rounded w-full text-sm"
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
          )}

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
            {qrCodeUrl && !signature && (
              <div className="mt-4">
                <p className="text-gray-700 text-sm mb-2">
                  Please sign the message <code>SettleInDash:{walletAddress}</code> in Dash Core (Tools &gt; Sign Message).
                </p>
                <img src={qrCodeUrl} alt="QR Code for wallet signing" className="w-64 h-64 mx-auto" />
                <button
                  onClick={() => startQRScanner()}
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
            <div
              id="qr-reader"
              style={{ width: "300px", height: "300px", display: isScanning ? "block" : "none", margin: "0 auto" }}
            ></div>
          </div>

          {message && <p className="text-green-500 text-sm mt-2">{message}</p>}
          {loading && <p className="text-blue-500 text-sm mt-2">Processing...</p>}
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          <button
            type="submit"
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50 text-sm"
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