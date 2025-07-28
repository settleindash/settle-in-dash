// src/components/CreateContract.jsx
// This component allows users to create a new betting contract by filling out a form.
// It collects question, event start time, stake, percentage, category, wallet address, and acceptance deadline,
// and uses the useContracts hook to create the contract. Category list is imported
// from a separate file for easy maintenance. Validates event start time as after present time
// and acceptance deadline as before or on event start time.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useContracts } from "../hooks/useContracts";
import { categories } from "../utils/categories";
import TermsSummary from "./TermsSummary";

const CreateContract = () => {
  const [question, setQuestion] = useState("");
  const [time, setTime] = useState("");
  const [stake, setStake] = useState("");
  const [percentage, setPercentage] = useState("");
  const [category, setCategory] = useState(categories[0] || "");
  const [WalletAddress, setWalletAddress] = useState("");
  const [acceptanceDeadline, setAcceptanceDeadline] = useState("");
  const [error, setError] = useState("");

  const { createContract } = useContracts();
  const navigate = useNavigate();

  const currentDateTime = new Date().toISOString();
  const minDateTime = new Date().toLocaleString("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).replace(" ", "T");

  const validBase58Chars = /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/;

  const validateWalletAddress = (address) => {
    if (!address) return false;
    if (address.length !== 34) return false;
    if (!address.startsWith("X")) return false;
    return validBase58Chars.test(address);
  };

  console.log("CreateContract: Form state:", { question, time, stake, percentage, category, WalletAddress, acceptanceDeadline });

  // Calculate Accepter's Percentage for display
  const accepterPercentage = percentage ? (100 - parseFloat(percentage)).toFixed(2) : "0.00";

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("CreateContract: Form submitted:", { question, time, stake, percentage, category, WalletAddress, acceptanceDeadline });

    console.log("Current DateTime:", new Date(currentDateTime));
    console.log("Event Start Time:", time, new Date(time ? `${time}:00+02:00` : currentDateTime));
    console.log("Acceptance Deadline:", acceptanceDeadline, new Date(acceptanceDeadline ? `${acceptanceDeadline}:00+02:00` : currentDateTime));

    if (!question.endsWith("?")) {
      setError("Question must end with a '?'");
      console.log("CreateContract: Validation failed - no question mark");
      return;
    }

    if (!time) {
      setError("Event Start Time is required");
      console.log("CreateContract: Validation failed - no event time");
      return;
    }
    const eventTime = new Date(`${time}:00+02:00`);
    if (isNaN(eventTime.getTime())) {
      setError("Invalid Event Start Time");
      console.log("CreateContract: Validation failed - invalid event time");
      return;
    }
    const roundedCurrentTime = new Date(currentDateTime);
    const bufferTime = new Date(roundedCurrentTime.getTime() - 5 * 60 * 1000);
    if (eventTime <= bufferTime) {
      setError("Event Start Time must be in the future (at least 5 minutes from now)");
      console.log("CreateContract: Validation failed - event time too far in past");
      return;
    }

    if (isNaN(stake) || Number(stake) < 1) {
      setError("Stake must be at least 1 DASH");
      console.log("CreateContract: Validation failed - invalid stake");
      return;
    }

    if (isNaN(percentage) || Number(percentage) < 0 || Number(percentage) > 100) {
      setError("Percentage must be a number between 0 and 100");
      console.log("CreateContract: Validation failed - invalid percentage");
      return;
    }

    if (!validateWalletAddress(WalletAddress)) {
      setError("Please provide a valid DASH wallet address (34 characters, starts with 'X')");
      console.log("CreateContract: Validation failed - invalid wallet address");
      return;
    }

    if (!acceptanceDeadline) {
      setError("Acceptance deadline is required");
      console.log("CreateContract: Validation failed - no acceptance deadline");
      return;
    }
    const deadline = new Date(`${acceptanceDeadline}:00+02:00`);
    if (isNaN(deadline.getTime())) {
      setError("Invalid Acceptance Deadline");
      console.log("CreateContract: Validation failed - invalid acceptance deadline");
      return;
    }
    if (deadline > eventTime) {
      setError("Acceptance deadline must be before or on the Event Start Time");
      console.log("CreateContract: Validation failed - acceptance deadline after event time");
      return;
    }
    if (deadline <= bufferTime) {
      setError("Acceptance deadline must be in the future (at least 5 minutes from now)");
      console.log("CreateContract: Validation failed - acceptance deadline too far in past");
      return;
    }

    setError("");
    console.log("CreateContract: Calling createContract");

    const result = await createContract(
      question,
      eventTime.toISOString(),
      Number(stake),
      Number(percentage),
      category,
      WalletAddress,
      deadline.toISOString()
    );

    if (result.error) {
      setError(result.error);
      console.log("CreateContract: createContract failed:", result.error);
    } else {
      console.log("CreateContract: Contract created, navigating to /marketplace");
      navigate("/marketplace");
    }
  };

  const handleTimeChange = (e) => {
    const selectedTime = e.target.value;
    console.log("CreateContract: Event Start Time changed:", selectedTime);
    const eventTime = new Date(`${selectedTime}:00+02:00`);
    const roundedCurrentTime = new Date();
    const bufferTime = new Date(roundedCurrentTime.getTime() - 5 * 60 * 1000);
    if (eventTime <= bufferTime) {
      setError("Event Start Time must be in the future (at least 5 minutes from now)");
      setTime("");
    } else {
      setError("");
      setTime(selectedTime);
      if (acceptanceDeadline && new Date(`${acceptanceDeadline}:00+02:00`) > new Date(`${selectedTime}:00+02:00`)) {
        setAcceptanceDeadline("");
      }
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <main className="max-w-3xl mx-auto mt-6">
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-6">
          <div className="mb-6">
            <label htmlFor="category" className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Category
            </label>
            <select
              id="category"
              className="border p-2 rounded w-full"
              value={category}
              onChange={(e) => {
                console.log("CreateContract: Category changed:", e.target.value);
                setCategory(e.target.value);
              }}
              aria-label="Contract category"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label htmlFor="question" className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Question
            </label>
            <input
              id="question"
              type="text"
              className="border p-2 rounded w-full"
              value={question}
              onChange={(e) => {
                console.log("CreateContract: Question changed:", e.target.value);
                setQuestion(e.target.value);
              }}
              placeholder="Enter a question ending with '?'"
              aria-label="Contract question"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="time" className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Event Start Time
            </label>
            <input
              id="time"
              type="datetime-local"
              className="border p-2 rounded w-full"
              value={time}
              min={minDateTime}
              onChange={handleTimeChange}
              aria-label="Event start time"
              lang="en"
            />
            <p className="text-gray-600 text-xs mt-1">
              Select a future date and time (at least 5 minutes from now; display may vary based on device language).
            </p>
          </div>

          <div className="mb-6">
            <label htmlFor="stake" className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Stake (DASH)
            </label>
            <input
              id="stake"
              type="number"
              className="border p-2 rounded w-full"
              value={stake}
              min="1"
              onChange={(e) => {
                console.log("CreateContract: Stake changed:", e.target.value);
                setStake(e.target.value);
              }}
              placeholder="Enter stake amount"
              aria-label="Stake amount"
            />
          </div>

          <div className="mb-6">
            <label htmlFor="percentage" className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Creator's Percentage (0-100)
            </label>
            <input
              id="percentage"
              type="number"
              className="border p-2 rounded w-full"
              value={percentage}
              min="0"
              max="100"
              onChange={(e) => {
                console.log("CreateContract: Percentage changed:", e.target.value);
                setPercentage(e.target.value);
              }}
              placeholder="Enter percentage (0-100)"
              aria-label="Creator's percentage"
            />
            <p className="text-gray-600 text-xs mt-1">
              Creator’s payout ratio: {accepterPercentage}
            </p>
          </div>

          <div className="mb-6">
            <label htmlFor="WalletAddress" className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Creator Wallet Address
            </label>
            <input
              id="WalletAddress"
              type="text"
              className="border p-2 rounded w-full"
              value={WalletAddress}
              onChange={(e) => {
                console.log("CreateContract: Wallet Address changed:", e.target.value);
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
              className="border p-2 rounded w-full"
              value={acceptanceDeadline}
              min={minDateTime}
              max={time || undefined}
              onChange={(e) => {
                console.log("CreateContract: Acceptance deadline changed:", e.target.value);
                setAcceptanceDeadline(e.target.value);
              }}
              aria-label="Acceptance deadline"
              lang="en"
            />
            <p className="text-gray-600 text-xs mt-1">
              Select a date and time before or on the Event Start Time (at least 5 minutes from now; display may vary based on device language).
            </p>
          </div>

          {error && <p className="text-red-500">{error}</p>}
          <button
            type="submit"
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
            aria-label="Create Contract"
          >
            Create Contract
          </button>
        </form>
        <TermsSummary />
      </main>
    </div>
  );
};

export default CreateContract;