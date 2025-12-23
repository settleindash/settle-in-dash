// src/components/CreateEvent.jsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useEvents } from "../hooks/useEvents";
import { useContracts } from "../hooks/useContracts";
import { categories } from "../utils/categories";
import { validateEventCreation } from "../utils/validation";
import PageHeader from "../utils/formats/PageHeader.jsx";
import TermsSummary from "./TermsSummary";
import QRCode from "qrcode";

const CreateEvent = () => {
  const { verifySignature, loading: apiLoading } = useContracts();
  const { createEvent, loading: eventLoading } = useEvents();
  const navigate = useNavigate();

  // Form fields
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0] || "");
  const [eventDate, setEventDate] = useState("");
  const [possibleOutcomes, setPossibleOutcomes] = useState(["", ""]);
  const [description, setDescription] = useState(""); // ← ADDED
  const [eventWalletAddress, setEventWalletAddress] = useState("");

  // Wallet
  const [signature, setSignature] = useState("");
  const [manualSignature, setManualSignature] = useState("");
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletQrCodeUrl, setWalletQrCodeUrl] = useState(null);

  // Grok validation — THESE WERE MISSING!
  const [grokResponse, setGrokResponse] = useState(null);
  const [grokLoading, setGrokLoading] = useState(false);
  const [grokError, setGrokError] = useState("");

  // General
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const minDateTime = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);

  // Outcome helpers
  const addOutcome = () => setPossibleOutcomes([...possibleOutcomes, ""]);
  const removeOutcome = (index) => {
    if (possibleOutcomes.length > 2) {
      setPossibleOutcomes(possibleOutcomes.filter((_, i) => i !== index));
    }
  };
  const handleOutcomeChange = (index, value) => {
    const newOutcomes = [...possibleOutcomes];
    newOutcomes[index] = value;
    setPossibleOutcomes(newOutcomes);
  };


  // Connect wallet & show QR (same as CreateContract)
  const connectWallet = async () => {
    if (!eventWalletAddress) return setError("Please enter your wallet address");
    if (!/^y[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(eventWalletAddress)) {
      return setError("Invalid Dash testnet address (must start with 'y')");
    }

    setLoading(true);
    setError("");
    try {
      const text = `SettleInDash:${eventWalletAddress}`;
      const url = await QRCode.toDataURL(text);
      setWalletQrCodeUrl(url);
      setMessage(`Sign the message "SettleInDash:${eventWalletAddress}" in Dash Core → Tools → Sign Message`);
    } catch (err) {
      setError("Failed to generate QR code");
    } finally {
      setLoading(false);
    }
  };

  // Verify signature — EXACT same logic as CreateContract (with retries)
  const verifyManualSignature = async () => {
    if (!manualSignature.trim()) {
      setError("Please enter a signature");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    const isValid = await verifySignature(eventWalletAddress, manualSignature.trim());

    if (isValid) {
      setSignature(manualSignature.trim());
      setWalletConnected(true);
      setMessage("Wallet connected and signature verified!");
      setManualSignature("");
      setWalletQrCodeUrl(null);
    } else {
      setError("Invalid signature");
    }

    setLoading(false);
  };


// NEW: Validate via dedicated backend endpoint (secure, no key exposure)
const validateWithGrok = async () => {
  const validOutcomes = possibleOutcomes.filter(o => o.trim());
  if (!title.trim() || !category || !eventDate || validOutcomes.length < 2 || !description.trim()) {
    setError("Please fill all fields including description before validating");
    return;
  }

  setGrokLoading(true);
  setGrokError("");
  setGrokResponse(null);

  try {
    const response = await fetch("https://settleindash.com/api/grok.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        category,
        event_date: eventDate,
        possible_outcomes: validOutcomes,
        description
      })
    });

    if (!response.ok) throw new Error(`Server error ${response.status}`);

    const result = await response.json();

    if (result.error) {
      setGrokError(result.error);
    } else {
      setGrokResponse(result);

      // Auto-apply improved description
      if (result.improved_description && result.improved_description !== description) {
        setDescription(result.improved_description);
        setMessage("Grok suggested a clearer description — applied automatically!");
      }
    }
  } catch (err) {
    console.error("Grok validation failed:", err);
    setGrokError("Validation failed: " + err.message);
  } finally {
    setGrokLoading(false);
  }
};


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!walletConnected) return setError("Please connect and sign your wallet first");
    if (!grokResponse?.is_valid) return setError("Event must be validated and approved by Grok first");


    setLoading(true);
    setError("");

    const validOutcomes = possibleOutcomes.filter((o) => o.trim());
    if (validOutcomes.length < 2) return setError("At least 2 outcomes required");

    const eventTime = new Date(eventDate);
    if (isNaN(eventTime.getTime())) {
      setError("Invalid date format");
      setLoading(false);
      return;
    }
    if (eventTime < new Date(Date.now() + 5 * 60 * 1000)) {
      setError("Event must be at least 5 minutes in the future");
      setLoading(false);
      return;
}

    
    const validationResult = await validateEventCreation({
      title,
      category,
      event_date: eventTime.toISOString(),
      possible_outcomes: validOutcomes,
      event_wallet_address: eventWalletAddress,
      signature,
    });

    if (!validationResult.isValid) {
      setError(validationResult.message);
      setLoading(false);
      return;
    }

    try {
      const result = await createEvent({
        title,
        category,
        event_date: eventTime.toISOString(),
        possible_outcomes: validOutcomes,
        event_wallet_address: eventWalletAddress,
        signature,
        description
      });

      if (result.error) {
        setError(result.error);
      } else {
        navigate("/marketplace");
      }
    } catch (err) {
      setError("Failed to create event: " + err.message);
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
              Select a future date and time at least 5 minutes from now in your local time zone.
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



          {/* NEW: Event Description */}
          <div className="mb-6">
            <label className="block text-lg font-bold text-primary mb-2">
              Event Description <span className="text-red-500">*</span>
            </label>
            <textarea
              className="border p-3 rounded w-full text-sm h-40 resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Clearly describe the event: what will happen, where, how it will be verified, any official sources..."
              required
            />
            <p className="text-xs text-gray-600 mt-1">
              This helps Grok validate that the event is fair and resolvable.
            </p>
          </div>

          {/* NEW: Grok Validation Button */}
          <div className="mb-6">
            <button
              type="button"
              onClick={validateWithGrok}
              disabled={grokLoading}
              className="w-full bg-purple-600 text-white py-4 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50"
            >
              {grokLoading ? "Validating with Grok..." : "Validate Event with Grok"}
            </button>
          </div>

          {/* NEW: Grok Response */}
          {grokResponse && (
            <div className={`p-5 rounded-lg border-2 mb-6 ${
              grokResponse.is_valid ? "bg-green-50 border-green-400" : "bg-red-50 border-red-400"
            }`}>
              <h3 className="font-bold text-lg mb-3">
                {grokResponse.is_valid ? "✅ Grok Approved" : "❌ Grok Rejected"}
              </h3>
              <p className="text-sm whitespace-pre-wrap mb-2"><strong>Reasoning:</strong> {grokResponse.reasoning}</p>
              {grokResponse.timezone_note && (
                <p className="text-sm italic text-gray-700"><strong>Time zone note:</strong> {grokResponse.timezone_note}</p>
              )}
            </div>
          )}

          {grokError && <p className="text-red-600 mb-4">Grok error: {grokError}</p>}



          { /* Wallet connection & submit — keep your existing code */}
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

          {/* Wallet Connection — now identical to CreateContract */}
          <div className="mb-6">
            <label className="block text-lg font-bold text-primary mb-2">Wallet Signature</label>
            <button
              type="button"
              className="bg-green-500 text-white px-6 py-3 rounded hover:bg-green-600 disabled:opacity-50"
              onClick={connectWallet}
              disabled={!eventWalletAddress || walletConnected || loading}
            >
              {walletConnected
                ? `Connected: ${eventWalletAddress.slice(0, 8)}...${eventWalletAddress.slice(-6)}`
                : "Connect Wallet & Sign"}
            </button>

            {walletQrCodeUrl && !walletConnected && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700 mb-4">
                  Sign this message in <strong>Dash Core → Tools → Sign Message</strong>:
                  <br />
                  <code className="bg-gray-200 px-2 py-1 rounded text-sm break-all">
                    SettleInDash:{eventWalletAddress}
                  </code>
                </p>
                <img src={walletQrCodeUrl} alt="Sign message QR" className="w-64 h-64 mx-auto border" />

                <div className="mt-6">
                  <label className="block text-sm font-medium mb-2">Paste signature here:</label>
                  <input
                    type="text"
                    className="border p-3 rounded w-full mb-3"
                    value={manualSignature}
                    onChange={(e) => setManualSignature(e.target.value)}
                    placeholder="H1Abc...="
                  />
                  <button
                    type="button"
                    onClick={verifyManualSignature}
                    disabled={loading || apiLoading}
                    className="w-full bg-blue-600 text-white py-3 rounded hover:bg-blue-700"
                  >
                    Verify Signature
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
          {message && <p className="text-green-600 text-sm">{message}</p>}

          <button
            type="submit"
            disabled={loading || eventLoading || !walletConnected || !grokResponse?.is_valid}
            className="w-full bg-orange-500 text-white py-4 rounded hover:bg-orange-600 disabled:opacity-50 text-lg font-bold"
          >
            {loading || eventLoading ? "Creating Event..." : "Create Event"}
          </button>
        </form>

        <TermsSummary />
      </main>
    </div>
  );
};

export default CreateEvent;