// src/components/WalletIntegration.jsx
// Component for wallet integration, contract acceptance, settlement, and twist resolution with DASH blockchain.

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useContracts } from "../hooks/useContracts";
import { validateWalletAddress } from "../utils/validation";
import { SETTLE_IN_DASH_WALLET } from "../utils/constants";
import PageHeader from "../utils/formats/PageHeader.jsx";
import Dash from "dash";

const WalletIntegration = ({ event_id, eventTitle }) => {
  const navigate = useNavigate();
  const { acceptContract, settleContract, triggerTwist, error: contractsError, loading: contractsLoading } = useContracts();
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [client, setClient] = useState(null);
  const [acceptContractId, setAcceptContractId] = useState("");
  const [settleContractId, setSettleContractId] = useState("");
  const [settleOutcome, setSettleOutcome] = useState("");
  const [twistContractId, setTwistContractId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Initialize Dash Platform client
  useEffect(() => {
    const dashClient = new Dash.Client({
      network: "testnet", // Switch to "mainnet" for production
      wallet: { privateKey: null },
    });
    setClient(dashClient);
    console.log("WalletIntegration: Initialized Dash Platform client");
  }, []);

  // Connect to DASH wallet
  const connectWallet = async () => {
    try {
      const address = prompt("Enter your DASH wallet address (starts with 'X' or 'y' for testnet)");
      const validation = await validateWalletAddress(address);
      if (!validation.isValid) {
        setError(validation.message);
        console.log("CreateContract: Invalid wallet address entered");
        return;
      }
      // Prompt for signature to derive public key
      const message = "SettleInDASH";
      const signature = prompt(`Sign this message with your wallet: ${message}`);
      if (!signature) {
        setError("Signature required to verify wallet");
        console.log("CreateContract: No signature provided");
        return;
      }
      // Verify signature and derive public key
      const dashMessage = new Message(message);
      const publicKey = dashMessage.recoverPublicKey(signature, address).toString();
      setWalletAddress(address);
      setPublicKey(publicKey);
      setWalletConnected(true);
      setMessage("Wallet connected successfully!");
      console.log("CreateContract: Wallet connected, address:", address, "publicKey:", publicKey);
    } catch (err) {
      setError("Failed to connect wallet: " + err.message);
      console.error("CreateContract: Wallet connection error", err);
    }
  };

  // Accept a contract with locked funds
  const handleAcceptContract = async () => {
    if (!walletConnected) {
      setError("Please connect your wallet first");
      console.log("WalletIntegration: Attempted contract acceptance without wallet");
      return;
    }
    if (!acceptContractId) {
      setError("Please enter a contract ID");
      console.log("WalletIntegration: Missing contract ID");
      return;
    }

    try {
      const identity = await client.platform.identities.get(walletAddress);
      const document = await client.platform.documents.get(`${acceptContractId}.contract`, { where: [["$id", "==", acceptContractId]] });
      if (!document.length || document[0].data.status !== "open") {
        setError("Invalid or non-open contract");
        console.log("WalletIntegration: Invalid or non-open contract", acceptContractId);
        return;
      }
      const contract = document[0].data;
      const accepterStake = contract.stake * (contract.odds - 1);
      const additionalContract = accepterStake * 0.1; // 10% additional contract

      // Lock accepter funds (stake + 10%)
      const escrowTx = await client.wallet.createTransaction({
        recipient: contract.multisigAddress, // Use multisigAddress from contract
        amount: accepterStake + additionalContract,
      });
      await client.wallet.broadcastTransaction(escrowTx);

      // Update contract document
      await client.platform.documents.broadcast({
        replace: [{
          ...document[0].data,
          accepterWallet: walletAddress,
          status: "accepted",
          additional_contract_accepter: additionalContract,
        }],
      }, identity);

      // Update backend
      const result = await acceptContract(acceptContractId, {
        accepterWalletAddress: walletAddress,
        accepter_stake: accepterStake,
        transaction_id: escrowTx.id,
        additional_contract_accepter: additionalContract,
      });
      if (result.success) {
        setMessage("Contract accepted and funds locked!");
        setAcceptContractId("");
        console.log("WalletIntegration: Contract accepted, id:", acceptContractId);
      } else {
        throw new Error(result.error || "Failed to accept contract");
      }
    } catch (err) {
      setError("Failed to accept contract: " + err.message);
      console.error("WalletIntegration: Contract acceptance error", err);
    }
  };

  // Settle a contract
  const handleSettleContract = async () => {
    if (!walletConnected) {
      setError("Please connect your wallet first");
      console.log("WalletIntegration: Attempted contract settlement without wallet");
      return;
    }
    if (!settleContractId || settleOutcome === "") {
      setError("Please enter contract ID and outcome");
      console.log("WalletIntegration: Missing contract ID or outcome");
      return;
    }

    try {
      const identity = await client.platform.identities.get(walletAddress);
      const document = await client.platform.documents.get(`${settleContractId}.contract`, { where: [["$id", "==", settleContractId]] });
      if (!document.length || document[0].data.status !== "accepted") {
        setError("Invalid or non-accepted contract");
        console.log("WalletIntegration: Invalid or non-accepted contract", settleContractId);
        return;
      }
      const contract = document[0].data;
      const isTie = settleOutcome === "tie";
      const outcome = settleOutcome === "true";

      // Calculate payouts
      let transactions = [];
      let winner, winnerPayout, feeAmount, message;
      if (isTie) {
        const creatorRefund = contract.stake;
        const accepterRefund = contract.stake * (contract.odds - 1);
        const totalStakes = creatorRefund + accepterRefund;
        feeAmount = totalStakes * 0.01; // 1% fee for tie
        const creatorNetRefund = creatorRefund * 0.99;
        const accepterNetRefund = accepterRefund * 0.99;

        // Refund Creator (requires multisig signing, to be updated)
        const creatorTx = await client.wallet.createTransaction({
          recipient: contract.creatorWallet,
          amount: creatorNetRefund,
          multisig: { address: contract.multisigAddress, signers: [walletAddress, "ORACLE_PUBLIC_KEY"] }, // Placeholder
        });
        await client.wallet.broadcastTransaction(creatorTx);
        transactions.push({ type: "creator_refunded", tx: creatorTx.id });

        // Refund Accepter (requires multisig signing, to be updated)
        const accepterTx = await client.wallet.createTransaction({
          recipient: contract.accepterWallet,
          amount: accepterNetRefund,
          multisig: { address: contract.multisigAddress, signers: [walletAddress, "ORACLE_PUBLIC_KEY"] }, // Placeholder
        });
        await client.wallet.broadcastTransaction(accepterTx);
        transactions.push({ type: "accepter_refunded", tx: accepterTx.id });

        // Fee to Settle In DASH
        const feeTx = await client.wallet.createTransaction({
          recipient: SETTLE_IN_DASH_WALLET,
          amount: feeAmount,
        });
        await client.wallet.broadcastTransaction(feeTx);
        transactions.push({ type: "fee", tx: feeTx.id });

        console.log("WalletIntegration: Tie refunds created, creator tx:", creatorTx, "accepter tx:", accepterTx, "fee tx:", feeTx);
        message = `Contract settled as tie! Creator refunded ${creatorNetRefund.toFixed(2)} DASH, Accepter refunded ${accepterNetRefund.toFixed(2)} DASH, ${feeAmount.toFixed(2)} DASH fee to Settle In DASH`;
      } else {
        winner = outcome ? contract.accepterWallet : contract.creatorWallet;
        const totalPayout = outcome ? contract.stake * (contract.odds - 1) : contract.stake;
        winnerPayout = totalPayout * 0.98; // 98% to winner
        feeAmount = totalPayout * 0.02; // 2% to Settle In DASH

        // Winner payout (requires multisig signing, to be updated)
        const payoutTx = await client.wallet.createTransaction({
          recipient: winner,
          amount: winnerPayout,
          multisig: { address: contract.multisigAddress, signers: [walletAddress, "ORACLE_PUBLIC_KEY"] }, // Placeholder
        });
        await client.wallet.broadcastTransaction(payoutTx);
        transactions.push({ type: "payout", tx: payoutTx.id });

        // Fee
        const feeTx = await client.wallet.createTransaction({
          recipient: SETTLE_IN_DASH_WALLET,
          amount: feeAmount,
        });
        await client.wallet.broadcastTransaction(feeTx);
        transactions.push({ type: "fee", tx: feeTx.id });

        console.log("WalletIntegration: Winner payout transaction created, tx:", payoutTx, "Fee transaction created, tx:", feeTx);
        message = `Contract settled! ${winnerPayout.toFixed(2)} DASH sent to ${winner}, ${feeAmount.toFixed(2)} DASH fee to Settle In DASH`;
      }

      // Update contract document
      await client.platform.documents.broadcast({
        replace: [{
          ...document[0].data,
          status: "settled",
          outcomeResult: isTie ? null : outcome,
        }],
      }, identity);

      // Update backend
      const result = await settleContract(settleContractId, {
        outcome: settleOutcome,
        transaction_id: isTie ? transactions.find(t => t.type === "creator_refunded").tx : transactions.find(t => t.type === "payout").tx,
        fee_transaction_id: transactions.find(t => t.type === "fee").tx,
        fee_recipient: SETTLE_IN_DASH_WALLET,
        ...(isTie && { accepter_transaction_id: transactions.find(t => t.type === "accepter_refunded").tx }),
      });
      if (result.success) {
        setMessage(message);
        setSettleContractId("");
        setSettleOutcome("");
      } else {
        throw new Error(result.error || "Failed to settle contract");
      }
    } catch (err) {
      setError("Failed to settle contract: " + err.message);
      console.error("WalletIntegration: Contract settlement error", err);
    }
  };

  // Trigger twist resolution
  const handleTriggerTwist = async () => {
    if (!walletConnected) {
      setError("Please connect your wallet first");
      console.log("WalletIntegration: Attempted twist trigger without wallet");
      return;
    }
    if (!twistContractId) {
      setError("Please enter a contract ID");
      console.log("WalletIntegration: Missing contract ID for twist");
      return;
    }

    try {
      const identity = await client.platform.identities.get(walletAddress);
      const document = await client.platform.documents.get(`${twistContractId}.contract`, { where: [["$id", "==", twistContractId]] });
      if (!document.length || document[0].data.status !== "twist") {
        setError("Invalid or non-twist contract");
        console.log("WalletIntegration: Invalid or non-twist contract", twistContractId);
        return;
      }
      const contract = document[0].data;

      // Trigger twist resolution via Grok
      const result = await triggerTwist(twistContractId);
      if (!result.success) {
        throw new Error(result.error || "Failed to resolve twist");
      }

      const winner = result.contract.winner;
      let transactions = [];
      let message;
      if (winner === "tie") {
        // Inconclusive outcome: refund stakes + 10% minus 1% fee
        const creatorRefund = (contract.stake + contract.additional_contract_creator) * 0.99;
        const accepterRefund = (contract.stake * (contract.odds - 1) + contract.additional_contract_accepter) * 0.99;
        const totalStakes = contract.stake + contract.stake * (contract.odds - 1) + contract.additional_contract_creator + contract.additional_contract_accepter;
        const feeAmount = totalStakes * 0.01;

        // Refund Creator (requires multisig signing, to be updated)
        const creatorTx = await client.wallet.createTransaction({
          recipient: contract.creatorWallet,
          amount: creatorRefund,
          multisig: { address: contract.multisigAddress, signers: [walletAddress, "ORACLE_PUBLIC_KEY"] }, // Placeholder
        });
        await client.wallet.broadcastTransaction(creatorTx);
        transactions.push({ type: "creator_refunded", tx: creatorTx.id });

        // Refund Accepter (requires multisig signing, to be updated)
        const accepterTx = await client.wallet.createTransaction({
          recipient: contract.accepterWallet,
          amount: accepterRefund,
          multisig: { address: contract.multisigAddress, signers: [walletAddress, "ORACLE_PUBLIC_KEY"] }, // Placeholder
        });
        await client.wallet.broadcastTransaction(accepterTx);
        transactions.push({ type: "accepter_refunded", tx: accepterTx.id });

        // Fee
        const feeTx = await client.wallet.createTransaction({
          recipient: SETTLE_IN_DASH_WALLET,
          amount: feeAmount,
        });
        await client.wallet.broadcastTransaction(feeTx);
        transactions.push({ type: "fee", tx: feeTx.id });

        console.log("WalletIntegration: Twist inconclusive, refunds created, creator tx:", creatorTx, "accepter tx:", accepterTx, "fee tx:", feeTx);
        message = `Twist inconclusive! Creator refunded ${creatorRefund.toFixed(2)} DASH, Accepter refunded ${accepterRefund.toFixed(2)} DASH, ${feeAmount.toFixed(2)} DASH fee to Settle In DASH`;
      } else {
        // Winner determined
        const isCreatorWinner = winner === contract.creatorWallet;
        const totalPayout = isCreatorWinner ? contract.stake : contract.stake * (contract.odds - 1);
        const additionalPayout = isCreatorWinner ? contract.additional_contract_accepter : contract.additional_contract_creator;
        const winnerPayout = (totalPayout + additionalPayout) * 0.98; // 98% of total (stake + additional)
        const feeAmount = (totalPayout + additionalPayout) * 0.02; // 2% fee

        // Winner payout (requires multisig signing, to be updated)
        const payoutTx = await client.wallet.createTransaction({
          recipient: winner,
          amount: winnerPayout,
          multisig: { address: contract.multisigAddress, signers: [walletAddress, "ORACLE_PUBLIC_KEY"] }, // Placeholder
        });
        await client.wallet.broadcastTransaction(payoutTx);
        transactions.push({ type: "payout", tx: payoutTx.id });

        // Fee
        const feeTx = await client.wallet.createTransaction({
          recipient: SETTLE_IN_DASH_WALLET,
          amount: feeAmount,
        });
        await client.wallet.broadcastTransaction(feeTx);
        transactions.push({ type: "fee", tx: feeTx.id });

        console.log("WalletIntegration: Twist resolved, winner tx:", payoutTx, "fee tx:", feeTx);
        message = `Twist resolved! ${winner} receives ${winnerPayout.toFixed(2)} DASH (including additional contract), ${feeAmount.toFixed(2)} DASH fee to Settle In DASH`;
      }

      // Update backend
      const updateResult = await settleContract(twistContractId, {
        outcome: winner === "tie" ? "tie" : (winner === contract.accepterWallet ? true : false),
        transaction_id: transactions.find(t => t.type === "payout" || t.type === "creator_refunded")?.tx,
        fee_transaction_id: transactions.find(t => t.type === "fee").tx,
        fee_recipient: SETTLE_IN_DASH_WALLET,
        ...(winner === "tie" && { accepter_transaction_id: transactions.find(t => t.type === "accepter_refunded")?.tx }),
      });
      if (updateResult.success) {
        setMessage(message);
        setTwistContractId("");
      } else {
        throw new Error(updateResult.error || "Failed to update contract after twist");
      }
    } catch (err) {
      setError("Failed to resolve twist: " + err.message);
      console.error("WalletIntegration: Twist resolution error", err);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <PageHeader title="Wallet Integration - Settle In DASH" />
      <main className="max-w-3xl mx-auto mt-6">
        {/* Beta Notice */}
        <p className="text-gray-600 text-sm mb-4">
          Note: This is a beta version. Contracts are fictive with no obligations.
        </p>

        {/* Wallet Connection */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Connect DASH Wallet</h2>
          <button
            onClick={connectWallet}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
            disabled={walletConnected}
            aria-label="Connect DASH wallet"
          >
            {walletConnected ? `Connected: ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}` : "Connect Wallet"}
          </button>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
          {message && <p className="text-green-500 text-sm mt-2">{message}</p>}
        </div>

        {/* Accept Contract */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Accept Contract</h2>
          <input
            type="text"
            value={acceptContractId}
            onChange={(e) => setAcceptContractId(e.target.value)}
            placeholder="Contract ID (e.g., CONTRACT_6890de5b111b0)"
            className="border p-2 rounded w-full text-sm"
            aria-label="Contract ID to accept"
          />
          <button
            onClick={handleAcceptContract}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mt-4 text-sm w-full"
            disabled={contractsLoading || !walletConnected}
            aria-label="Accept contract"
          >
            {contractsLoading ? "Processing..." : "Accept Contract"}
          </button>
        </div>

        {/* Settle Contract */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Settle Contract</h2>
          <input
            type="text"
            value={settleContractId}
            onChange={(e) => setSettleContractId(e.target.value)}
            placeholder="Contract ID (e.g., CONTRACT_6890de5b111b0)"
            className="border p-2 rounded w-full text-sm"
            aria-label="Contract ID to settle"
          />
          <select
            value={settleOutcome}
            onChange={(e) => setSettleOutcome(e.target.value)}
            className="border p-2 rounded w-full mt-2 text-sm"
            aria-label="Contract outcome"
          >
            <option value="">Select Outcome</option>
            <option value="true">True</option>
            <option value="false">False</option>
            <option value="tie">Tie</option>
          </select>
          <button
            onClick={handleSettleContract}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 mt-4 text-sm w-full"
            disabled={contractsLoading || !walletConnected}
            aria-label="Settle contract"
          >
            {contractsLoading ? "Processing..." : "Settle Contract"}
          </button>
        </div>

        {/* Trigger Twist */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Resolve Twist</h2>
          <input
            type="text"
            value={twistContractId}
            onChange={(e) => setTwistContractId(e.target.value)}
            placeholder="Contract ID (e.g., CONTRACT_6890de5b111b0)"
            className="border p-2 rounded w-full text-sm"
            aria-label="Contract ID to resolve twist"
          />
          <button
            onClick={handleTriggerTwist}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 mt-4 text-sm w-full"
            disabled={contractsLoading || !walletConnected}
            aria-label="Resolve twist"
          >
            {contractsLoading ? "Processing..." : "Resolve Twist"}
          </button>
        </div>
      </main>
    </div>
  );
};

export default WalletIntegration;