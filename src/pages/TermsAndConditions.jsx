// src/pages/TermsAndConditions.jsx
// Updated 2026: Reflects testnet reality, no custody of funds, decentralized multisig control

import { Link } from "react-router-dom";
import PageHeader from "../utils/formats/PageHeader.jsx";

const TermsAndConditions = () => (
  <div className="min-h-screen bg-background p-4">
    <PageHeader title="Terms and Conditions" />
    <main className="max-w-3xl mx-auto p-4 mt-6">
      <p className="text-gray-600 text-base mb-6">
        Welcome to Settle In DASH, a decentralized prediction marketplace built on the DASH blockchain. This is a testnet platform — all contracts are for testing only, with no real funds or obligations involved.
      </p>

      <p className="text-gray-600 text-base mb-6">
        By using the platform, you agree to these Terms and Conditions. Please read them carefully. Settle In DASH is fully decentralized — the platform does not hold, control, or custody any user funds at any time.
      </p>

      <h3 className="text-xl font-medium text-blue-800 mb-2">1. No Custody of Funds</h3>
      <p className="text-gray-600 text-sm mb-4">
        Settle In DASH is a non-custodial platform. All funds are locked directly in DASH multisig wallets on the blockchain, controlled by the creator, accepter, and oracle private keys. The platform never holds, accesses, or manages user funds. You are solely responsible for your wallet security and compliance with local laws.
      </p>

      <h3 className="text-xl font-medium text-blue-800 mb-2">2. Testnet Only — No Real Funds</h3>
      <p className="text-gray-600 text-sm mb-4">
        This platform operates on the DASH testnet. All transactions, stakes, and payouts use testnet DASH with no real-world value. No real money is at risk. Any practice or simulation is for educational and testing purposes only.
      </p>

      <h3 className="text-xl font-medium text-blue-800 mb-2">3. Contract Creation</h3>
      <p className="text-gray-600 text-sm mb-4">
        To create a contract, you must:
        <ul className="list-disc list-inside space-y-1">
          <li>Connect a valid DASH testnet wallet</li>
          <li>Define a clear, verifiable question with possible outcomes</li>
          <li>Set stake amount, odds, category, and acceptance deadline</li>
          <li>Lock your stake in a secure 2-of-3 multisig wallet (you, placeholder, oracle)</li>
        </ul>
        Your contract is listed in the Marketplace for others to accept. All funds remain in the multisig — the platform has no control.
      </p>

      <h3 className="text-xl font-medium text-blue-800 mb-2">4. Contract Acceptance</h3>
      <p className="text-gray-600 text-sm mb-4">
        To accept a contract, you must:
        <ul className="list-disc list-inside space-y-1">
          <li>Connect your DASH testnet wallet</li>
          <li>Send matching stake to the multisig address</li>
          <li>Validate the transaction (InstantSend supported for fast confirmation)</li>
        </ul>
        Funds move to a new 3-of-3 multisig (creator, you, oracle). The contract is locked until resolution.
      </p>

      <h3 className="text-xl font-medium text-blue-800 mb-2">5. Contract Settlement</h3>
      <p className="text-gray-600 text-sm mb-4">
        After the event, creator or accepter submits the outcome via wallet signature. If both agree → contract settles automatically. If not → escalates to Twist (Grok oracle resolution). Winner receives the pot (minus small network fees). All actions are verified on-chain.
      </p>

      <h3 className="text-xl font-medium text-blue-800 mb-2">6. Twist Resolution</h3>
      <p className="text-gray-600 text-sm mb-4">
        In case of disagreement, Grok analyzes public data to determine the outcome. The resolution is final and transparent. Winner receives the pot (minus network fees). All resolutions are published for verification.
      </p>

      <h3 className="text-xl font-medium text-blue-800 mb-2">7. Fees</h3>
      <p className="text-gray-600 text-sm mb-4">
        On testnet, only tiny DASH network fees apply (paid to miners). The platform covers these fees so you pay nothing extra. In future mainnet, a small platform fee may apply only to the winner’s share at settlement. No fees are collected during creation, acceptance, or cancellation.
      </p>

      <h3 className="text-xl font-medium text-blue-800 mb-2">8. User Responsibilities</h3>
      <p className="text-gray-600 text-sm mb-4">
        You are responsible for:
        <ul className="list-disc list-inside space-y-1">
          <li>Maintaining wallet security</li>
          <li>Creating clear, verifiable questions</li>
          <li>Complying with local laws</li>
          <li>Understanding blockchain risks</li>
        </ul>
        Settle In DASH is decentralized — no entity holds your funds.
      </p>

      <h3 className="text-xl font-medium text-blue-800 mb-2">9. Disclaimers</h3>
      <p className="text-gray-600 text-sm mb-6">
        The platform is provided “as is” without warranties. We are not responsible for losses due to wallet errors, blockchain issues, or user mistakes. Use at your own risk. This is testnet — no real funds or legal obligations apply.
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