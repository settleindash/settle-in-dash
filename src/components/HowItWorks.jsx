// src/components/HowItWorks.jsx
import React from "react";
import PageHeader from "../utils/formats/PageHeader.jsx";

const HowItWorks = () => {
  return (
    <div className="min-h-screen bg-background p-4">
      <PageHeader title="How It Works" />
      <main className="max-w-3xl mx-auto mt-6">
        <div className="bg-white p-6 rounded-lg shadow space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">What Happens When You Sign the Wallet Address?</h2>
            <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
              <li>
                <strong>Input and QR Code Generation:</strong> Enter your Dash testnet address (e.g., 
                <code>yMWxTE3ARahFMMZobLCaYoVhmTFgcNwRoP</code>) and click "Connect Wallet". A QR code is generated and displayed. The QR code contains the message to sign, which is:
                <div className="mt-2 p-2 bg-gray-100 rounded">
                  <code>SettleInDash:&lt;your_address&gt;</code>
                </div>
                For example, if your address is <code>yMWxTE3ARahFMMZobLCaYoVhmTFgcNwRoP</code>, the message to sign is <code>SettleInDash:yMWxTE3ARahFMMZobLCaYoVhmTFgcNwRoP</code>. Copy this exact message (without "message") into the signing tool.
              </li>
              <li>
                <strong>Signing the Message:</strong> Scan the QR code with a Dash wallet (e.g., Dash Core on desktop, as the iPhone Dash Wallet doesn’t support signing). In Dash Core, import your wallet’s 12-word recovery phrase, go to <code>Tools &gt; Sign Message</code>, enter the address and the message (e.g., <code>SettleInDash:yMWxTE3ARahFMMZobLCaYoVhmTFgcNwRoP</code>), and generate a signature. Copy the signature and paste it into the manual input field, then click "Verify Manual Signature".
              </li>
              <li>
                <strong>Verification:</strong> The system verifies the signature using cryptographic methods to confirm you control the wallet. If successful, the UI shows "Wallet successfully connected and signed!".
              </li>
            </ol>
            <p className="text-sm text-gray-600 mt-2">This step ensures only the wallet owner can create a contract, adding security.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">How Are Funds Locked and When Are They Transferred to the Multisig Wallet?</h2>
            <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
              <li>
                <strong>Contract Creation Initiation:</strong> After signing the wallet and filling out the contract form (event, outcome, stake, odds, acceptance deadline), click "Create Contract". A multisig address is generated, requiring agreement from the creator, accepter, and oracle.
              </li>
              <li>
                <strong>Transaction Preparation:</strong> You’re prompted to enter UTXO details (txid, output index, amount in DASH) from your wallet. A transaction is created to send the total amount (e.g., stake + 10% additional) to the multisig address, with change returned to your wallet.
              </li>
              <li>
                <strong>Signing and Broadcasting:</strong> A QR code with the raw transaction hex is displayed. Scan it with Dash Core to sign the transaction, then scan the signed transaction QR code (or use manual input) to broadcast it to the Dash testnet. Funds are locked in the multisig address upon confirmation.
              </li>
              <li>
                <strong>Timing of Transfer:</strong> Funds are transferred and locked immediately after the transaction is confirmed on the blockchain (within a few minutes on testnet).
              </li>
            </ol>
            <p className="text-sm text-gray-600 mt-2">The multisig wallet prevents unilateral spending, requiring at least two of the three parties to agree later.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">When Can You Press the 'Create Contract' Button, and Does It Involve a Fund Transfer?</h2>
            <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
              <li>
                <strong>When You Can Press:</strong> The button is enabled when a valid event is selected, all form fields (outcome, position type, stake, odds, acceptance deadline) pass validation, and the wallet is successfully signed.
              </li>
              <li>
                <strong>Fund Transfer Involvement:</strong> Pressing the button initiates the process by generating the multisig address and preparing the transaction. It prompts you for UTXO details and displays a QR code. Funds are transferred only after you sign and broadcast the transaction, not immediately upon clicking.
              </li>
            </ol>
            <p className="text-sm text-gray-600 mt-2">This two-step process gives you control to review and confirm the fund lock.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-700 mb-4">How Do We Check That There Are Funds?</h2>
            <ol className="list-decimal list-inside text-sm text-gray-600 space-y-2">
              <li>
                <strong>Before Locking:</strong> In Dash Core, use the <code>listunspent</code> command to check available UTXOs and confirm the entered UTXO has enough DASH.
              </li>
              <li>
                <strong>After Locking:</strong> Note the multisig address from logs or database. Use a Dash testnet block explorer (e.g., <a href="https://insight.dashtest.net" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">insight.dashtest.net</a>) or Dash Core’s <code>getreceivedbyaddress</code> to verify the locked amount in the multisig address.
              </li>
              <li>
                <strong>Transaction Confirmation:</strong> Check the transaction ID (txid) from the broadcast on the block explorer to confirm funds moved to the multisig address.
              </li>
              <li>
                <strong>Database Check:</strong> If logged, query the database for the <code>multisig_address</code> and <code>transaction_id</code> to match blockchain data.
              </li>
            </ol>
            <p className="text-sm text-gray-600 mt-2">This ensures funds are present and traceable on the testnet.</p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default HowItWorks;