// src/components/TermsSummary.jsx
import { Link } from "react-router-dom";

const TermsSummary = () => (
  <div className="mt-4 p-4 bg-white border rounded-lg shadow text-sm text-gray-600">
    <h3 className="text-lg font-medium text-blue-800 mb-2">Terms Summary</h3>
    <p className="mb-2">
      By creating a contract, you agree to the following:
    </p>
    <ul className="list-disc list-inside space-y-1 mb-2">
      <li>Minimum of 1 DASH required to create a contract.</li>
      <li>Create a clear, verifiable question for the contract (e.g., “Will Bitcoin reach $100,000 by December 31, 2026?”).</li>
      <li>When creating a contract, an additional contract worth 10% of the stake is automatically created. This amount is refunded when the contract is settled without a dispute.</li>
      <li>Agree on the outcome within 48 hours after the event concludes. If no agreement is reached, the contract escalates, triggering a Twist (Grok resolution). The party deemed incorrect loses their stake and the 10% additional contract to the other party.</li>
      <li>A 2% fee is applied to your net winnings.</li>
      <li>Ensure compliance with local laws and understand the risks associated with smart contract interactions.</li>
          </ul>
    <p>
      Read our full{" "}
      <Link
        to="/terms"
        className="text-blue-500 hover:underline"
        aria-label="View full Terms and Conditions"
      >
        Terms and Conditions
      </Link>{" "}
      for details.
    </p>
  </div>
);

export default TermsSummary;