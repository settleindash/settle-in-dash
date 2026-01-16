// src/components/TermsSummary.jsx
// Updated 2026: Reflects testnet reality, no custody, decentralized flow

import { Link } from "react-router-dom";

const TermsSummary = () => (
  <div className="mt-4 p-4 bg-white border rounded-lg shadow text-sm text-gray-600">
    <h3 className="text-lg font-medium text-blue-800 mb-2">Terms Summary</h3>
    <p className="mb-2">
      By using Settle In DASH, you agree to the following (testnet only — no real funds at risk):
    </p>
    <ul className="list-disc list-inside space-y-1 mb-2">
      <li>Connect your Dash testnet wallet and sign messages to prove ownership.</li>
      <li>Create or accept contracts on upcoming events — stake testnet DASH is locked in secure multisig wallets (2-of-3 during open, 3-of-3 after acceptance).</li>
      <li>Funds are never held or controlled by the platform — all actions are on-chain via multisig.</li>
      <li>After the event, creator or accepter submits the outcome via wallet signature. Grok automatically submits every 15 minutes.</li>
      <li>Only tiny Dash network fees are paid to miners — the platform covers them for you.</li>
      <li>3% platform fee apply only to the winner’s share at settlement.</li>
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