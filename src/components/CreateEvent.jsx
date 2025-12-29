// src/components/CreateEvent.jsx
// Improved: Added expected finish time, better Grok integration

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useEvents } from "../hooks/useEvents";
import { useContracts } from "../hooks/useContracts";
import { categories } from "../utils/categories";
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
  const [eventDate, setEventDate] = useState(""); // Start time
  const [expectedFinishDate, setExpectedFinishDate] = useState(""); // NEW: Expected end
  const [possibleOutcomes, setPossibleOutcomes] = useState(["", ""]);
  const [description, setDescription] = useState("");
  const [eventWalletAddress, setEventWalletAddress] = useState("");

  // Wallet
  const [signature, setSignature] = useState("");
  const [manualSignature, setManualSignature] = useState("");
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletQrCodeUrl, setWalletQrCodeUrl] = useState(null);

  // Grok validation
  const [grokResponse, setGrokResponse] = useState(null);
  const [grokLoading, setGrokLoading] = useState(false);
  const [grokError, setGrokError] = useState("");

  // General
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const minDateTime = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);

  // Outcome helpers (unchanged)
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

  // Wallet connection (unchanged)
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
      setMessage(`Sign the message "SettleInDash:${eventWalletAddress}" in Dash Core`);
    } catch (err) {
      setError("Failed to generate QR code");
    } finally {
      setLoading(false);
    }
  };

  const verifyManualSignature = async () => {
    if (!manualSignature.trim()) return setError("Please enter a signature");

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

// Helper: Convert Grok's UTC ISO string to local datetime-local format (YYYY-MM-DDTHH:mm)
const utcToLocalInput = (utcString) => {
  if (!utcString) return "";
  const date = new Date(utcString);
  if (isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16); // Trim to match <input type="datetime-local">
};

  // Validate with Grok + AUTO-APPLY improvements immediately
  const validateWithGrok = async () => {
    const validOutcomes = possibleOutcomes.filter(o => o.trim());


    let missing = [];
    if (!title.trim()) missing.push("title");
    if (!category) missing.push("category");
    if (!eventDate) missing.push("event start date/time");
    if (validOutcomes.length < 2) missing.push("at least 2 valid outcomes");
    if (!description.trim()) missing.push("description");

    if (missing.length > 0) {
      setError("Missing: " + missing.join(", "));
      return;
    }

    // Optional: Check finish > start
    if (expectedFinishDate) {
      const start = new Date(eventDate);
      const finish = new Date(expectedFinishDate);
      if (finish <= start) {
        setError("Expected finish must be after start time");
        return;
      }
    }

    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    setGrokLoading(true);
    setGrokError("");
    setGrokResponse(null);
    setMessage("");

    try {
      const response = await fetch("https://settleindash.com/api/grok.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          category,
          // ─── New fields ───
          event_start_local: eventDate || null,             // e.g. "2026-01-20T21:00"
          event_start_timezone: userTimeZone,               // "Europe/Copenhagen"
          expected_finish_local: expectedFinishDate || null,
          expected_finish_timezone: expectedFinishDate ? userTimeZone : null,
              
          possible_outcomes: validOutcomes,
          description: description.trim(),
          user_timezone: userTimeZone,
        })
      });

      if (!response.ok) throw new Error(`Server error ${response.status}`);

      const result = await response.json();

      if (result.error) {
        setGrokError(result.error);
      } else {
        setGrokResponse(result);

        // Auto-apply improvements immediately (restores old behavior)
        let applied = [];

        // Description
        if (result.improved_description && result.improved_description !== description) {
          setDescription(result.improved_description);
          applied.push("description");
        }

        // Start time
        if (result.suggested_start_time && result.suggested_start_timezone) {
          // Only apply if different from current value
          if (result.suggested_start_time !== eventDate) {
            setEventDate(result.suggested_start_time);
            applied.push("start time");
          }
        }

        // Finish time
        if (result.suggested_finish_time && result.suggested_finish_timezone) {
          if (result.suggested_finish_time !== expectedFinishDate) {
            setExpectedFinishDate(result.suggested_finish_time);
            applied.push("expected finish time");
          }
        }

        if (applied.length > 0) {
          setMessage(`Grok auto-applied improvements: ${applied.join(", ")}!`);
        } else {
          setMessage("Grok reviewed your event — looks good!");
        }
      }
    } catch (err) {
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

    const startTime = new Date(eventDate);
    if (isNaN(startTime.getTime())) {
      setError("Invalid start date format");
      setLoading(false);
      return;
    }
    if (startTime < new Date(Date.now() + 5 * 60 * 1000)) {
      setError("Event must be at least 5 minutes in the future");
      setLoading(false);
      return;
    }

    let finishTime = null;
    if (expectedFinishDate) {
      finishTime = new Date(expectedFinishDate);
      if (isNaN(finishTime.getTime())) {
        setError("Invalid expected finish date format");
        setLoading(false);
        return;
      }
      if (finishTime <= startTime) {
        setError("Expected finish time must be after start time");
        setLoading(false);
        return;
      }
    }

    try {
      const result = await createEvent({
        title: title.trim(),
        category,
        event_date: eventDate ? new Date(eventDate).toISOString() : null,
        expected_finish: expectedFinishDate ? new Date(expectedFinishDate).toISOString() : null,
        possible_outcomes: validOutcomes,
        event_wallet_address: eventWalletAddress,
        signature,
        description: description.trim()
      });

      if (result.error) {
        setError(result.error);
      } else {
        setMessage("Event created successfully!");
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
          {/* Title */}
          <div className="mb-6">
            <label htmlFor="title" className="block text-lg font-bold text-primary mb-2">
              Event Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              className="border p-2 rounded w-full text-sm sm:text-base"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Super Bowl 2026: Chiefs vs Eagles"
              required
            />
          </div>

          {/* Category */}
          <div className="mb-6">
            <label htmlFor="category" className="block text-lg font-bold text-primary mb-2">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              className="border p-2 rounded w-full text-sm sm:text-base"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            >
              <option value="">Select Category</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div className="mb-6">
            <label htmlFor="eventDate" className="block text-lg font-bold text-primary mb-2">
              Event Start Date & Time <span className="text-red-500">*</span>
            </label>
            <input
              id="eventDate"
              type="datetime-local"
              className="border p-2 rounded w-full text-sm sm:text-base"
              value={eventDate}
              min={minDateTime}
              onChange={(e) => setEventDate(e.target.value)}
              required
            />
            <p className="text-xs text-gray-600 mt-1">
              At least 5 minutes in the future (your local time)
            </p>
          </div>

          {/*Expected Finish */}
          <div className="mb-6">
            <label htmlFor="expectedFinishDate" className="block text-lg font-bold text-primary mb-2">
              Expected Finish Date & Time (optional)
            </label>
            <input
              id="expectedFinishDate"
              type="datetime-local"
              className="border p-2 rounded w-full text-sm sm:text-base"
              value={expectedFinishDate}
              min={eventDate || minDateTime}
              onChange={(e) => setExpectedFinishDate(e.target.value)}
            />
            <p className="text-xs text-gray-600 mt-1">
              e.g., expected end of match/debate. Helps Grok resolve faster.
            </p>
          </div>

          {/* Outcomes */}
          <div className="mb-6">
            <label className="block text-lg font-bold text-primary mb-2">
              Possible Outcomes <span className="text-red-500">*</span>
            </label>
            {possibleOutcomes.map((outcome, index) => (
              <div key={index} className="flex items-center mb-2">
                <input
                  type="text"
                  className="border p-2 rounded flex-1 text-sm sm:text-base"
                  value={outcome}
                  onChange={(e) => handleOutcomeChange(index, e.target.value)}
                  placeholder={`Outcome ${index + 1} (e.g., Chiefs Win)`}
                  required
                />
                {possibleOutcomes.length > 2 && (
                  <button
                    type="button"
                    className="ml-2 text-red-500 hover:text-red-600"
                    onClick={() => removeOutcome(index)}
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
            >
              + Add Outcome
            </button>
          </div>

          {/* Description */}
          <div className="mb-6">
            <label htmlFor="description" className="block text-lg font-bold text-primary mb-2">
              Event Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              className="border p-3 rounded w-full text-sm h-40 resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe clearly: what happens, how it's decided, official sources (e.g., ESPN, official league site)..."
              required
            />
            <p className="text-xs text-gray-600 mt-1">
              Grok will improve this for clarity and resolvability.
            </p>
          </div>

          {/* Grok Validation */}
          <div className="mb-6">
            <button
              type="button"
              onClick={validateWithGrok}
              disabled={grokLoading}
              className="w-full bg-purple-600 text-white py-4 rounded-lg font-bold hover:bg-purple-700 disabled:opacity-50"
            >
            {grokLoading ? "Grok is thinking..." : "Validate with Grok"}
            </button>
          </div>

          {/* Grok Feedback */}
          {grokResponse && (
            <div className={`p-5 rounded-lg border-2 mb-6 ${grokResponse.is_valid ? "bg-green-50 border-green-400" : "bg-red-50 border-red-400"}`}>
              <h3 className="font-bold text-lg mb-3">
                {grokResponse.is_valid ? "✅ Grok Approved" : "❌ Grok Rejected"}
              </h3>
              <p className="text-sm whitespace-pre-wrap mb-2"><strong>Reasoning:</strong> {grokResponse.reasoning}</p>

              {grokResponse.suggested_start_time && (
                <p className="text-sm italic text-gray-700">
                  <strong>Suggested Start Time (local):</strong>{" "}
                  {new Date(grokResponse.suggested_start_time).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                  <span className="text-xs text-gray-500 ml-2">
                    (UTC: {grokResponse.suggested_start_time})
                  </span>
                </p>
              )}

              {grokResponse.suggested_finish_time && (
                <p className="text-sm italic text-gray-700">
                  <strong>Suggested Finish Time (local):</strong>{" "}
                  {new Date(grokResponse.suggested_finish_time).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                  <span className="text-xs text-gray-500 ml-2">
                    (UTC: {grokResponse.suggested_finish_time})
                  </span>
                </p>
              )}

              {grokResponse.timezone_note && (
                <p className="text-sm italic text-gray-700 mt-2">
                  <strong>Timezone Note:</strong> {grokResponse.timezone_note}
                </p>
              )}
            </div>
          )}

          {grokError && <p className="text-red-600 mb-4">Grok error: {grokError}</p>}

          {/* Wallet */}
          <div className="mb-6">
            <label htmlFor="eventWalletAddress" className="block text-lg font-bold text-primary mb-2">
              Your DASH Wallet Address
            </label>
            <input
              id="eventWalletAddress"
              type="text"
              className="border p-2 rounded w-full text-sm sm:text-base"
              value={eventWalletAddress}
              onChange={(e) => setEventWalletAddress(e.target.value)}
              placeholder="Enter valid DASH testnet address (starts with 'y')"
              disabled={walletConnected || loading}
            />
          </div>

          {/* Signature */}
          <div className="mb-6">
            <label className="block text-lg font-bold text-primary mb-2">Wallet Signature</label>
            <button
              type="button"
              className="bg-green-500 text-white px-6 py-3 rounded hover:bg-green-600 disabled:opacity-50"
              onClick={connectWallet}
              disabled={!eventWalletAddress || walletConnected || loading}
            >
              {walletConnected
                ? `Connected: ${eventWalletAddress.slice(0, 8)}...`
                : "Connect Wallet & Sign"}
            </button>

            {walletQrCodeUrl && !walletConnected && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-700 mb-4">
                  Sign in Dash Core → Tools → Sign Message:
                  <br />
                  <code className="bg-gray-200 px-2 py-1 rounded text-sm break-all">
                    SettleInDash:{eventWalletAddress}
                  </code>
                </p>
                <img src={walletQrCodeUrl} alt="Sign QR" className="w-64 h-64 mx-auto border" />

                <div className="mt-6">
                  <label className="block text-sm font-medium mb-2">Paste signature:</label>
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