// src/pages/Support.jsx
// Provides support information and FAQs for the Settle In DASH decentralized prediction marketplace.

import { Link } from "react-router-dom";
import PageHeader from "../utils/formats/PageHeader.jsx"; // Import PageHeader for consistent headline

const Support = () => {
  return (
    <div className="min-h-screen bg-background p-4">
      <PageHeader title="Support Center" /> {/* Use PageHeader for consistency */}
      <main className="max-w-3xl mx-auto p-4 mt-6">
        <p className="text-gray-600 mb-6 text-base">
          Welcome to Settle In DASH’s Support Center! We’re here to help you navigate our decentralized prediction marketplace. Explore our FAQs below or contact us at{" "}
          <a
            href="mailto:support@settleindash.com"
            className="text-blue-500 hover:underline"
            aria-label="Email support"
          >
            support@settleindash.com
          </a>.
        </p>

        <h3 className="text-xl font-medium text-blue-800 mb-4">Frequently Asked Questions</h3>
        <div className="space-y-6 mb-8">
          <div>
            <h4 className="text-lg font-medium text-gray-900">How do I create a contract?</h4>
            <p className="text-gray-600 text-sm">
              Connect your DASH wallet, navigate to the Create page, and fill out the form with a clear, verifiable question (e.g., “Will Bitcoin reach $100,000 by December 31, 2026?”), a stake (minimum 1 DASH), a category, and an event date with an acceptance deadline. An additional contract worth 10% of the stake is automatically created. As the Creator, you take the “Sell” (Lay) position, betting against the outcome. Your contract will be listed on the Marketplace for others to accept.
            </p>
          </div>
          <div>
            <h4 className="text-lg font-medium text-gray-900">How do I accept a contract?</h4>
            <p className="text-gray-600 text-sm">
              Browse the Marketplace, select an open contract, and click “Accept.” You’ll need to connect your DASH wallet and stake an amount matching the Creator’s stake, plus an additional contract worth 10% of the stake. You’ll take the “Buy” (Back) position, betting on the outcome.
            </p>
          </div>
          <div>
            <h4 className="text-lg font-medium text-gray-900">What happens during contract settlement?</h4>
            <p className="text-gray-600 text-sm">
              After the event concludes, you and the other party have 48 hours to agree on the outcome. The Winner receives their net winnings after a 2% platform fee, and both parties’ 10% additional contracts are settled per the smart contract rules. If no agreement is reached, a Twist (Grok resolution) is triggered.
            </p>
          </div>
          <div>
            <h4 className="text-lg font-medium text-gray-900">What is a Twist?</h4>
            <p className="text-gray-600 text-sm">
              A Twist is our dispute resolution process. If you and the other party disagree on the outcome, Grok, our AI oracle, analyzes public data to determine the Winner within 48 hours. The Winner receives their net winnings after a 2% platform fee and retains their 10% additional contract, while the loser forfeits their stake and 10% additional contract to the Winner. All resolutions are published in our <Link to="/transparency" className="text-blue-500 hover:underline">Transparency Portal</Link>.
            </p>
          </div>
          <div>
            <h4 className="text-lg font-medium text-gray-900">What are the fees?</h4>
            <p className="text-gray-600 text-sm">
              A 2% platform fee is applied to the Winner’s net winnings. An additional contract worth 10% of the stake is required from both parties, settled per smart contract rules upon honest settlement or forfeited by the loser in a Twist. If a Twist is unresolvable, a 1% platform fee applies, with stakes and additional contracts refunded.
            </p>
          </div>
          <div>
            <h4 className="text-lg font-medium text-gray-900">What if I encounter an error?</h4>
            <p className="text-gray-600 text-sm">
              Ensure your wallet is connected and has sufficient DASH for stakes and additional contracts. If issues persist, contact us at{" "}
              <a
                href="mailto:support@settleindash.com"
                className="text-blue-500 hover:underline"
                aria-label="Email support"
              >
                support@settleindash.com
              </a>{" "}
              with details of the error.
            </p>
          </div>
          <div>
            <h4 className="text-lg font-medium text-gray-900">How can I view resolved disputes?</h4>
            <p className="text-gray-600 text-sm">
              Visit our <Link to="/transparency" className="text-blue-500 hover:underline">Transparency Portal</Link> to view all Twist resolutions, including Grok’s reasoning and data sources. This ensures fairness and accountability for all disputes.
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