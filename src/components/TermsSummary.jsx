// src/components/TermsSummary.jsx
import { Link } from "react-router-dom";

const TermsSummary = () => (
  <div className="mt-4 p-4 bg-white border rounded-lg shadow text-sm text-gray-600">
    <h3 className="text-lg font-medium text-blue-800 mb-2">Terms Summary</h3>
    <p className="mb-2">
      By creating a contract, you agree to the following:
    </p>
    <ul className="list-disc list-inside space-y-1 mb-2">
      <li>Deposit a minimum 1 DASH stake and a 10% deposit, held in escrow.</li>
      <li>Create a clear, verifiable question (e.g., “Will Bitcoin reach $100,000 by 2026?”).</li>
      <li>Creator’s Percentage is the portion of the stake (in DASH) that the Creator wins if correct, or the Accepter pays if the Creator wins. The Accepter’s payout is the remaining portion (100% minus the Creator’s Percentage).</li>
      <li>If you win, receive 97% of the Pot (House takes 3%); Accepter wins, they receive 95% (House takes 5%).</li>
      <li>Agree on the outcome within 48 hours post-termination, or a Twist (Grok resolution) is triggered.</li>
      <li>In a Twist, the loser forfeits their 10% deposit. Resolutions are published in the Transparency Portal.</li>
      <li>Comply with local laws and accept risks of smart contract interactions.</li>
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