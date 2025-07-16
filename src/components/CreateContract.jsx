// src/components/CreateContract.jsx
// This component allows users to create a new betting contract by filling out a form.
// It collects question, time, stake, percentage, category, email, and termination date,
// and uses the useContracts hook to create the contract. Wallet connection is removed as email identifies the creator.

import { useState } from "react"; // Import React's useState hook for managing form state.
import { useNavigate } from "react-router-dom"; // Import useNavigate for redirecting after contract creation.
import { useContracts } from "../hooks/useContracts"; // Custom hook for contract-related logic.

// CreateContract component: Allows users to create a new contract with validation.
const CreateContract = () => {
  // State for form inputs, initialized as empty strings or defaults.
  const [question, setQuestion] = useState(""); // Contract question (e.g., "Will it rain today?").
  const [time, setTime] = useState(""); // Event start date and time.
  const [stake, setStake] = useState(""); // Stake amount in DASH.
  const [percentage, setPercentage] = useState(""); // Creator's percentage of the pot (0-100).
  const [category, setCategory] = useState("Crypto"); // Contract category, defaulting to "Crypto".
  const [email, setEmail] = useState(""); // Creator's email, used as their identifier.
  const [terminationDate, setTerminationDate] = useState(""); // Contract termination date.
  const [error, setError] = useState(""); // State for error messages during validation.

  const { createContract } = useContracts(); // Get createContract function from useContracts hook.
  const navigate = useNavigate(); // Initialize navigate for redirecting to marketplace.

  // Log form inputs for debugging (visible in browser Console, F12 in VSC).
  console.log("CreateContract: Form state:", { question, time, stake, percentage, category, email, terminationDate });

  // Handle form submission for creating a new contract.
  const handleSubmit = (e) => {
    e.preventDefault(); // Prevent default form submission behavior (page reload).
    // Log form data for debugging.
    console.log("CreateContract: Form submitted:", { question, time, stake, percentage, category, email, terminationDate });

    // Validate question: must end with a question mark.
    if (!question.endsWith("?")) {
      setError("Question must end with a '?'");
      console.log("CreateContract: Validation failed - no question mark");
      return;
    }

    // Validate time: must be a valid date and time.
    if (!time || isNaN(Date.parse(time))) {
      setError("Event time must be a valid date and time");
      console.log("CreateContract: Validation failed - invalid time");
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

    // Validate termination date: must be provided and in the future.
    if (!terminationDate) {
      setError("Termination date is required");
      console.log("CreateContract: Validation failed - no termination date");
      return;
    }

    // Validate that termination date is after the event time.
    const eventTime = new Date(time);
    const termDate = new Date(terminationDate);
    if (termDate <= eventTime) {
      setError("Termination date must be after the event time");
      console.log("CreateContract: Validation failed - termination date not after event time");
      return;
    }

    // Clear any existing error messages.
    setError("");
    // Log contract creation attempt.
    console.log("CreateContract: Calling createContract");

    // Attempt to create contract with provided details.
    const result = createContract(
      question,
      eventTime.toISOString(), // Convert time to ISO string for consistency.
      Number(stake), // Convert stake to number.
      Number(percentage), // Convert percentage to number.
      category,
      email,
      termDate.toISOString() // Convert termination date to ISO string.
    );

    // Handle result of contract creation.
    if (result.error) {
      setError(result.error); // Display error if contract creation fails.
      console.log("CreateContract: createContract failed:", result.error);
    } else {
      // On success, navigate to marketplace.
      console.log("CreateContract: Contract created, navigating to /marketplace");
      navigate("/marketplace");
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <header className="bg-primary text-white p-4">
        <h1 className="text-2xl font-semibold">Create Contract</h1>
      </header>
      <main className="max-w-3xl mx-auto mt-6">
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
          <div>
            <label htmlFor="question" className="block text-sm font-medium text-gray-700">
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
          <div>
            <label htmlFor="time" className="block text-sm font-medium text-gray-700">
              Event Time
            </label>
            <input
              id="time"
              type="datetime-local"
              className="border p-2 rounded w-full"
              value={time}
              onChange={(e) => {
                console.log("CreateContract: Time changed:", e.target.value);
                setTime(e.target.value);
              }}
              aria-label="Event time"
            />
          </div>
          <div>
            <label htmlFor="stake" className="block text-sm font-medium text-gray-700">
              Stake (DASH)
            </label>
            <input
              id="stake"
              type="number"
              className="border p-2 rounded w-full"
              value={stake}
              onChange={(e) => {
                console.log("CreateContract: Stake changed:", e.target.value);
                setStake(e.target.value);
              }}
              placeholder="Enter stake amount"
              aria-label="Stake amount"
            />
          </div>
          <div>
            <label htmlFor="percentage" className="block text-sm font-medium text-gray-700">
              Creator's Percentage (0-100)
            </label>
            <input
              id="percentage"
              type="number"
              className="border p-2 rounded w-full"
              value={percentage}
              onChange={(e) => {
                console.log("CreateContract: Percentage changed:", e.target.value);
                setPercentage(e.target.value);
              }}
              placeholder="Enter percentage (0-100)"
              aria-label="Creator's percentage"
            />
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700">
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
              <option>Crypto</option>
              <option>Sports</option>
              <option>Other</option>
            </select>
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
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
          <div>
            <label htmlFor="terminationDate" className="block text-sm font-medium text-gray-700">
              Termination Date
            </label>
            <input
              id="terminationDate"
              type="datetime-local"
              className="border p-2 rounded w-full"
              value={terminationDate}
              onChange={(e) => {
                console.log("CreateContract: Termination date changed:", e.target.value);
                setTerminationDate(e.target.value);
              }}
              aria-label="Termination date"
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