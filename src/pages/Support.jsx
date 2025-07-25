// src/pages/Support.jsx
import { Link } from "react-router-dom";

const Support = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <main className="max-w-3xl mx-auto mt-6">
        <h2 className="text-2xl font-semibold text-blue-800 mb-4">Support Center</h2>
        <p className="text-gray-600 mb-6 text-base">
          Welcome to Settle In DASH’s Support Center! We’re here to help you navigate our decentralized prediction marketplace. Explore our FAQs below or contact us at{" "}
          <a
            href="mailto:hello@SettleInDASH.com"
            className="text-blue-500 hover:underline"
            aria-label="Email support"
          >
            hello@SettleInDASH.com
          </a>.
        </p>

        <h3 className="text-xl font-medium text-blue-800 mb-4">Frequently Asked Questions</h3>
        <div className="space-y-6 mb-8">
          <div>
            <h4 className="text-lg font-medium text-gray-900">How do I create a contract?</h4>
            <p className="text-gray-600 text-sm">
              Connect your DASH wallet, navigate to the Create page, and fill out the form with a clear question (e.g., “Will Bitcoin reach $100,000 by 2026?”), a stake (minimum 1 DASH), a category, and a termination date. Your contract will be listed on the Marketplace for others to accept.
            </p>
          </div>
          <div>
            <h4 className="text-lg font-medium text-gray-900">How do I accept a contract?</h4>
            <p className="text-gray-600 text-sm">
              Browse the Marketplace, select an open contract, and click “Accept.” You’ll need to connect your DASH wallet and deposit an equal stake (plus a 10% deposit) to join. You’ll take the opposite position (e.g., “No” if the Creator chose “Yes”).
            </p>
          </div>
          <div>
            <h4 className="text-lg font-medium text-gray-900">What happens during contract settlement?</h4>
            <p className="text-gray-600 text-sm">
              After the termination date, you and the other party have 48 hours to agree on the outcome. If you’re the Winner, you receive 97% (Creator) or 95% (Accepter) of the Pot, and your 10% deposit is returned. If no agreement is reached, a Twist is triggered.
            </p>
          </div>
          <div>
            <h4 className="text-lg font-medium text-gray-900">What is a Twist?</h4>
            <p className="text-gray-600 text-sm">
              A Twist is our dispute resolution process. If you and the other party disagree on the outcome, Grok, our AI oracle, analyzes public data to determine the Winner within 48 hours. The losing party forfeits their 10% deposit. All resolutions are published in our Transparency Portal.
            </p>
          </div>
          <div>
            <h4 className="text-lg font-medium text-gray-900">What are the fees?</h4>
            <p className="text-gray-600 text-sm">
              The House takes a 3% fee if the Creator wins or a 5% fee if the Accepter wins. A 10% deposit is required from both parties, returned upon honest settlement or forfeited by the loser in a Twist.
            </p>
          </div>
          <div>
            <h4 className="text-lg font-medium text-gray-900">What if I encounter an error?</h4>
            <p className="text-gray-600 text-sm">
              Ensure your wallet is connected and has sufficient DASH for stakes or deposits. If issues persist, contact us at{" "}
              <a
                href="mailto:hello@SettleInDASH.com"
                className="text-blue-500 hover:underline"
                aria-label="Email support"
              >
                hello@SettleInDASH.com
              </a>{" "}
              with details of the error.
            </p>
          </div>
          <div>
            <h4 className="text-lg font-medium text-gray-900">How can I view resolved disputes?</h4>
            <p className="text-gray-600 text-sm">
              Visit our Transparency Portal to view all Twist resolutions, including Grok’s reasoning and data sources. This ensures fairness and accountability for all disputes.
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