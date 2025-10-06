import React, { useState } from "react";
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
                    <strong>Check Available Funds:</strong> Before locking, use Dash Core’s <strong>Wallet &gt; Transactions</strong> or <code>listunspent</code> to confirm you have enough testnet DASH.
                  </li>
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