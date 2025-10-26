// src/components/ContractCard.jsx
// Component to display contract details and handle contract acceptance for all states.

import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useContracts } from "../hooks/useContracts";
import { validateDashPublicKey, fetchConstants } from "../utils/constants";
import { validateWalletAddress } from "../utils/validation";
import PageHeader from "../utils/formats/PageHeader.jsx";
import QRCode from "qrcode";

const ContractCard = ({
  contract,
  eventTitle,
  onAcceptSuccess,
  navigateTo,
  isSingleView = false,
}) => {
  const navigate = useNavigate();
  const { acceptContract, formatStatus, formatDate, accepterStake, contractsLoading } = useContracts();
  const [accepterWalletAddress, setAccepterWalletAddress] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [walletConnected, setWalletConnected] = useState(false);
  const [signature, setSignature] = useState("");
  const [manualSignature, setManualSignature] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [constants, setConstants] = useState({ SETTLE_IN_DASH_WALLET: "", ORACLE_PUBLIC_KEY: "" });
  const [transactionInfo, setTransactionInfo] = useState(null);

  useEffect(() => {
    console.log("ContractCard: Rendering with contract_id:", contract.contract_id, "isSingleView:", isSingleView);
    fetchConstants().then((result) => {
      setConstants(result);
      console.log("ContractCard: Fetched constants:", result);
    }).catch((err) => {
      console.error("ContractCard: Error fetching constants:", err);
    });

    // Fetch transaction info for cancelled or settled contracts
    const fetchTransactionInfo = async () => {
      const txid = contract.status === "cancelled" ? (contract.refund_transaction_id || contract.refund_txid) : contract.status === "settled" ? contract.settlement_transaction_id : null;
      if (!txid) return;

      try {
        const response = await fetch("https://settleindash.com/api/contracts.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "get_transaction_info",
            data: { txid }
          }),
        });
        const result = await response.json();
        console.log("ContractCard: Transaction info response:", result);
        if (result.success) {
          setTransactionInfo(result.data);
        } else {
          console.error("ContractCard: Failed to fetch transaction info:", result.error);
        }
      } catch (err) {
        console.error("ContractCard: Error fetching transaction info:", err);
      }
    };

    fetchTransactionInfo();
  }, [contract.contract_id, contract.status, contract.refund_transaction_id, contract.refund_txid, contract.settlement_transaction_id, isSingleView]);

  const formatCustomDate = (dateString) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid date";
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
      timeZone: "Europe/Paris",
    }).replace(/(\d+)\/(\d+)\/(\d+)/, "$2/$1/$3");
  };

  const calculateFee = () => {
    if (!contract.stake || !contract.odds) return { fee: "Not set", creatorFee: "Not set", accepterFee: "Not set" };
    const stake = parseFloat(contract.stake);
    const odds = parseFloat(contract.odds);
    const creatorWinnings = stake;
    const accepterWinnings = stake * (odds - 1);
    const creatorFee = contract.additional_contract_creator ? parseFloat(contract.additional_contract_creator).toFixed(2) : (creatorWinnings * 0.02).toFixed(2);
    const accepterFee = contract.additional_contract_accepter ? parseFloat(contract.additional_contract_accepter).toFixed(2) : (accepterWinnings < 0 ? "0.00" : (accepterWinnings * 0.02).toFixed(2));
    console.log("ContractCard: Creator fee:", creatorFee, "Accepter fee:", accepterFee);
    return { fee: "Fee:", creatorFee: `Creator: ${creatorFee} DASH`, accepterFee: `Accepter: ${accepterFee} DASH` };
  };

  const creatorNetWinnings = () => {
    if (!contract.stake) return "Not set";
    const stake = parseFloat(contract.stake);
    const fee = contract.additional_contract_creator ? parseFloat(contract.additional_contract_creator) : (stake * 0.02);
    return (stake - fee).toFixed(2) + " DASH";
  };

  const accepterNetWinnings = () => {
    if (!contract.stake || !contract.odds) return "Not set";
    const stake = parseFloat(contract.stake);
    const odds = parseFloat(contract.odds);
    const winnings = stake * (odds - 1);
    const fee = contract.additional_contract_accepter ? parseFloat(contract.additional_contract_accepter) : (winnings < 0 ? 0 : winnings * 0.02);
    return (winnings - fee).toFixed(2) + " DASH";
  };

  const connectWallet = async () => {
    if (!accepterWalletAddress) {
      setError("Please enter your DASH wallet address");
      console.log("ContractCard: No accepter wallet address provided");
      return;
    }
    const walletValidation = await validateWalletAddress(accepterWalletAddress, "testnet");
    if (!walletValidation.isValid) {
      setError(walletValidation.message);
      console.log("ContractCard: Validation failed - invalid accepter wallet address");
      return;
    }

    if (contract.status !== "open") {
      setError("This contract is no longer open for acceptance");
      console.log("ContractCard: Attempted to accept non-open contract", contract.status);
      return;
    }

    setError("");
    setMessage("");
    console.log("ContractCard: Initiating wallet connection for contract_id:", contract.contract_id);

    try {
      if (!QRCode) {
        throw new Error("QRCode library is not loaded");
      }
      const qrCodeUrl = await QRCode.toDataURL(`signmessage:${accepterWalletAddress}:SettleInDash:${accepterWalletAddress}:`);
      setQrCodeUrl(qrCodeUrl);
      setMessage(
        `Please sign the message 'SettleInDash:${accepterWalletAddress}' in Dash Core (Tools > Sign Message) and enter the signature below.`
      );
    } catch (err) {
      setError("Failed to generate signature QR code: " + err.message);
      console.error("ContractCard: QR code generation error:", err);
    }
  };

  const verifyManualSignature = async (retries = 3) => {
    if (!manualSignature) {
      setError("Please enter a signature");
      console.log("ContractCard: No manual signature provided");
      return;
    }
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch("https://settleindash.com/api/contracts.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "verify-signature",
            data: {
              address: accepterWalletAddress,
              message: `SettleInDash:${accepterWalletAddress}`,
              signature: manualSignature,
            },
          }),
        });
        const responseText = await response.text();
        console.log("ContractCard: verifyManualSignature request (attempt", attempt, "):", {
          action: "verify-signature",
          data: {
            address: accepterWalletAddress,
            message: `SettleInDash:${accepterWalletAddress}`,
            signature: manualSignature,
          },
        });
        console.log("ContractCard: verifyManualSignature response (attempt", attempt, "):", responseText, "status:", response.status);
        if (!response.ok) {
          if ((response.status === 400 || response.status === 503) && attempt < retries) {
            console.log("ContractCard: Error", response.status, "received, retrying after delay...");
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            continue;
          }
          throw new Error(`HTTP error: ${response.status} - ${responseText}`);
        }
        const result = JSON.parse(responseText);
        if (result.isValid) {
          setSignature(manualSignature);
          setWalletConnected(true);
          setMessage("Wallet successfully connected and signed!");
          setManualSignature("");
          setQrCodeUrl(null);
          return;
        } else {
          setError(result.message || "Failed to verify signature");
          break;
        }
      } catch (err) {
        setError("Failed to verify manual signature: " + err.message);
        console.error("ContractCard: Manual signature verification error (attempt", attempt, "):", err);
        if (attempt === retries) {
          return;
        }
      }
    }
  };

  const handleAcceptSubmission = async () => {
    if (!walletConnected || !signature) {
      setError("Please connect and sign with your wallet first");
      console.log("ContractCard: Attempted contract acceptance without wallet or signature");
      return;
    }

    setError("");
    console.log("ContractCard: Accepting contract for contract_id:", contract.contract_id);

    try {
      const accepterPublicKey = prompt(
        `Enter the public key for your wallet address (${accepterWalletAddress}).\n` +
        `In Dash Core (testnet mode), run: validateaddress "${accepterWalletAddress}"\n` +
        `Copy the "pubkey" field.`
      );
      if (!accepterPublicKey || !validateDashPublicKey(accepterPublicKey)) {
        setError("Invalid or missing public key. Ensure you entered the correct 'pubkey' from Dash Core.");
        console.log("ContractCard: Invalid public key");
        return;
      }

      const result = await acceptContract(contract.contract_id, {
        action: "accept",
        contract_id: contract.contract_id,
        accepterWalletAddress: accepterWalletAddress,
        accepter_stake: accepterStake(contract),
        signature,
        multisig_address: contract.multisig_address,
        accepter_public_key: accepterPublicKey,
        message: `SettleInDash:${accepterWalletAddress}`,
      });

      if (result.success) {
        setMessage(`Contract ${accepterWalletAddress === contract.WalletAddress ? "cancelled" : "accepted"} successfully!`);
        if (onAcceptSuccess) onAcceptSuccess();
        setAccepterWalletAddress("");
        setSignature("");
        setManualSignature("");
        setWalletConnected(false);
        if (navigateTo) navigate(navigateTo);
      } else {
        setError(result.error || "Failed to accept or cancel contract");
        console.log("ContractCard: Failed to accept/cancel contract:", result.error);
      }
    } catch (err) {
      setError("Failed to accept contract: " + err.message);
      console.error("ContractCard: Error accepting contract:", err);
    }
  };

  return (
    <div className={isSingleView ? "min-h-screen bg-background p-4" : ""}>
      {isSingleView && <PageHeader title={eventTitle || "Contract Details"} />}
      <div className="mb-6 text-center">
        <Link to="/how-it-works" className="text-blue-500 hover:underline text-sm">
          Learn How It Works
        </Link>
      </div>
      <div className={`bg-white p-6 rounded-lg shadow text-sm mb-4 ${isSingleView ? "" : "mt-6"}`}>
        <p className="text-gray-600 text-sm mb-4">
          Note: This is a beta version. Contracts are fictive with no obligations.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-md font-semibold text-gray-700">Payouts</h3>
            <p className="mt-2 text-gray-600">Stake: {contract.stake ? `${contract.stake} DASH` : "Not set"}</p>
            <p className="mt-2 text-gray-600">Outcome: {contract.outcome || "Not set"}</p>
            <p className="mt-2 text-green-600 font-semibold">Creator (Seller) if false: {creatorNetWinnings()}</p>
            <p className="mt-2 text-green-600 font-semibold">Accepter (Buyer) if true: {accepterNetWinnings()}</p>
            <p className="mt-2 text-gray-600">Accepter Stake: {contract.accepter_stake ? `${contract.accepter_stake} DASH` : "Not set"}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-md font-semibold text-gray-700">Acceptance Details</h3>
            <p className="mt-2 text-gray-600">Odds: {contract.odds ? contract.odds : "Not set"}</p>
            <p className="mt-2 text-gray-600">Percentage: {contract.percentage ? `${contract.percentage}%` : "Not set"}</p>
            <p className="mt-2 text-gray-600">Acceptance Deadline: {formatCustomDate(contract.acceptanceDeadline)}</p>
            <div className="mt-2 text-gray-600">
              <p>{calculateFee().fee}</p>
              <p>{calculateFee().creatorFee}</p>
              <p>{calculateFee().accepterFee}</p>
              <p>(Excludes transaction fees)</p>
            </div>
          </div>
        </div>
        <div className="mb-6">
          <h3 className="text-md font-semibold text-gray-700 mb-2">Contract Info</h3>
          <p className="text-gray-600">Contract ID: {contract.contract_id || "Not set"}</p>
          <p className="text-gray-600">Status: {formatStatus(contract.status)}</p>
          <p className="mt-2 text-gray-600">Event ID: {contract.event_id || "Not set"}</p>
          <p className="mt-2 text-gray-600">Question: {contract.question || "Not set"}</p>
          <p className="mt-2 text-gray-600">Category: {contract.category || "Not set"}</p>
          <p className="mt-2 text-gray-600">Created At: {formatCustomDate(contract.created_at)}</p>
          <p className="mt-2 text-gray-600">Event Time: {formatCustomDate(contract.time)}</p>
        </div>
        <div className="mb-6">
          <h3 className="text-md font-semibold text-gray-700 mb-2">Parties</h3>
          <p className="text-gray-600">Creator Wallet Address: {contract.WalletAddress || "Not set"}</p>
          <p className="text-gray-600">Accepter Wallet Address: {contract.accepterWalletAddress || "Not set"}</p>
          <p className="text-gray-600">Multisig Address: {contract.multisig_address || "Not set"}</p>
        </div>
        <div className="mb-6">
          <h3 className="text-md font-semibold text-gray-700 mb-2">Resolution Details</h3>
          <p className="text-gray-600">Creator Winner Choice: {contract.creator_winner_choice || "Not set"}</p>
          <p className="text-gray-600">Creator Winner Reasoning: {contract.creator_winner_reasoning || "Not set"}</p>
          <p className="text-gray-600">Accepter Winner Choice: {contract.accepter_winner_choice || "Not set"}</p>
          <p className="text-gray-600">Accepter Winner Reasoning: {contract.accepter_winner_reasoning || "Not set"}</p>
          <p className="text-gray-600">Resolution: {contract.resolution || "Not set"}</p>
          <p className="text-gray-600">Resolution Reasoning: {contract.resolutionDetails_reasoning || "Not set"}</p>
          <p className="text-gray-600">Resolution Timestamp: {formatCustomDate(contract.resolutionDetails_timestamp)}</p>
          <p className="text-gray-600">Winner: {contract.winner || "Not set"}</p>
        </div>
        {contract.status === "open" && (
          <p className="text-gray-600 mt-2">Contract is open for acceptance.</p>
        )}
        {contract.status === "accepted" && (
          <p className="text-green-600 mt-2">This contract has been accepted.</p>
        )}
        {contract.status === "cancelled" && (
          <p className="text-yellow-500 mt-2">
            Cancelled: Creator accepted with the same wallet address.
            {transactionInfo ? (
              <span>
                {" "}
                Transaction: {transactionInfo.status}, {transactionInfo.amount} DASH, {formatCustomDate(transactionInfo.timestamp)}
              </span>
            ) : (
              <span> Transaction: Not available</span>
            )}
          </p>
        )}
        {contract.status === "settled" && (
          <p className="text-green-600 mt-2">
            Settled: Outcome - {contract.resolution || "Not set"}
            {transactionInfo ? (
              <span>
                {" "}
                Transaction: {transactionInfo.status}, {transactionInfo.amount} DASH, {formatCustomDate(transactionInfo.timestamp)}
              </span>
            ) : (
              <span> Transaction: Not available</span>
            )}
          </p>
        )}
        {contract.status === "twist" && (
          <p className="text-blue-600 mt-2">
            Escalated to Twist: Awaiting resolution.
            {contract.resolutionDetails_reasoning && (
              <span> Reason: {contract.resolutionDetails_reasoning}</span>
            )}
          </p>
        )}
        {contract.status === "open" && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-md font-semibold text-gray-700 mb-2">Accept Contract</h3>
            <p className="text-sm text-gray-600 mb-2">Enter your wallet address to accept this peer-to-peer contract (use the same address as creator to cancel).</p>
            <label htmlFor={`accepterWalletAddress-${contract.contract_id}`} className="block text-sm font-medium text-gray-600">
              Your DASH Wallet Address
            </label>
            <input
              id={`accepterWalletAddress-${contract.contract_id}`}
              type="text"
              className="border p-2 rounded w-full mt-1 text-sm"
              value={accepterWalletAddress}
              onChange={(e) => setAccepterWalletAddress(e.target.value)}
              placeholder="Enter a valid DASH testnet address (starts with 'y')"
              aria-label="Accepter wallet address"
              disabled={contract.status !== "open" || contractsLoading}
            />
            <div className="mt-4">
              <label className="block text-sm font-bold text-gray-700 mb-2">Wallet Signature</label>
              <button
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 text-sm"
                onClick={connectWallet}
                disabled={walletConnected || contractsLoading}
                aria-label="Connect Wallet and Sign"
              >
                {walletConnected ? `Connected: ${accepterWalletAddress.slice(0, 6)}...${accepterWalletAddress.slice(-4)}` : "Connect Wallet & Sign"}
              </button>
              {qrCodeUrl && !signature && (
                <div className="mt-4">
                  <p className="text-gray-700 text-sm mb-2">
                    Please sign the message <code>SettleInDash:{accepterWalletAddress}</code> in Dash Core (Tools &gt; Sign Message) and enter the signature below.
                  </p>
                  <img src={qrCodeUrl} alt="QR Code for wallet signing" className="w-64 h-64 mx-auto" />
                  <div className="mt-4">
                    <label htmlFor={`manualSignature-${contract.contract_id}`} className="block text-sm text-gray-700 mb-2">
                      Enter signature:
                    </label>
                    <input
                      id={`manualSignature-${contract.contract_id}`}
                      type="text"
                      className="border p-2 rounded w-full text-sm mb-2"
                      value={manualSignature}
                      onChange={(e) => setManualSignature(e.target.value)}
                      placeholder="Paste signature here"
                      aria-label="Manual signature input"
                    />
                    <button
                      onClick={() => verifyManualSignature()}
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
                      disabled={contractsLoading}
                      aria-label="Verify Signature"
                    >
                      Verify Signature
                    </button>
                  </div>
                </div>
              )}
            </div>
            {message && <p className="text-green-500 text-sm mt-2">{message}</p>}
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mt-4 text-sm w-full"
              onClick={handleAcceptSubmission}
              disabled={contractsLoading || contract.status !== "open" || !walletConnected || !signature}
              aria-label={`Accept ${contract.position_type} contract ${contract.contract_id}`}
            >
              {contractsLoading ? "Processing..." : contract.position_type === "buy" ? "Sell (Lay)" : "Buy (Back)"} Contract
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractCard;