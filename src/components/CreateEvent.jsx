import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useEvents } from "../hooks/useEvents";
import { categories } from "../utils/categories";
import { validateEventCreation } from "../utils/validation";
import PageHeader from "../utils/formats/PageHeader.jsx";
import TermsSummary from "./TermsSummary";
import { Html5Qrcode } from "html5-qrcode";
import QRCode from "qrcode";

const CreateEvent = () => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0] || "");
  const [eventDate, setEventDate] = useState("");
  const [possibleOutcomes, setPossibleOutcomes] = useState(["", ""]);
  const [oracleSource, setOracleSource] = useState("");
  const [eventWalletAddress, setEventWalletAddress] = useState("");
  const [signature, setSignature] = useState("");
  const [manualSignature, setManualSignature] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [transactionQrCode, setTransactionQrCode] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const { createEvent, loading: eventLoading } = useEvents();
  const navigate = useNavigate();

  // Set minimum date to 5 minutes from now
  const minDateTime = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);

  // Handle adding a new outcome field
  const addOutcome = () => {
    setPossibleOutcomes([...possibleOutcomes, ""]);
    console.log("CreateEvent: Added new outcome field");
  };

  // Handle removing an outcome field
  const removeOutcome = (index) => {
    if (possibleOutcomes.length > 2) {
      setPossibleOutcomes(possibleOutcomes.filter((_, i) => i !== index));
      console.log("CreateEvent: Removed outcome at index:", index);
    }
  };

  // Handle outcome change
  const handleOutcomeChange = (index, value) => {
    const newOutcomes = [...possibleOutcomes];
    newOutcomes[index] = value;
    setPossibleOutcomes(newOutcomes);
    console.log(`CreateEvent: Outcome ${index} changed to:`, value);
  };

  // Start QR scanner for signature
  const startQRScanner = async () => {
    if (!document.getElementById("qr-reader-event")) {
      setError("QR reader element not found. Please refresh the page.");
      return;
    }
    const qrReader = new Html5Qrcode("qr-reader-event");
    setIsScanning(true);
    setLoading(true);
    try {
      await qrReader.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          console.log("CreateEvent: QR decodedText:", decodedText);
          if (decodedText.startsWith("signmessage:")) {
            const [, address, message, sig] = decodedText.split(":");
            console.log("CreateEvent: QR parsed:", { address, message, sig });
            if (address === eventWalletAddress && message === `SettleInDash:${eventWalletAddress}`) {
              const response = await fetch("https://settleindash.com/api/events.php?action=verify_signature", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  address,
                  message,
                  signature: sig,
                }),
              });
              const result = await response.json();
              console.log("CreateEvent: startQRScanner request:", { address, message, signature: sig });
              console.log("CreateEvent: startQRScanner response:", result);
              if (result.isValid) {
                setSignature(sig);
                setWalletConnected(true);
                setMessage("Signature captured! Proceed with event creation.");
                qrReader.stop().then(() => {
                  setIsScanning(false);
                  setTransactionQrCode(null);
                  setLoading(false);
                });
              } else {
                setError(result.message || result.error || "Invalid signature from QR code");
                qrReader.stop().then(() => {
                  setIsScanning(false);
                  setLoading(false);
                });
              }
            } else {
              setError("Invalid QR code: Address or message does not match");
              qrReader.stop().then(() => {
                setIsScanning(false);
                setLoading(false);
              });
            }
          } else {
            setError(
              `Invalid QR code format. Expected a signature for <code>SettleInDash:${eventWalletAddress}</code>. Use Dash Core (Tools &gt; Sign Message).`
            );
            qrReader.stop().then(() => {
              setIsScanning(false);
              setLoading(false);
            });
          }
        },
        (error) => {
          console.warn("CreateEvent: QR Scan error:", error);
          setError(`Failed to scan signature QR code: ${error}. Try entering signature manually.`);
          setIsScanning(false);
          setLoading(false);
        }
      );
    } catch (err) {
      setError(`Failed to start QR scanner: ${err.message}`);
      setIsScanning(false);
      setLoading(false);
      console.error("CreateEvent: QR scanner error", err);
    }
  };

  // Verify manual signature
  const verifyManualSignature = async () => {
    if (!manualSignature) {
      setError("Please enter a signature");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("https://settleindash.com/api/events.php?action=verify_signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: eventWalletAddress,
          message: `SettleInDash:${eventWalletAddress}`,
          signature: manualSignature,
        }),
      });
      const result = await response.json();
      console.log("CreateEvent: verifyManualSignature request:", {
        address: eventWalletAddress,
        message: `SettleInDash:${eventWalletAddress}`,
        signature: manualSignature,
      });
      console.log("CreateEvent: verifyManualSignature response:", result);
      if (result.isValid) {
        setSignature(manualSignature);
        setWalletConnected(true);
        setMessage("Signature captured! Proceed with event creation.");
        setManualSignature("");
        setTransactionQrCode(null);
      } else {
        setError(result.message || result.error || "Failed to verify signature");
      }
    } catch (err) {
      setError("Failed to verify signature: " + err.message);
      console.error("CreateEvent: Manual signature verification error", err);
    } finally {
      setLoading(false);
    }
  };

  // Prompt for signature
  const handleSignaturePrompt = async () => {
    setError("");
    setMessage("");
    setLoading(true);
    if (!eventWalletAddress || !/^y[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(eventWalletAddress)) {
      setError("Invalid Dash testnet wallet address (must start with 'y', 26-35 characters)");
      console.log("CreateEvent: Validation failed - invalid wallet address");
      setLoading(false);
      return;
    }
    try {
      const qrCodeUrl = await QRCode.toDataURL(`signmessage:${eventWalletAddress}:SettleInDash:${eventWalletAddress}:`);
      setTransactionQrCode(qrCodeUrl);
      setMessage(`Please sign the message 'SettleInDash:${eventWalletAddress}' in Dash Core (Tools &gt; Sign Message) or enter the signature manually below.`);
      setLoading(false);
    } catch (err) {
      setError("Failed to generate signature QR code: " + err.message);
      console.error("CreateEvent: QR code generation error", err);
      setLoading(false);
    }
  };

  
    const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    console.log("CreateEvent: Form submitted:", { title, category, eventDate, possibleOutcomes, oracleSource, eventWalletAddress, signature });
    setError("");

    // Validate inputs using validateEventCreation
    const validationData = {
      title,
      category,
      event_date: eventDate ? new Date(`${eventDate}:00+02:00`).toISOString() : "",
      possible_outcomes: possibleOutcomes.filter(o => o.trim()),
      oracle_source: oracleSource || null,
      event_wallet_address: eventWalletAddress,
      signature,
    };
    console.log("CreateEvent: Validating event data:", validationData);
    const validationResult = await validateEventCreation(validationData);
    console.log("CreateEvent: Validation result:", validationResult);
    if (!validationResult.isValid) {
      setError(validationResult.message || "Invalid event data");
      console.log("CreateEvent: Validation failed:", validationResult.message);
      setLoading(false);
      return;
    }

    // Ensure at least two non-empty outcomes
    const validOutcomes = possibleOutcomes.filter((outcome) => outcome.trim() !== "");
    if (validOutcomes.length < 2) {
      setError("At least two non-empty outcomes are required");
      console.log("CreateEvent: Validation failed: Fewer than two outcomes");
      setLoading(false);
      return;
    }

    const eventTime = new Date(`${eventDate}:00+02:00`);
    if (eventTime < new Date()) {
      setError("Event date must be in the future");
      console.log("CreateEvent: Validation failed: Event date in the past");
      setLoading(false);
      return;
    }

    try {
      const result = await createEvent({
        title,
        category,
        event_date: eventTime.toISOString(),
        possible_outcomes: validOutcomes,
        oracle_source: oracleSource || null,
        event_wallet_address: eventWalletAddress,
        signature,
      });
      console.log("CreateEvent: createEvent result:", result);
      if (result.error) {
        setError(result.error);
        console.log("CreateEvent: createEvent failed:", result.error);
      } else {
        console.log("CreateEvent: Event created successfully, event_id:", result.event_id);
        navigate("/marketplace");
      }
    } catch (err) {
      setError("Failed to create event: " . err.message);
      console.error("CreateEvent: Event creation error", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <PageHeader title="Create Event" />
      <main className="max-w-3xl mx-auto mt-6">
        <div className="mb-6 text-center">
          <Link to="/how-it-works" className="text-blue-500 hover:underline text-sm">
            Learn How It Works
          </Link>
        </div>
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-6">
          <div className="mb-6">
            <label htmlFor="title" className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Event Title
            </label>
            <input
              id="title"
              type="text"
              className="border p-2 rounded w-full text-sm sm:text-base"
              value={title}
              onChange={(e) => {
                console.log("CreateEvent: Title changed:", e.target.value);
                setTitle(e.target.value);
              }}
              placeholder="Enter event title (e.g., Team A vs Team B)"
              aria-label="Event title"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="category" className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Category
            </label>
            <select
              id="category"
              className="border p-2 rounded w-full text-sm sm:text-base"
              value={category}
              onChange={(e) => {
                console.log("CreateEvent: Category changed:", e.target.value);
                setCategory(e.target.value);
              }}
              aria-label="Event category"
            >
              <option value="">Select a category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label htmlFor="eventDate" className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Event Date and Time
            </label>
            <input
              id="eventDate"
              type="datetime-local"
              className="border p-2 rounded w-full text-sm sm:text-base"
              value={eventDate}
              min={minDateTime}
              onChange={(e) => {
                console.log("CreateEvent: Event date changed:", e.target.value);
                setEventDate(e.target.value);
              }}
              aria-label="Event date and time"
            />
            <p className="text-gray-600 text-xs sm:text-sm mt-1">
              Select a future date and time (at least 5 minutes from now, Europe/Paris timezone).
            </p>
          </div>

          <div className="mb-6">
            <label className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Possible Outcomes
            </label>
            {possibleOutcomes.map((outcome, index) => (
              <div key={index} className="flex items-center mb-2">
                <input
                  type="text"
                  className="border p-2 rounded w-full text-sm sm:text-base"
                  value={outcome}
                  onChange={(e) => handleOutcomeChange(index, e.target.value)}
                  placeholder={`Outcome ${index + 1}`}
                  aria-label={`Outcome ${index + 1}`}
                />
                {possibleOutcomes.length > 2 && (
                  <button
                    type="button"
                    className="ml-2 text-red-500 hover:text-red-600 text-sm"
                    onClick={() => removeOutcome(index)}
                    aria-label={`Remove outcome ${index + 1}`}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="text-blue-500 hover:text-blue-600 text-sm"
              onClick={addOutcome}
              aria-label="Add another outcome"
            >
              Add Outcome
            </button>
          </div>

          <div className="mb-6">
            <label htmlFor="eventWalletAddress" className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Your DASH Wallet Address
            </label>
            <input
              id="eventWalletAddress"
              type="text"
              className="border p-2 rounded w-full text-sm sm:text-base"
              value={eventWalletAddress}
              onChange={(e) => {
                console.log("CreateEvent: Event wallet address changed:", e.target.value);
                setEventWalletAddress(e.target.value);
              }}
              placeholder="Enter a valid DASH testnet address (starts with 'y')"
              disabled={walletConnected || loading}
              aria-label="Event wallet address"
            />
          </div>

          <div className="mb-6">
            <label className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Wallet Signature
            </label>
            <button
              type="button"
              className="mt-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 text-sm"
              onClick={handleSignaturePrompt}
              disabled={isScanning || !eventWalletAddress || loading || walletConnected}
              aria-label="Generate QR code for signature"
            >
              {walletConnected ? "Wallet Connected" : "Sign with QR Code or Enter Signature"}
            </button>
            {transactionQrCode && (
              <div className="mt-4">
                <p className="text-gray-700 text-sm mb-2">
                  Please sign the message <code>SettleInDash:{eventWalletAddress}</code> in Dash Core (Tools &gt; Sign Message) or enter the signature manually below.
                </p>
                <img src={transactionQrCode} alt="QR Code" className="w-64 h-64 mx-auto" />
                <div className="mt-4">
                  <label htmlFor="manualSignature" className="block text-sm text-gray-700 mb-2">
                    Enter signature manually:
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
                    type="button"
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
                    onClick={verifyManualSignature}
                    disabled={loading || isScanning}
                    aria-label="Verify manual signature"
                  >
                    Verify Signature
                  </button>
                </div>
              </div>
            )}
            <div
              id="qr-reader-event"
              style={{ width: "300px", height: "300px", display: isScanning ? "block" : "none", margin: "0 auto" }}
            ></div>
          </div>

          <div className="mb-6">
            <label htmlFor="oracleSource" className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Oracle Source (Optional)
            </label>
            <input
              id="oracleSource"
              type="text"
              className="border p-2 rounded w-full text-sm sm:text-base"
              value={oracleSource}
              onChange={(e) => {
                console.log("CreateEvent: Oracle source changed:", e.target.value);
                setOracleSource(e.target.value);
              }}
              placeholder="Enter oracle source (e.g., SportsAPI)"
              aria-label="Oracle source"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {message && <p className="text-green-500 text-sm">{message}</p>}
          <button
            type="submit"
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50 text-sm sm:text-base"
            disabled={loading || eventLoading || !walletConnected}
            aria-label="Create Event"
          >
            {loading || eventLoading ? "Creating..." : "Create Event"}
          </button>
        </form>
        <TermsSummary />
      </main>
    </div>
  );
};

export default CreateEvent;