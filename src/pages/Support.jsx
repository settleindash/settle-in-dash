// src/pages/Support.jsx
import { useState } from "react";
import { Link } from "react-router-dom";

const Support = () => {
  const [message, setMessage] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Support message:", message);
    alert("Message sent! (Mock)");
    setMessage("");
  };

  return (
    <div className="min-h-screen bg-background p-4">

      <main className="max-w-3xl mx-auto mt-6">
        <h2 className="text-xl font-semibold mb-4">Get Help</h2>
        <p className="text-gray-600 mb-4">
          Contact us at <a href="mailto:frederik500@msn.com" className="text-blue-500 hover:underline">frederik500@msn.com</a> or use the form below.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="message" className="block text-sm font-medium text-gray-700">
              Your Question or Issue
            </label>
            <textarea
              id="message"
              className="border p-2 rounded w-full"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue..."
              rows="5"
              aria-label="Support message"
            />
          </div>
          <button
            type="submit"
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600"
            aria-label="Submit support message"
          >
            Submit
          </button>
        </form>
        <h2 className="text-xl font-semibold mt-6 mb-4">Frequently Asked Questions</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium">How do I create a contract?</h3>
            <p className="text-gray-600">
              Navigate to the Create page, enter a question ending with "?", stake DASH, select a category, and set a termination date.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-medium">What is a Twist?</h3>
            <p className="text-gray-600">
              A Twist is a dispute resolution mechanism where Grok evaluates the outcome based on public data. Check the Transparency Portal for details.
            </p>
          </div>
        </div>
        <div className="mt-6">
          <Link
            to="/marketplace"
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            aria-label="Back to Marketplace"
          >
            Back to Marketplace
          </Link>
        </div>
      </main>
    </div>
  );
};

export default Support;