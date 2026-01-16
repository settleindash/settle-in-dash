// src/pages/Support.jsx
// Updated 2026: Added Grok monitoring & Twist details

import { Link } from "react-router-dom";
import PageHeader from "../utils/formats/PageHeader.jsx";

const Support = () => {
  return (
    <div className="min-h-screen bg-background p-4">
      <PageHeader title="Support Center" />
      <main className="max-w-3xl mx-auto p-4 mt-6">
        <p className="text-gray-600 mb-6 text-base">
          Welcome to Settle In Dash’s Support Center! We’re here to help you navigate our decentralized prediction marketplace on Dash testnet. All contracts are for testing only — no real funds are at risk.
        </p>


  {/* New: Link to How It Works — Aligned with page style */}
<div className="mb-8 bg-gray-50 p-4 rounded-lg border border-gray-200">
  <p className="text-gray-700 font-medium mb-2">
    Want a step-by-step guide to the full platform?
  </p>
  <Link
    to="/how-it-works"
    className="text-blue-600 hover:underline font-medium flex items-center gap-2"
  >
    View the complete "How It Works" guide →
  </Link>
</div>


        <h3 className="text-xl font-medium text-blue-800 mb-4">Frequently Asked Questions</h3>
        <div className="space-y-6 mb-8">
          <div>
            <h4 className="text-lg font-medium text-gray-900">How do I create a contract?</h4>
            <p className="text-gray-600 text-sm">
              Go to the Marketplace, choose an upcoming event, and click “Create Contract.” Connect your Dash testnet wallet (address starts with 'y'), select an outcome, set your stake amount (testnet DASH), odds (e.g., 2.00), and an acceptance deadline (before the event). Your stake is locked in a secure 2-of-3 multisig (you, placeholder, oracle). The contract appears in the Order Book for others to accept. No real funds are involved — this is testnet practice.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-medium text-gray-900">How do I accept a contract?</h4>
            <p className="text-gray-600 text-sm">
              Browse the Order Book for an open contract. Click “Accept,” connect your Dash testnet wallet, and send the exact matching stake to the multisig address shown (use QR code or copy-paste). Validate the transaction (InstantSend supported for fast confirmation). Funds move to a new secure 3-of-3 multisig (creator, you, oracle). The contract is now locked and waiting for event resolution. All on testnet — no real money.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-medium text-gray-900">How do I settle a contract?</h4>
            <p className="text-gray-600 text-sm">
              After the event, go to the Settle page. Search by the multisig address (old or new) from your wallet history. Connect your wallet (creator or accepter) and sign the message. Select the correct outcome from the event’s possible outcomes, add optional reasoning, and submit. The backend verifies your signature and updates the contract. If both parties agree → settled automatically. If not → escalates to Twist (oracle resolution). No real funds are at stake — pure testnet practice.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-medium text-gray-900">What happens in a Twist?</h4>
            <p className="text-gray-600 text-sm">
              Grok (our AI oracle) continuously monitors all events every 15 minutes. If the creator and accepter disagree on the outcome after the acceptance deadline, the contract automatically escalates to a Twist. Grok analyzes public data sources to determine the correct outcome within minutes to hours. The winner receives the full pot (minus small network fees), while the loser forfeits their stake. All resolutions are transparent and published in our Transparency Portal. Remember: this is testnet — no real money is involved.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-medium text-gray-900">What if I encounter an error?</h4>
            <p className="text-gray-600 text-sm">
              Most issues relate to wallet connection, insufficient testnet DASH, or invalid signatures. Try:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Getting free testnet DASH from <a href="https://testnet-faucet.dash.org/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">testnet-faucet.dash.org</a></li>
                <li>Ensuring Dash Core or Android Dash Wallet is in testnet mode</li>
                <li>Double-checking the signed message matches exactly</li>
              </ul>
              If problems persist, contact us at <a href="mailto:support@settleindash.com" className="text-blue-500 hover:underline">support@settleindash.com</a> with details.
            </p>
          </div>

          <div>
            <h4 className="text-lg font-medium text-gray-900">How can I verify everything on-chain?</h4>
            <p className="text-gray-600 text-sm">
              All funds, moves, and settlements are on the Dash testnet blockchain. Use <a href="https://testnet-insight.dashevo.org/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">testnet-insight.dashevo.org</a> to check multisig addresses, transaction IDs, and balances. Everything is transparent and verifiable.
            </p>
          </div>
        </div>

        <div className="mt-6">
          <Link
            to="/marketplace"
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 min-h-[48px] text-sm"
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