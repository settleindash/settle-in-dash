import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useContracts } from "../hooks/useContracts";
import { useEvents } from "../hooks/useEvents";
import TermsSummary from "./TermsSummary";
import { validateWalletAddress, validateContractCreation } from "../utils/validation";

const CreateContract = () => {
  const [eventId, setEventId] = useState("");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [outcome, setOutcome] = useState("");
  const [positionType, setPositionType] = useState("sell"); // Default and only option
  const [stake, setStake] = useState("");
  const [percentage, setPercentage] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [acceptanceDeadline, setAcceptanceDeadline] = useState("");
  const [error, setError] = useState("");

  const { createContract, loading: contractLoading } = useContracts();
  const { events, getEvents, loading: eventsLoading, error: eventsError } = useEvents();
  const navigate = useNavigate();
  const location = useLocation();

  // Set minimum date to 5 minutes from now
  const minDateTime = new Date(Date.now() + 5 * 60 * 1000).toISOString().slice(0, 16);

  // Fetch events and pre-select event from URL
  const fetchEvents = useCallback(async () => {
    console.log("CreateContract: Fetching events");
    const result = await getEvents({ status: "open" });
    if (result.error) {
      setError(result.error);
      console.log("CreateContract: Error fetching events:", result.error);
    } else {
      console.log("CreateContract: Events fetched:", result);
      const eventIdFromUrl = new URLSearchParams(location.search).get("event_id");
      if (eventIdFromUrl) {
        const event = result.find((e) => e.event_id === eventIdFromUrl);
        if (event) {
          setEventId(eventIdFromUrl);
          setSelectedEvent(event);
        } else {
          setError("Selected event not found");
          console.log("CreateContract: Event not found for event_id:", eventIdFromUrl);
        }
      }
    }
  }, [getEvents, location.search]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleEventChange = useCallback((e) => {
    const selectedEventId = e.target.value;
    console.log("CreateContract: Event changed:", selectedEventId);
    const event = events.find((e) => e.event_id === selectedEventId);
    setEventId(selectedEventId);
    setSelectedEvent(event);
    setOutcome("");
    setAcceptanceDeadline("");
    setError("");
  }, [events]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("CreateContract: Form submitted:", {
      eventId,
      outcome,
      positionType,
      stake,
      percentage,
      walletAddress,
      acceptanceDeadline,
    });

    const validationData = {
      eventId,
      outcome,
      positionType,
      stake,
      percentage,
      walletAddress,
      acceptanceDeadline,
    };
    const validationResult = validateContractCreation(validationData, selectedEvent);
    if (!validationResult.isValid) {
      setError(validationResult.message);
      console.log("CreateContract: Validation failed:", validationResult.message);
      return;
    }

    setError("");
    console.log("CreateContract: Calling createContract");

    const eventTime = new Date(selectedEvent.event_date);
    const deadline = new Date(`${acceptanceDeadline}:00+02:00`);
    const result = await createContract({
      event_id: eventId,
      outcome,
      position_type: positionType,
      stake: Number(stake),
      percentage: Number(percentage),
      category: selectedEvent.category,
      WalletAddress: walletAddress,
      acceptanceDeadline: deadline.toISOString(),
      time: eventTime.toISOString(),
    });

    if (result.error) {
      setError(result.error);
      console.log("CreateContract: createContract failed:", result.error);
    } else {
      console.log("CreateContract: Contract created successfully, contract_id:", result.contract_id);
      navigate("/marketplace");
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <header className="bg-primary text-white p-4">
        <h1 className="text-2xl font-semibold">Create Contract</h1>
      </header>
      <main className="max-w-3xl mx-auto mt-6">
        {eventsLoading && <p className="text-gray-600 text-sm sm:text-base">Loading events...</p>}
        {eventsError && <p className="text-red-500 text-sm sm:text-base">Error: {eventsError}</p>}
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
                aria-label="Contract outcome"
              >
                <option value="">Select an outcome</option>
                {(JSON.parse(selectedEvent.possible_outcomes || "[]") || selectedEvent.possible_outcomes?.split(",") || []).map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mb-6">
            <label className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Position Type
            </label>
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
              aria-label="Position type"
              disabled // Disable to enforce sell only
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
              aria-label="Stake amount"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="percentage" className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Odds (e.g., 2.00 for 2:1)
            </label>
            <input
              id="percentage"
              type="number"
              step="0.01"
              className="border p-2 rounded w-full text-sm sm:text-base"
              value={percentage}
              min="1.01"
              onChange={(e) => {
                console.log("CreateContract: Percentage changed:", e.target.value);
                setPercentage(e.target.value);
              }}
              placeholder="Enter odds (e.g., 2.00)"
              aria-label="Odds"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="walletAddress" className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Creator Wallet Address
            </label>
            <input
              id="walletAddress"
              type="text"
              className="border p-2 rounded w-full text-sm sm:text-base"
              value={walletAddress}
              onChange={(e) => {
                console.log("CreateContract: Wallet address changed:", e.target.value);
                setWalletAddress(e.target.value);
              }}
              placeholder="Enter a valid DASH address (starts with 'X', 34 characters)"
              aria-label="Creator wallet address"
            />
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
              aria-label="Acceptance deadline"
            />
            <p className="text-gray-600 text-xs sm:text-sm mt-1">
              Select a date and time before or on the event time (at least 5 minutes from now).
            </p>
          </div>

          {error && <p className="text-red-500 text-sm sm:text-base">{error}</p>}
          <button
            type="submit"
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50 text-sm sm:text-base"
            disabled={contractLoading || eventsLoading}
            aria-label="Create Contract"
          >
            {contractLoading ? "Creating..." : "Create Contract"}
          </button>
        </form>
        <TermsSummary />
      </main>
    </div>
  );
};

export default CreateContract;