// src/pages/TermsAndConditions.jsx
// Defines the Terms and Conditions for using the Settle In DASH decentralized prediction marketplace.

import { Link } from "react-router-dom";
import PageHeader from "../utils/formats/PageHeader.jsx";

const TermsAndConditions = () => (
  <div className="min-h-screen bg-background p-4">
    <PageHeader title="Terms and Conditions" />
    <main className="max-w-3xl mx-auto p-4 mt-6">
      <p className="text-gray-600 text-base mb-6">
        Welcome to Settle In DASH, a decentralized prediction marketplace on the DASH blockchain. By using our platform, you agree to these Terms and Conditions. Please read them carefully before creating or accepting contracts.
      </p>

      <h3 className="text-xl font-medium text-blue-800 mb-2">1. Overview</h3>
      <p className="text-gray-600 text-sm mb-4">
        Settle In DASH enables users to create and accept contracts betting on real-world event outcomes, using DASH wallet addresses for anonymity. All processes are managed by DASH smart contracts, which handle creation, acceptance, settlement, and payouts without intermediaries. Disputes are resolved by an AI oracle (Grok). Users are responsible for ensuring compliance with applicable local laws.
      </p>

      <h3 className="text-xl font-medium text-blue-800 mb-2">2. Contract Creation</h3>
      <p className="text-gray-600 text-sm mb-4">
        To create a contract, you must:
        <ul className="list-disc list-inside space-y-1">
          <li>Connect a valid DASH wallet with sufficient funds.</li>
          <li>Stake a minimum of 1 DASH, automatically creating an additional contract worth 10% of the stake.</li>
          <li>Define a clear, verifiable question with two outcomes (e.g., “Will Bitcoin reach $100,000 by December 31, 2026?”).</li>
          <li>Specify an event date and acceptance deadline when the outcome is verifiable.</li>
        </ul>
        Creators are Sellers, taking the “Sell” (Lay) position, betting against the outcome. Contracts must be clear and verifiable to avoid disputes. Settle In DASH may delist ambiguous or unverifiable contracts.
      </p>

      <h3 className="text-xl font-medium text-blue-800 mb-2">3. Contract Acceptance</h3>
      <p className="text-gray-600 text-sm mb-4">
        To accept a contract, you must:
        <ul className="list-disc list-inside space-y-1">
          <li>Connect a valid DASH wallet with sufficient funds.</li>
          <li>Stake an amount matching the Creator’s stake, automatically creating an additional contract worth 10% of the stake.</li>
          <li>Take the “Buy” (Back) position, betting on the outcome.</li>
        </ul>
        Once accepted, funds are managed by the smart contract until settlement or dispute resolution.
      </p>

      <h3 className="text-xl font-medium text-blue-800 mb-2">4. Contract Settlement</h3>
      <p className="text-gray-600 text-sm mb-4">
        After the event concludes, the Creator and Accepter have 48 hours to agree on the outcome and designate the Winner:
        <ul className="list-disc list-inside space-y-1">
          <li>The Winner receives their net winnings after a 2% platform fee.</li>
          <li>Both parties’ 10% additional contracts are settled per the smart contract rules upon honest settlement.</li>
        </ul>
        If no agreement is reached within 48 hours, a Twist (Grok resolution) is triggered.
      </p>

      <h3 className="text-xl font-medium text-blue-800 mb-2">5. Twist (Dispute Resolution)</h3>
      <p className="text-gray-600 text-sm mb-4">
        In a Twist, the contract escalates to Grok, our AI oracle, which analyzes public data to determine the outcome within 48 hours:
        <ul className="list-disc list-inside space-y-1">
          <li>The Winner receives their net winnings after a 2% platform fee and retains their 10% additional contract.</li>
          <li>The losing party forfeits their stake and 10% additional contract to the Winner.</li>
          <li>All resolutions are published in the <Link to="/transparency" className="text-blue-500 hover:underline">Transparency Portal</Link> for accountability.</li>
        </ul>
        If Grok cannot determine an outcome due to insufficient data, both parties’ stakes and 10% additional contracts are refunded minus a 1% platform fee.
      </p>

      <h3 className="text-xl font-medium text-blue-800 mb-2">6. Fee Structure</h3>
      <p className="text-gray-600 text-sm mb-4">
        Settle In DASH operates a transparent fee structure:
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Net Winnings</strong>: A 2% fee is applied to the Winner’s net winnings (winnings after subtracting the stake).</li>
          <li><strong>Additional Contract</strong>: 10% of the stake, settled per smart contract rules upon honest settlement or forfeited by the loser in a Twist.</li>
          <li><strong>Unresolvable Twist</strong>: 1% platform fee, with stakes and additional contracts refunded.</li>
        </ul>
        DASH’s low transaction fees (approximately $0.0002–$0.001) minimize additional costs.
      </p>

      <h3 className="text-xl font-medium text-blue-800 mb-2">7. Payout Calculation</h3>
      <p className="text-gray-600 text-sm mb-4">
        Payouts depend on the stake and the Creator’s Percentage, which determines the split of the total stake before platform fees:
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Creator’s Percentage</strong>: The percentage of the stake the Accepter wins if correct, or the Creator pays if the Accepter wins. The Creator’s payout is the remaining percentage (100% minus Creator’s Percentage).</li>
          <li><strong>Example</strong>: For a 10 DASH stake with a 25% Creator’s Percentage:
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>If the Accepter (Buyer) wins, they receive 2.425 DASH (25% of 10 = 2.5 DASH, minus 2% fee = 0.075 DASH).</li>
              <li>If the Creator (Seller) wins, they receive 7.275 DASH (75% of 10 = 7.5 DASH, minus 2% fee = 0.225 DASH).</li>
            </ul>
          </li>
          <li><strong>Before Fees</strong>: Payouts are calculated before applying the 2% platform fee, displayed during contract creation or settlement.</li>
        </ul>
      </p>

      <h3 className="text-xl font-medium text-blue-800 mb-2">8. User Responsibilities</h3>
      <p className="text-gray-600 text-sm mb-4">
        By using Settle In DASH, you agree to:
        <ul className="list-disc list-inside space-y-1">
          <li>Maintain a valid DASH wallet with sufficient funds for stakes and additional contracts.</li>
          <li>Create clear, verifiable contract questions to minimize disputes.</li>
          <li>Comply with all applicable local laws regarding betting and cryptocurrency use.</li>
          <li>Understand and accept the risks of smart contract interactions and blockchain transactions.</li>
        </ul>
        Settle In DASH is a decentralized platform controlled by smart contracts, with no custody of user funds or requirement for personal information.
      </p>

      <h3 className="text-xl font-medium text-blue-800 mb-2">9. Disclaimers</h3>
      <p className="text-gray-600 text-sm mb-4">
        Settle In DASH is not responsible for:
        <ul className="list-disc list-inside space-y-1">
          <li>Losses due to blockchain errors, wallet mismanagement, or user errors.</li>
          <li>Legal consequences arising from non-compliance with local laws.</li>
          <li>Outcomes of Grok’s dispute resolutions, which are based on public data and are final.</li>
        </ul>
        The platform is provided “as is” without warranties. Users assume all risks associated with decentralized applications.
      </p>

      <h3 className="text-xl font-medium text-blue-800 mb-2">10. Contact</h3>
      <p className="text-gray-600 text-sm mb-6">
        For questions or support, contact us at{" "}
        <a
          href="mailto:support@settleindash.com"
          className="text-blue-500 hover:underline"
          aria-label="Email support"
        >
          support@settleindash.com
        </a>.
      </p>

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

export default TermsAndConditions;