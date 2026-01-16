import { useState } from "react";
import PageHeader from "../utils/formats/PageHeader.jsx";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/24/outline"; // Requires @heroicons/react

const HowItWorks = () => {
  const [openSections, setOpenSections] = useState({
    requirements: false, // New section
    signing: false,
    locking: false,
    creating: false,
    checking: false,
  });

  const toggleSection = (section) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <PageHeader title="How It Works" />
      <main className="max-w-3xl mx-auto mt-6">
        <div className="bg-white p-6 rounded-lg shadow space-y-6">
          <p className="text-gray-600 text-sm mb-4">
            Welcome to Settle In Dash! Learn how to create and accept events and contracts on our testnet platform, where you can practice without using real funds.
          </p>


{/* Payment & Fee Structure — PRECISE */}
<section className="border-b border-gray-200 pb-4">
  <button
    className="flex items-center w-full text-left text-lg font-semibold text-gray-700 mb-2"
    onClick={() => toggleSection("fees")}
  >
    <span className="mr-2">
      {openSections.fees ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
    </span>
    Payment & Fee Structure
  </button>
  {openSections.fees && (
    <div className="text-sm text-gray-600 space-y-4">
      <p>
        Settle In Dash is built to be fair and transparent. On testnet, the platform covers all real network fees so you pay nothing extra. On future mainnet, additional fees are only deducted from the winner’s share at settlement.
      </p>

      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h4 className="text-md font-semibold text-gray-700 mb-2">Network Fees (Platform Covers Them)</h4>
        <ul className="list-disc list-inside space-y-2">
          <li>
            <strong>What:</strong> Tiny blockchain fees (~0.0001–0.001 DASH per transaction, paid to miners)
          </li>
          <li>
            <strong>When:</strong> Every time funds move (creation, acceptance, move to new multisig, settlement)
          </li>
          <li>
            <strong>Who pays:</strong> The platform covers these for you — you never pay them
          </li>
          <li>
            <strong>Who receives:</strong> Dash miners (standard network cost)
          </li>
        </ul>
        <p className="mt-3 text-xs text-gray-500 italic">
          You get the full experience with zero network fee cost.
        </p>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h4 className="text-md font-semibold text-gray-700 mb-2">Cancellation or Refund</h4>
        <ul className="list-disc list-inside space-y-2">
          <li>
            <strong>What happens:</strong> Creator gets back stake minus a pre-defined <code>TX_FEE</code> (currently 0.00001 DASH)
          </li>
          <li>
            <strong>Who pays:</strong> Deducted from the stake (creator receives slightly less)
          </li>
          <li>
            <strong>Difference (dust):</strong> If the real network fee is lower than <code>TX_FEE</code>, the small leftover stays as harmless dust in the multisig address forever
          </li>
          <li>
            <strong>Platform fees:</strong> Never collected in cancellation/refund — only network fees apply
          </li>
        </ul>
        <p className="mt-3 text-xs text-gray-500 italic">
          This <code>TX_FEE</code> is a safety buffer — any residual dust stays locked in the multisig.
        </p>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <h4 className="text-md font-semibold text-gray-700 mb-2">Platform & Event Fees (Only at Settlement, Winner Pays)</h4>
        <ul className="list-disc list-inside space-y-2">
          <li>
            <strong>What:</strong> Small percentage (e.g., 3% total) deducted only from the winner’s payout
          </li>
          <li>
            <strong>When:</strong> During final settlement after event resolution
          </li>
          <li>
            <strong>Breakdown:</strong>
            <ul className="list-disc list-inside ml-6 mt-1">
              <li>Platform fee (2%) → goes to platform address</li>
              <li>Event creator fee (1%) → goes to the event creator’s wallet (you get your full 1% if you win)</li>
            </ul>
          </li>
          <li>
            <strong>Who pays:</strong> Only the winner (deducted from their winnings)
          </li>
          <li>
            <strong>Winner gets:</strong> Full pot minus 3% fees (platform covers the settlement network fee)
          </li>
          <li>
            <strong>Note:</strong> On testnet, these fees are disabled — you get the full pot.
          </li>
        </ul>
      </div>

      <p className="mt-2 text-gray-500 text-xs">
        <strong>Tip:</strong> All transactions and fees are transparent on the Dash blockchain. Check any txid on{" "}
        <a href="https://testnet-insight.dashevo.org/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
          testnet-insight.dashevo.org
        </a>.
      </p>
    </div>
  )}
</section>

          {/* What You Need for Signing */}
          <section className="border-b border-gray-200 pb-4">
            <button
              className="flex items-center w-full text-left text-lg font-semibold text-gray-700 mb-2"
              onClick={() => toggleSection("requirements")}
            >
              <span className="mr-2">
                {openSections.requirements ? (
                  <ChevronUpIcon className="w-5 h-5" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5" />
                )}
              </span>
              What You Need for Signing
            </button>
            {openSections.requirements && (
              <div className="text-sm text-gray-600 space-y-2">
                <p>
                  To create or accept events and contracts, you need a Dash testnet wallet to sign messages, proving you own the wallet. Here’s what you’ll need:
                </p>
                <ul className="list-disc list-inside space-y-2">
                  <li>
                    <strong>A Dash Testnet Wallet Address:</strong> Your wallet address must start with 'y' and be 26–35 characters long (e.g.,{" "}
                    <code className="bg-gray-100 p-1 rounded">yMWxTE3ARahFMMZobLCaYoVhmTFgcNwRoP</code>). This is for testing on the Dash testnet, not real funds.
                    <span className="ml-1 text-blue-500 cursor-help" title="A testnet wallet is used for practice on the Dash testnet, with no real money involved.">
                      [?]
                    </span>
                  </li>
                  <li>
                    <strong>Dash Core (Desktop):</strong> Download the Dash Core software for Windows, macOS, or Linux from{" "}
                    <a
                      href="https://www.dash.org/downloads/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      dash.org
                    </a>. Use it to sign messages and manage your testnet wallet.
                  </li>
                  <li>
                    <strong>Dash Wallet for Android:</strong> Install the Dash Wallet app from{" "}
                    <a
                      href="https://play.google.com/store/apps/details?id=org.dash.wallet"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      Google Play
                    </a>. It supports signing messages for testnet wallets.
                  </li>
                  <li>
                    <strong>Note for iPhone Users:</strong> The Dash Wallet for iPhone does not currently support signing messages. Use Dash Core or an Android device instead.
                  </li>
                  <li>
                    <strong>Testnet DASH:</strong> You’ll need testnet DASH to create or accept contracts. Get free testnet DASH from{" "}
                    <a
                      href="https://testnet-faucet.dash.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      testnet-faucet.dash.org
                    </a>.
                  </li>
                </ul>
                <p className="mt-2">
                  <strong>Tip:</strong> Set up Dash Core in testnet mode by adding <code>testnet=1</code> to your <code>dash.conf</code> file. See the{" "}
                  <a
                    href="https://docs.dash.org/en/stable/wallets/dashcore/testnet.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    Dash documentation
                  </a>{" "}
                  for details.
                </p>
              </div>
            )}
          </section>

          {/* Connecting Your Wallet */}
          <section className="border-b border-gray-200 pb-4">
            <button
              className="flex items-center w-full text-left text-lg font-semibold text-gray-700 mb-2"
              onClick={() => toggleSection("signing")}
            >
              <span className="mr-2">
                {openSections.signing ? (
                  <ChevronUpIcon className="w-5 h-5" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5" />
                )}
              </span>
              Connecting Your Wallet
            </button>
            {openSections.signing && (
              <div className="text-sm text-gray-600 space-y-2">
                <p>
                  To create or accept a contract, you need to connect a Dash testnet wallet. This proves you own the wallet without sharing private information.
                </p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>
                    <strong>Enter Your Wallet Address:</strong> In the form, input your Dash testnet address, which starts with 'y' (e.g.,{" "}
                    <code className="bg-gray-100 p-1 rounded">yMWxTE3ARahFMMZobLCaYoVhmTFgcNwRoP</code>). Testnet addresses are for practice only.
                    <span className="ml-1 text-blue-500 cursor-help" title="A testnet address is used for testing on the Dash testnet, not real funds.">
                      [?]
                    </span>
                  </li>
                  <li>
                    <strong>Generate a Signature:</strong> Click "Sign with QR Code" to create a QR code for the message{" "}
                    <code className="bg-gray-100 p-1 rounded">SettleInDash:&lt;your_address&gt;</code>. For example, if your address is{" "}
                    <code className="bg-gray-100 p-1 rounded">yMWxTE3ARahFMMZobLCaYoVhmTFgcNwRoP</code>, the message is{" "}
                    <code className="bg-gray-100 p-1 rounded">SettleInDash:yMWxTE3ARahFMMZobLCaYoVhmTFgcNwRoP</code>.
                  </li>
                  <li>
                    <strong>Sign with Dash Wallet:</strong> Use Dash Core or the Android Dash Wallet. In Dash Core, import your wallet’s 12-word recovery phrase, go to <strong>Tools &gt; Sign Message</strong>, paste the message, and generate a signature.
                  </li>
                  <li>
                    <strong>Verify the Signature:</strong> Scan the QR code with your wallet to get the signature, or copy it manually. Paste the signature into the manual input field and click "Verify Manual Signature". If valid, you’ll see "Wallet successfully connected and signed!".
                  </li>
                </ol>
                <p className="mt-2">
                  <strong>Tip:</strong> Need testnet DASH? Get some from{" "}
                  <a
                    href="https://testnet-faucet.dash.org/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    testnet-faucet.dash.org
                  </a>.
                </p>
              </div>
            )}
          </section>

  {/* Creating a Contract — NEW */}
          <section className="border-b border-gray-200 pb-4">
            <button
              className="flex items-center w-full text-left text-lg font-semibold text-gray-700 mb-2"
              onClick={() => toggleSection("creating")}
            >
              <span className="mr-2">
                {openSections.creating ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
              </span>
              Creating a Contract
            </button>
            {openSections.creating && (
              <div className="text-sm text-gray-600 space-y-2">
                <p>Creating a contract lets you offer a bet on an event’s outcome that others can accept.</p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>
                    <strong>Find an Event:</strong> Browse the Marketplace for upcoming events with clear outcomes (e.g., "Team A Win", "Draw", "Over 2.5").
                  </li>
                  <li>
                    <strong>Connect Wallet:</strong> Enter your Dash testnet wallet address (starts with 'y') and sign the message <code>SettleInDash:your_address</code> using Dash Core or Android Dash Wallet.
                  </li>
                  <li>
                    <strong>Fill the Form:</strong> Select the event, choose an outcome, set your stake (testnet DASH), odds (e.g., 2.00), and acceptance deadline (before event).
                  </li>
                  <li>
                    <strong>Lock Funds:</strong> Provide your stake transaction details (txid, vout, amount) from your wallet, sign the locking transaction, and submit.
                  </li>
                  <li>
                    <strong>Wait for Acceptance:</strong> Your contract appears in the Order Book. If accepted, both stakes are locked. If not, you can reclaim your funds after the deadline.
                  </li>
                </ol>
                <p className="mt-2 text-gray-500 text-xs">
                  <strong>Tip:</strong> Set a realistic deadline so others have time to accept. All funds stay safe in a shared multisig wallet.
                </p>
              </div>
            )}
          </section>

          {/* Accepting a Contract — NEW */}
          <section className="border-b border-gray-200 pb-4">
            <button
              className="flex items-center w-full text-left text-lg font-semibold text-gray-700 mb-2"
              onClick={() => toggleSection("accepting")}
            >
              <span className="mr-2">
                {openSections.accepting ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
              </span>
              Accepting a Contract
            </button>
            {openSections.accepting && (
              <div className="text-sm text-gray-600 space-y-2">
                <p>Accepting a contract means you take the opposite side of someone else’s bet.</p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>
                    <strong>Find a Contract:</strong> Go to the Order Book for an event, browse open sell positions sorted by highest odds.
                  </li>
                  <li>
                    <strong>Connect Wallet:</strong> Enter your Dash testnet wallet address and sign the message <code>SettleInDash:your_address</code>.
                  </li>
                  <li>
                    <strong>Send Matching Stake:</strong> Scan the QR code or copy the multisig address and send the exact stake amount shown (same as creator’s stake).
                  </li>
                  <li>
                    <strong>Validate & Accept:</strong> Paste the transaction ID of your stake send, validate it (InstantSend supported), then click “Accept Contract”.
                  </li>
                  <li>
                    <strong>Funds Locked:</strong> Both stakes move to a new secure 3-of-3 multisig (creator, you, oracle). Wait for event resolution to settle.
                  </li>
                </ol>
                <p className="mt-2 text-gray-500 text-xs">
                  <strong>Tip:</strong> Use the multisig address from your wallet tx history if you lose the QR code. Only one person can accept — first come, first served!
                </p>
              </div>
            )}
          </section>

          {/* Settling a Contract — NEW */}
          <section className="border-b border-gray-200 pb-4">
            <button
              className="flex items-center w-full text-left text-lg font-semibold text-gray-700 mb-2"
              onClick={() => toggleSection("settling")}
            >
              <span className="mr-2">
                {openSections.settling ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
              </span>
              Settling a Contract
            </button>
            {openSections.settling && (
              <div className="text-sm text-gray-600 space-y-2">
                <p>Settling happens after the event — you or the other party submit the outcome.</p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>
                    <strong>Find Your Contract:</strong> Go to Settle page, search by the multisig address (old or new) from your wallet tx history.
                  </li>
                  <li>
                    <strong>Connect Wallet:</strong> Enter your wallet (creator or accepter) and sign the message <code>SettleInDash:your_address</code>.
                  </li>
                  <li>
                    <strong>Choose Outcome:</strong> Select what actually happened (e.g., "Draw", "Team A Win") from the event’s possible outcomes.
                  </li>
                  <li>
                    <strong>Add Reasoning (optional):</strong> Write a short explanation (max 500 characters).
                  </li>
                  <li>
                    <strong>Submit:</strong> Confirm your submission — the backend verifies your signature and updates the contract.
                  </li>
                  <li>
                    <strong>Resolution:</strong> If both parties agree → contract settles automatically. If not → escalates to Twist (oracle resolves).
                  </li>
                </ol>
                <p className="mt-2 text-gray-500 text-xs">
                  <strong>Tip:</strong> Only creator or accepter can submit. Funds stay locked in the final 3-of-3 multisig until settled.
                </p>
              </div>
            )}
          </section>
{/* Double-Spend & Stray Funds Protection */}
<section className="border-b border-gray-200 pb-4">
  <button
    className="flex items-center w-full text-left text-lg font-semibold text-gray-700 mb-2"
    onClick={() => toggleSection("protection")}
  >
    <span className="mr-2">
      {openSections.protection ? (
        <ChevronUpIcon className="w-5 h-5" />
      ) : (
        <ChevronDownIcon className="w-5 h-5" />
      )}
    </span>
    Your Funds Are 100% Protected
  </button>
  {openSections.protection && (
    <div className="text-sm text-gray-600 space-y-3">
      <p>
        All funds are locked securely in multisig wallets and protected by the Dash blockchain. No one can steal or misuse them — even with 0 confirmations.
      </p>

      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <ul className="list-disc list-inside space-y-2">
          <li>
            <strong>Double-Accept Protection:</strong> Only one person can ever accept a contract. We check the blockchain (including unconfirmed transactions) before showing the QR code. If funds are already sent, you are blocked instantly.
          </li>
          <li>
            <strong>Stray/Excess Funds Auto-Refund:</strong> If someone accidentally sends extra DASH (e.g., front-running), our oracle automatically detects and refunds it every 15 minutes. No funds get stuck.
          </li>
          <li>
            <strong>Secure Multisig Escrow:</strong> Funds are locked in 2-of-3 (during open) or 3-of-3 (after acceptance) multisig wallets — requiring creator, accepter, and oracle agreement to release.
          </li>
          <li>
            <strong>Pre-Signed Refunds:</strong> Every contract has a pre-signed refund transaction stored in the database — if not accepted or expired, you can reclaim your stake (minus small network fee).
          </li>
          <li>
            <strong>Oracle Signing:</strong> All moves and settlements are signed by a trusted oracle, ensuring fairness and preventing unauthorized access.
          </li>
        </ul>
      </div>

      <p className="mt-2 text-gray-500 text-xs">
        Everything is enforced by the Dash blockchain itself — transparent, verifiable, and secure.
      </p>
    </div>
  )}
</section>

          {/* Locking Funds */}
          <section className="border-b border-gray-200 pb-4">
            <button
              className="flex items-center w-full text-left text-lg font-semibold text-gray-700 mb-2"
              onClick={() => toggleSection("locking")}
            >
              <span className="mr-2">
                {openSections.locking ? (
                  <ChevronUpIcon className="w-5 h-5" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5" />
                )}
              </span>
              Locking Funds in a Contract
            </button>
            {openSections.locking && (
              <div className="text-sm text-gray-600 space-y-2">
                <p>
                  When you create or accept a contract, your testnet DASH is locked in a secure shared wallet (like a joint bank account) to ensure fairness.
                </p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>
                    <strong>Create the Contract:</strong> Fill out the contract form (event, outcome, stake, odds, deadline) and connect your wallet as above.
                  </li>
                  <li>
                    <strong>Provide Wallet Funds:</strong> Enter details about available funds in your wallet (transaction ID, output number, and amount). This information comes from Dash Core’s <strong>Wallet &gt; Transactions</strong> or the <code>listunspent</code> command.
                  </li>
                  <li>
                    <strong>Sign the Transaction:</strong> A QR code is generated for the transaction to lock your funds in a secure shared wallet. Scan it with Dash Core or the Android Dash Wallet to sign, then scan or enter the signed transaction to send it to the testnet. This happens within minutes.
                  </li>
                  <li>
                    <strong>Secure Shared Wallet:</strong> The funds are locked in a shared wallet that requires agreement from you, the other party, and a trusted oracle to release them later.
                  </li>
                </ol>
                <p className="mt-2">
                  <strong>Tip:</strong> If the contract isn’t accepted by the deadline, you can use the refund transaction ID to reclaim your funds.
                </p>
              </div>
            )}
          </section>

          {/* Creating a Contract */}
          <section className="border-b border-gray-200 pb-4">
            <button
              className="flex items-center w-full text-left text-lg font-semibold text-gray-700 mb-2"
              onClick={() => toggleSection("creating")}
            >
              <span className="mr-2">
                {openSections.creating ? (
                  <ChevronUpIcon className="w-5 h-5" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5" />
                )}
              </span>
              Creating a Contract
            </button>
            {openSections.creating && (
              <div className="text-sm text-gray-600 space-y-2">
                <p>
                  Creating a contract lets you offer a bet on an event’s outcome, which others can accept.
                </p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>
                    <strong>Connect Your Wallet:</strong> Follow the steps in “Connecting Your Wallet” to sign in with your testnet address.
                  </li>
                  <li>
                    <strong>Fill Out the Form:</strong> Choose an event, select an outcome, set your stake (amount of testnet DASH), odds (e.g., 2.00 for 2:1), and an acceptance deadline (before the event).
                  </li>
                  <li>
                    <strong>Submit and Lock Funds:</strong> Click “Create Contract” to generate a secure shared wallet and transaction. You’ll need to provide wallet fund details and sign the transaction to lock your stake.
                  </li>
                  <li>
                    <strong>Wait for Acceptance:</strong> The contract is listed in the marketplace. If someone accepts it, their funds are also locked. If not accepted by the deadline, you can reclaim your funds.
                  </li>
                </ol>
                <p className="mt-2">
                  <strong>Tip:</strong> Ensure your deadline is realistic to give others time to accept your contract.
                </p>
              </div>
            )}
          </section>

          {/* Checking Funds */}
          <section className="border-b border-gray-200 pb-4">
            <button
              className="flex items-center w-full text-left text-lg font-semibold text-gray-700 mb-2"
              onClick={() => toggleSection("checking")}
            >
              <span className="mr-2">
                {openSections.checking ? (
                  <ChevronUpIcon className="w-5 h-5" />
                ) : (
                  <ChevronDownIcon className="w-5 h-5" />
                )}
              </span>
              Checking Locked Funds
            </button>
            {openSections.checking && (
              <div className="text-sm text-gray-600 space-y-2">
                <p>
                  You can verify that funds are safely locked in the shared wallet using the Dash testnet.
                </p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>
                    <strong>Verify Locked Funds:</strong> After locking, note the shared wallet address and transaction ID from the contract details. Check them on a testnet block explorer like{" "}
                    <a
                      href="https://testnet-insight.dash.org/insight/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      testnet-insight.dash.org
                    </a>.
                  </li>
                  <li>
                    <strong>Confirm Transaction:</strong> Look up the transaction ID on the block explorer to see the funds moved to the shared wallet.
                  </li>
                </ol>
                <p className="mt-2">
                  <strong>Tip:</strong> If you see errors like “insufficient funds,” ensure your wallet has enough testnet DASH from a faucet.
                </p>
              </div>
            )}
          </section>


          {/* Troubleshooting Tips */}
          <section>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">Troubleshooting Tips</h2>
            <ul className="list-disc list-inside text-sm text-gray-600 space-y-2">
              <li>
                <strong>Invalid Wallet Address:</strong> Ensure your address starts with 'y' and is 26–35 characters long. Only testnet addresses are supported.
              </li>
              <li>
                <strong>Invalid Signature:</strong> Double-check the message you signed matches <code>SettleInDash:&lt;your_address&gt;</code> exactly. Use Dash Core or Android Dash Wallet’s signing tool.
              </li>
              <li>
                <strong>Insufficient Funds:</strong> Get more testnet DASH from{" "}
                <a
                  href="https://testnet-faucet.dash.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  testnet-faucet.dash.org
                </a>.
              </li>
              <li>
                <strong>QR Code Issues:</strong> Ensure your Dash Core or Android Dash Wallet is in testnet mode (add <code>testnet=1</code> to <code>dash.conf</code> for Dash Core). Try manual signature input if scanning fails.
              </li>
              <li>
                <strong>iPhone Users:</strong> The iPhone Dash Wallet doesn’t support signing. Use Dash Core on a computer or the Android Dash Wallet instead.
              </li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
};

export default HowItWorks;