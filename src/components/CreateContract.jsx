// src/components/CreateContract.jsx
// This component allows users to create a new betting contract by filling out a form.
// It collects question, event start time, stake, percentage, category, email, and acceptance deadline,
// and uses the useContracts hook to create the contract. Category list is imported
// from a separate file for easy maintenance. Validates event start time as after present time
// and acceptance deadline as before or on event start time.

import { useState } from "react"; // Import React's useState hook for managing form state.
import { useNavigate } from "react-router-dom"; // Import useNavigate for redirecting after contract creation.
import { useContracts } from "../hooks/useContracts"; // Custom hook for contract-related logic.
import { categories } from "../utils/categories"; // Import category list from separate file.

const CreateContract = () => {
  // State for form inputs, initialized as empty strings or defaults.
  const [question, setQuestion] = useState(""); // Contract question (e.g., "Will it rain today?").
  const [time, setTime] = useState(""); // Event start date and time.
  const [stake, setStake] = useState(""); // Stake amount in DASH.
  const [percentage, setPercentage] = useState(""); // Creator's percentage of the pot (0-100).
  const [category, setCategory] = useState(categories[0] || ""); // Default to first category or empty.
  const [email, setEmail] = useState(""); // Creator's email, used as their identifier.
  const [acceptanceDeadline, setAcceptanceDeadline] = useState(""); // Deadline for contract acceptance.
  const [error, setError] = useState(""); // State for error messages during validation.

  const { createContract } = useContracts(); // Get createContract function from useContracts hook.
  const navigate = useNavigate(); // Initialize navigate for redirecting to marketplace.

  // Current date and time dynamically set to now (e.g., 2025-07-21T18:26:00+02:00).
  const currentDateTime = new Date().toISOString();
  // Format for datetime-local input (YYYY-MM-DDThh:mm), adjusted for local timezone.
  const minDateTime = new Date().toLocaleString("sv-SE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).replace(" ", "T");

  // Log form inputs for debugging (visible in browser Console, F12 in VSC).
  console.log("CreateContract: Form state:", { question, time, stake, percentage, category, email, acceptanceDeadline });

  // Handle form submission for creating a new contract.
  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent default form submission behavior (page reload).
    console.log("CreateContract: Form submitted:", { question, time, stake, percentage, category, email, acceptanceDeadline });

    // Debug date values
    console.log("Current DateTime:", new Date(currentDateTime));
    console.log("Event Start Time:", time, new Date(time ? `${time}:00+02:00` : currentDateTime));
    console.log("Acceptance Deadline:", acceptanceDeadline, new Date(acceptanceDeadline ? `${acceptanceDeadline}:00+02:00` : currentDateTime));

    // Validate question: must end with a question mark.
    if (!question.endsWith("?")) {
      setError("Question must end with a '?'");
      console.log("CreateContract: Validation failed - no question mark");
      return;
    }

    // Validate event start time: must be provided and after current time.
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
    if (eventTime <= new Date(currentDateTime)) {
      setError("Event Start Time must be after the present time");
      console.log("CreateContract: Validation failed - event time in past or present");
      return;
    }

    // Validate stake: must be a number and at least 1 DASH.
    if (isNaN(stake) || Number(stake) < 1) {
      setError("Stake must be at least 1 DASH");
      console.log("CreateContract: Validation failed - invalid stake");
      return;
    }

    // Validate percentage: must be a number between 0 and 100.
    if (isNaN(percentage) || Number(percentage) < 0 || Number(percentage) > 100) {
      setError("Percentage must be a number between 0 and 100");
      console.log("CreateContract: Validation failed - invalid percentage");
      return;
    }

    // Validate email: must match a simple email format (e.g., name@domain.com).
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please provide a valid email address");
      console.log("CreateContract: Validation failed - invalid email");
      return;
    }

    // Validate acceptance deadline: must be provided, after current time, and before or on event start time.
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
    if (deadline <= new Date(currentDateTime)) {
      setError("Acceptance deadline must be after the current time");
      console.log("CreateContract: Validation failed - acceptance deadline in past");
      return;
    }

    // Clear any existing error messages.
    setError("");
    console.log("CreateContract: Calling createContract");

    // Attempt to create contract with provided details.
    const result = await createContract(
      question,
      eventTime.toISOString(), // Convert time to ISO string for consistency.
      Number(stake), // Convert stake to number.
      Number(percentage), // Convert percentage to number.
      category,
      email,
      deadline.toISOString() // Convert acceptance deadline to ISO string.
    );

    // Handle result of contract creation.
    if (result.error) {
      setError(result.error); // Display error if contract creation fails.
      console.log("CreateContract: createContract failed:", result.error);
    } else {
      console.log("CreateContract: Contract created, navigating to /marketplace");
      navigate("/marketplace");
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <main className="max-w-3xl mx-auto mt-6">
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-6">
          {/* Category at the top with dynamic options */}
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

          {/* Question */}
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

          {/* Event Start Time */}
          <div className="mb-6">
            <label htmlFor="time" className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Event Start Time
            </label>
            <input
              id="time"
              type="datetime-local"
              className="border p-2 rounded w-full"
              value={time}
              min={minDateTime} // Prevent selecting past dates
              onChange={(e) => {
                console.log("CreateContract: Event Start Time changed:", e.target.value);
                setTime(e.target.value);
                // Reset acceptance deadline if event time changes to ensure valid selection
                if (acceptanceDeadline && new Date(`${acceptanceDeadline}:00+02:00`) > new Date(`${e.target.value}:00+02:00`)) {
                  setAcceptanceDeadline("");
                }
              }}
              aria-label="Event start time"
            />
          </div>

          {/* Stake */}
          <div className="mb-6">
            <label htmlFor="stake" className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Stake (DASH)
            </label>
            <input
              id="stake"
              type="number"
              className="border p-2 rounded w-full"
              value={stake}
              min="1" // Enforce minimum stake
              onChange={(e) => {
                console.log("CreateContract: Stake changed:", e.target.value);
                setStake(e.target.value);
              }}
              placeholder="Enter stake amount"
              aria-label="Stake amount"
            />
          </div>

          {/* Creator's Percentage */}
          <div className="mb-6">
            <label htmlFor="percentage" className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Creator's Percentage (0-100)
            </label>
            <input
              id="percentage"
              type="number"
              className="border p-2 rounded w-full"
              value={percentage}
              min="0" // Enforce valid range
              max="100"
              onChange={(e) => {
                console.log("CreateContract: Percentage changed:", e.target.value);
                setPercentage(e.target.value);
              }}
              placeholder="Enter percentage (0-100)"
              aria-label="Creator's percentage"
            />
          </div>

          {/* Creator Email */}
          <div className="mb-6">
            <label htmlFor="email" className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Creator Email
            </label>
            <input
              id="email"
              type="email"
              className="border p-2 rounded w-full"
              value={email}
              onChange={(e) => {
                console.log("CreateContract: Email changed:", e.target.value);
                setEmail(e.target.value);
              }}
              placeholder="Enter your email"
              aria-label="Creator email"
            />
          </div>

          {/* Acceptance Deadline */}
          <div className="mb-6">
            <label htmlFor="acceptanceDeadline" className="block text-lg sm:text-xl font-bold text-primary mb-2">
              Acceptance Deadline
            </label>
            <input
              id="acceptanceDeadline"
              type="datetime-local"
              className="border p-2 rounded w-full"
              value={acceptanceDeadline}
              min={minDateTime} // Prevent selecting before current time
              max={time || undefined} // Prevent selecting after event time
              onChange={(e) => {
                console.log("CreateContract: Acceptance deadline changed:", e.target.value);
                setAcceptanceDeadline(e.target.value);
              }}
              aria-label="Acceptance deadline"
            />
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
      </main>
    </div>
  );
};

export default CreateContract;