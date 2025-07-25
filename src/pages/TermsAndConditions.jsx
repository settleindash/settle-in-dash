// src/pages/TermsAndConditions.jsx
import { Link } from "react-router-dom";

const TermsAndConditions = () => (
  <div className="min-h-screen bg-gray-100 p-4">
    <main className="max-w-3xl mx-auto mt-6">
      <h2 className="text-2xl font-semibold text-blue-800 mb-4">Terms and Conditions</h2>
      <p className="text-gray-600 text-base mb-6">
        Welcome to Settle In DASH, a decentralized prediction marketplace on the DASH blockchain. By using our platform, you agree to these Terms and Conditions. Please read them carefully before creating or accepting contracts.
      </p>

      <h3 className="text-xl font-medium text-blue-800 mb-2">1. Overview</h3>
      <p className="text-gray-600 text-sm mb-4">
        Settle In DASH enables users to create and accept contracts betting on real-world event outcomes using DASH wallet addresses for anonymity. The platform operates without intermediaries, relying on DASH smart contracts for escrow, settlement, and payouts, and an AI oracle (Grok) for dispute resolution. Users are responsible for ensuring compliance with local laws.
      </p>

      <h3 className="text-xl font-medium text-blue-800 mb-2">2. Contract Creation</h3>
      <p className="text-gray-600 text-sm mb-4">
        To create a contract, you must:
        <ul className="list-disc list-inside space-y-1">
          <li>Connect a DASH wallet with sufficient funds.</li>
          <li>Deposit a minimum stake of 1 DASH and a 10% deposit, held in escrow.</li>
          <li>Define a clear, verifiable question with two outcomes (e.g., “Will Bitcoin reach $100,000 by 2026? Yes/No”).</li>
          <li>Specify a termination date when the outcome is verifiable.</li>
        </ul>
        As the Creator, you take the “Yes” position. Contracts must be clear to avoid disputes. Settle In DASH reserves the right to delist unclear or unverifiable contracts.
      </p>

      <h3 className="text-xl font-medium text-blue-800 mb-2">3. Contract Acceptance</h3>
      <p className="text-gray-600 text-sm mb-4">
        To accept a contract, you must:
        <ul className="list-disc list-inside space-y-1">
          <li>Connect a DASH wallet with sufficient funds.</li>
          <li>Deposit an equal stake and a 10% deposit, matching the Creator’s contribution.</li>
          <li>Take the “No” position, betting against the Creator’s outcome.</li>
        </ul>
        Once accepted, funds are locked in the smart contract until settlement or dispute resolution.
      </p>

      <h3 className="text-xl font-medium text-blue-800 mb-2">4. Contract Settlement</h3>
      <p className="text-gray-600 text-sm mb-4">
        After the termination date, the Creator and Accepter have 48 hours to agree on the outcome and designate the Winner:
        <ul className="list-disc list-inside space-y-1">
          <li>If the Creator is the Winner, they receive 97% of the Pot; the House takes 3%.</li>
          <li>If the Accepter is the Winner, they receive 95% of the Pot; the House takes 5%.</li>
          <li>Both parties’ 10% deposits are returned upon honest settlement.</li>
        </ul>
        If no agreement is reached within 48 hours, a Twist is triggered.
      </p>

      <h3 className="text-xl font-medium text-blue-800 mb-2">5. Twist (Dispute Resolution)</h3>
      <p className="text-gray-600 text-sm mb-4">
        In a Twist, the contract is escalated to Grok, our AI oracle, which analyzes public data to determine the outcome within 48 hours:
        <ul className="list-disc list-inside space-y-1">
          <li>The Winner receives the full Pot (minus the House fee) and their 10% deposit.</li>
          <li>The losing party forfeits their 10% deposit to the House.</li>
          <li>All resolutions are published in the Transparency Portal for accountability.</li>
        </ul>
        If Grok cannot determine an outcome due to insufficient data, both parties’ stakes are refunded minus a 1% House fee.
      </p>

      <h3 className="text-xl font-medium text-blue-800 mb-2">6. Fee Structure</h3>
      <p className="text-gray-600 text-sm mb-4">
        The platform operates a transparent fee structure:
        <ul className="list-disc list-inside space-y-1">
          <li><strong>Creator as Winner</strong>: 97% of Pot to Creator, 3% to House.</li>
          <li><strong>Accepter as Winner</strong>: 95% of Pot to Accepter, 5% to House.</li>
          <li><strong>Deposit</strong>: 10% of stake, returned upon honest settlement or forfeited by the loser in a Twist.</li>
          <li><strong>Unresolvable Twist</strong>: 1% House fee, stakes refunded.</li>
        </ul>
        DASH’s low transaction fees ($0.0002-$0.001) minimize additional costs.
      </p>

      <h3 className="text-xl font-medium text-blue-800 mb-2">7. User Responsibilities</h3>
      <p className="text-gray-600 text-sm mb-4">
        By using Settle In DASH, you agree to:
        <ul className="list-disc list-inside space-y-1">
          <li>Use a valid DASH wallet and maintain sufficient funds for stakes and deposits.</li>
          <li>Create clear, verifiable contract questions to avoid disputes.</li>
          <li>Comply with local laws regarding betting and cryptocurrency use.</li>
          <li>Accept the risks of smart contract interactions and blockchain transactions.</li>
        </ul>
        Settle In DASH is a decentralized platform and does not custody user funds or require personal information.
      </p>

      <h3 className="text-xl font-medium text-blue-800 mb-2">8. Disclaimers</h3>
      <p className="text-gray-600 text-sm mb-4">
        Settle In DASH is not responsible for:
        <ul className="list-disc list-inside space-y-1">
          <li>Losses due to blockchain errors, wallet mismanagement, or user error.</li>
          <li>Legal consequences arising from non-compliance with local regulations.</li>
          <li>Outcomes of Grok’s dispute resolutions, which are based on public data and final.</li>
        </ul>
        The platform is provided “as is” without warranties. Users assume all risks associated with decentralized applications.
      </p>

      <h3 className="text-xl font-medium text-blue-800 mb-2">9. Contact</h3>
      <p className="text-gray-600 text-sm mb-6">
        For questions or support, contact us at{" "}
        <a
          href="mailto:hello@SettleInDASH.com"
          className="text-blue-500 hover:underline"
          aria-label="Email support"
        >
          hello@SettleInDASH.com
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