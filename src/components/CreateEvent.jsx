// src/components/CreateEvent.jsx
// Component to create a new event for Settle In DASH.
// Collects title, category, event date, possible outcomes, oracle source, and event wallet address.
// Uses useEvents hook to create the event and navigates to marketplace on success.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useEvents } from "../hooks/useEvents";
import { categories } from "../utils/categories";
import { validateEventCreation } from "../utils/validation"; // Import validation
import PageHeader from "../utils/formats/PageHeader.jsx"; // Import reusable header
import TermsSummary from "./TermsSummary";

const CreateEvent = () => {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0] || "");
  const [eventDate, setEventDate] = useState("");
  const [possibleOutcomes, setPossibleOutcomes] = useState(["", ""]);
  const [oracleSource, setOracleSource] = useState("");
  const [eventWalletAddress, setEventWalletAddress] = useState(""); // New state for wallet address
  const [error, setError] = useState("");
  const { createEvent, loading } = useEvents();
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("CreateEvent: Form submitted:", { title, category, eventDate, possibleOutcomes, oracleSource, eventWalletAddress });
    setError("");

    // Validate inputs using validateEventCreation
    const validationData = {
      title,
      category,
      eventDate,
      possibleOutcomes,
      oracleSource,
      eventWalletAddress,
    };
    const validationResult = validateEventCreation(validationData);
    if (!validationResult.isValid) {
      setError(validationResult.message);
      console.log("CreateEvent: Validation failed:", validationResult.message);
      return;
    }

    const eventTime = new Date(`${eventDate}:00+02:00`); // Use Europe/Paris timezone
    const validOutcomes = possibleOutcomes.filter(outcome => outcome.trim() !== "");

    const result = await createEvent({
      title,
      category,
      event_date: eventTime.toISOString(),
      possible_outcomes: validOutcomes,
      oracle_source: oracleSource || null,
      event_wallet_address: eventWalletAddress, // Include wallet address
    });

    if (result.error) {
      setError(result.error);
      console.log("CreateEvent: createEvent failed:", result.error);
    } else {
      console.log("CreateEvent: Event created successfully, event_id:", result.event_id);
      navigate("/marketplace");
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <PageHeader title="Create Event" />
      <main className="max-w-3xl mx-auto mt-6">
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
              Submit Your Wallet Address
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
              placeholder="Enter a valid DASH address (starts with 'X', 34 characters)"
              aria-label="Event wallet address"
            />
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
          <button
            type="submit"
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50 text-sm sm:text-base"
            disabled={loading}
            aria-label="Create Event"
          >
            {loading ? "Creating..." : "Create Event"}
          </button>
        </form>
        <TermsSummary />
      </main>
    </div>
  );
};

export default CreateEvent;