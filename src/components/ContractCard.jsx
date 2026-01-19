// src/components/ContractCard.jsx
// REFACTORED: Uses joined event fields from get_contracts.php — no separate event fetch needed

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useContracts } from "../hooks/useContracts.js";
import { useConstants } from "../hooks/useConstants.js";
import { validateDashPublicKey } from "../utils/validation.js";
import { formatCustomDate } from "../utils/validation";
import PageHeader from "../utils/formats/PageHeader.jsx";
import QRCode from "qrcode";

const ContractCard = ({
  contract,
  eventTitle,
  onAcceptSuccess,
  navigateTo,
  isSingleView = false
}) => {
  const navigate = useNavigate();

  // HOOKS
  const { constants, loading: constantsLoading, error: constantsError } = useConstants();
  
  const {
    acceptContract,
    validateTransaction,
    listUnspent,
    accepterStake,
    formatStatus,
    getTransactionInfo,
    verifySignature
  } = useContracts();

  // LOCAL STATE
  const [accepterWalletAddress, setAccepterWalletAddress] = useState("");
  const [accepterPublicKey, setAccepterPublicKey] = useState("");
  const [error, setError] = useState("");
  const [validationError, setValidationError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [message, setMessage] = useState("");
  const [walletConnected, setWalletConnected] = useState(false);
  const [signature, setSignature] = useState("");
  const [manualSignature, setManualSignature] = useState("");
  const [accepterTransactionId, setAccepterTransactionId] = useState("");
  const [stakeTxValidated, setStakeTxValidated] = useState(false);
  const [stakeQrCodeUrl, setStakeQrCodeUrl] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [transactionInfo, setTransactionInfo] = useState(null);


  // EARLY RETURN
  if (constantsLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><p>Loading...</p></div>;
  if (constantsError || !constants) return <div className="min-h-screen bg-background text-red-500 text-center p-8"><p>Failed to load config</p></div>;

  const NETWORK = constants?.NETWORK || '';
  const ORACLE_PUBLIC_KEY = constants?.ORACLE_PUBLIC_KEY || '';

  // Use joined event fields (from get_contracts.php)
  const eventTitleToDisplay = contract.event_title || eventTitle || "Contract Details";
  const eventDescription = contract.event_description || "";
  const eventPossibleOutcomes = contract.event_possible_outcomes || null;
  const eventResolution = contract.event_resolution || null;
  const eventWinningOutcome = contract.event_winning_outcome || null;
  const eventStatus = contract.event_status || null;

  console.log("ORACLE_PUBLIC_KEY =", ORACLE_PUBLIC_KEY);
  console.log("NETWORK =", NETWORK);

  // WALLET CONNECTION
  const connectWallet = async () => {
    if (!accepterWalletAddress) return setError("Please enter your DASH wallet address");
    if (!accepterPublicKey) return setError("Please enter your public key");
    if (!/^y[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(accepterWalletAddress)) return setError(`Invalid Dash ${NETWORK} address`);
    if (!validateDashPublicKey(accepterPublicKey)) return setError("Invalid public key");
    if (contract.status !== "open") return setError("This contract is no longer open");

    setError("");
    setSubmitError("");
    try {
      setLoading(true);
      const url = await QRCode.toDataURL(`signmessage:${accepterWalletAddress}:SettleInDash:${accepterWalletAddress}:`);
      setQrCodeUrl(url);
      setMessage("Please sign the message in Dash Core");
    } catch {
      setMessage("QR failed — sign manually in Dash Core");
    } finally {
      setLoading(false);
    }
  };

  // MANUAL SIGNATURE VERIFICATION
  const verifyManualSignature = async () => {
    if (!manualSignature) return setError("Please enter a signature");

    try {
      setLoading(true);
      setError("");
      setSubmitError("");
      const isValid = await verifySignature(accepterWalletAddress, manualSignature);
      
      if (isValid) {
        setSignature(manualSignature);
        setWalletConnected(true);
        setMessage("Wallet verified!");
        setManualSignature("");
        setQrCodeUrl(null);
      } else {
        setError("Invalid signature");
      }
    } catch {
      setError("Verification failed");
    } finally {
      setLoading(false);
    }
  };

  // GENERATE STAKE QR CODE
  const generateStakeQrCode = async () => {
    if (!walletConnected || !signature) return setError("Connect wallet first");
    if (contract.status !== "open") return setError("Contract no longer open");

    const creatorStake = Number(contract.stake) || 0;
    const stakeToSend = Number(accepterStake(contract)) || 0;

    if (!contract.multisig_address) return setError("Missing multisig address");

    try {
      setLoading(true);
      setError("");
      setSubmitError("");

      const result = await listUnspent(contract.multisig_address, 0);
      if (result.success) {
        const total = result.total_amount || 0;
        const tolerance = 0.001;

        if (total > creatorStake + tolerance) {
          setError("Someone is already accepting this contract (extra funds detected). Refresh.");
          return;
        }
      }

      const amount = stakeToSend.toFixed(8);
      const url = await QRCode.toDataURL(`dash:${contract.multisig_address}?amount=${amount}`);
      setStakeQrCodeUrl(url);
      setMessage(`Send ${amount} DASH — you are first!`);
    } catch (err) {
      setError("Check failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // VALIDATE STAKE TRANSACTION
  const handleValidateStakeTransaction = async () => {
    if (!accepterTransactionId) {
      setValidationError("Enter transaction ID");
      return;
    }

    setValidationError("");
    setError("");
    setSubmitError("");

    try {
      setLoading(true);
      setMessage("Validating stake transaction...");

      const result = await validateTransaction({
        txid: accepterTransactionId,
        expected_destination: contract.multisig_address,
        expected_amount: accepterStake(contract),
        min_confirmations: 0
      });

      if (result.success) {
        setStakeTxValidated(true);
        setMessage("Stake confirmed!");
        setValidationError("");
      } else {
        let msg = result.error || "Invalid transaction";
        if (result.error_code === "amount_mismatch" || result.message?.includes("amount")) {
          msg = "Wrong amount sent. Please send the exact required stake.";
        } else if (result.message?.includes("already")) {
          msg = "Transaction already processed — contract may be accepted.";
        }
        setValidationError(msg);
      }
    } catch (err) {
      setValidationError("Validation error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

   // ACCEPT CONTRACT — FINAL, WORKING VERSION with submitError
   const handleAcceptSubmission = async () => {
    console.log("Accept clicked — starting!");
    if (!walletConnected || !signature || !stakeTxValidated) return;

    if (!ORACLE_PUBLIC_KEY) {
      setError("Oracle configuration missing. Please refresh.");
      return;
    }

    setLoading(true);
    setError("");
    setSubmitError("");

    try {
      // Generate NEW 3-of-3 multisig
      const multisigResponse = await fetch("https://settleindash.com/api/contracts.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_multisig",
          data: {
            public_keys: [
              contract.creator_public_key,
              accepterPublicKey,
              ORACLE_PUBLIC_KEY,
            ],
            required_signatures: 3,
            network: NETWORK
          }
        })
      });

      const multisigResult = await multisigResponse.json();
      if (!multisigResult.success) {
        throw new Error(multisigResult.error || "Failed to create new multisig");
      }

      // Accept contract with new multisig
      const result = await acceptContract(contract.contract_id, {
        accepterWalletAddress,
        signature,
        message: `SettleInDash:${accepterWalletAddress}`,
        accepter_public_key: accepterPublicKey,
        accepter_transaction_id: accepterTransactionId,
        new_multisig_address: multisigResult.multisig_address
      });

      if (result.success) {
        setMessage("Contract accepted successfully!");
        setSubmitError("");
        onAcceptSuccess?.();
        // Reset form
        setAccepterWalletAddress("");
        setAccepterPublicKey("");
        setSignature("");
        setAccepterTransactionId("");
        setStakeTxValidated(false);
        setStakeQrCodeUrl(null);
        setWalletConnected(false);
        if (navigateTo) navigate(navigateTo);
      } else {
        let userMsg = "Failed to accept contract.";

        if (result.error_code === "amount_mismatch") {
          userMsg = result.message || "Wrong stake amount sent. Please send the exact required amount.";
        } else if (result.message?.toLowerCase().includes("already")) {
          userMsg = "Contract already accepted — funds are safe.";
        } else {
          userMsg += " " + (result.error || result.message || "Unknown error");
        }

        setSubmitError(userMsg); // Show under Accept button
      }
    } catch (err) {
      setSubmitError("Accept failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------
  return (
    <div className={isSingleView ? "min-h-screen bg-background p-4" : ""}>
      {isSingleView && <PageHeader title={eventTitleToDisplay} />}
      <div className="mb-6 text-center">
        <Link to="/how-it-works" className="text-blue-500 hover:underline text-sm">
          Learn How It Works
        </Link>
      </div>

      <div className={`bg-white p-6 rounded-lg shadow text-sm mb-4 ${isSingleView ? "" : "mt-6"}`}>
        <p className="text-gray-600 text-sm mb-4">
          Note: This is a beta version. Contracts are fictive with no obligations.
        </p>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
        {message && <p className="text-green-500 text-sm mb-4">{message}</p>}

        {/* EVENT DESCRIPTION — Dedicated prominent box */}
        {eventDescription ? (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-md font-semibold text-gray-700 mb-2">Event Description</h3>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">
              {eventDescription}
            </p>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg opacity-60 border border-gray-200">
            <p className="text-sm text-gray-500 italic">
              No event description provided.
            </p>
          </div>
        )}

        {/* PAYOUTS & ACCEPTANCE DETAILS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Left: Acceptance Details */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-md font-semibold text-gray-700">Acceptance Details</h3>
            <p className="mt-2 text-gray-600">Stake: {contract.stake ? `${contract.stake} DASH` : "Not set"}</p>
            <p className="mt-2 text-gray-600">Odds: {contract.odds ?? "Not set"}</p>
            <p className="mt-2 text-gray-600">Accepter Stake: {contract.accepter_stake ? `${contract.accepter_stake} DASH` : accepterStake(contract) || "Not set"}</p>
            <p className="mt-2 text-gray-600">Acceptance Deadline: {formatCustomDate(contract.acceptanceDeadline)}</p>
            <p className="mt-2 text-gray-600">Creator is betting on: {contract.outcome || "Not set"}</p>
          </div>

          {/* Possible Outcomes — Slim & modern */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-md font-semibold text-gray-700">Possible Outcomes</h3>
            <div className="mt-4 pt-4 border-t border-gray-200">  
              <div className="flex flex-col items-center gap-2">
                {(() => {
                  let outcomes = [];

                  // Use the JOINED field from backend
                  const rawOutcomes = contract.event_possible_outcomes || null;

                  if (rawOutcomes) {
                    if (Array.isArray(rawOutcomes)) {
                      outcomes = rawOutcomes;
                    } else if (typeof rawOutcomes === 'string') {
                      try {
                        outcomes = JSON.parse(rawOutcomes.trim());
                      } catch (e) {
                        console.error("Failed to parse outcomes:", e);
                        return <span className="text-xs text-red-500">Invalid format</span>;
                      }
                    }
                  }

                  if (outcomes.length === 0) {
                    return <span className="text-sm text-gray-500 italic">Not specified</span>;
                  }

                  return outcomes.map((outcome, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-900 border border-gray-300"
                    >
                      {String(outcome).trim()}
                    </span>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>

        {/* CONTRACT INFO */}
        <div className="mb-6">
          <h3 className="text-md font-semibold text-gray-700 mb-2">Contract Info</h3>
          <p className="text-gray-600">Event ID: {contract.event_id ?? "Not set"}</p>
          <p className="text-gray-600">Contract ID: {contract.contract_id ?? "Not set"}</p>
          <p className="text-gray-600">Question: {contract.question ?? "Not set"}</p>
          <p className="text-gray-600">Category: {contract.category ?? "Not set"}</p>
          <p className="text-gray-600">Created At: {formatCustomDate(contract.created_at)} <span className="text-xs text-gray-500">(your local time)</span></p>
          <p className="text-gray-600">Event Time: {contract.event_date ? formatCustomDate(contract.event_date) : "Not set"} <span className="text-xs text-gray-500">(your local time)</span></p>
          <p className="text-gray-600">Status: {formatStatus(contract.status)}</p>
        </div>

        {/* PARTIES & ESCROW */}
        <div className="mb-6">
          <h3 className="text-md font-semibold text-gray-700 mb-3">Parties & Escrow</h3>
          <div className="space-y-4">
            {/* Creator */}
            <div>
              <p className="text-sm font-medium text-gray-700">Creator</p>
              <p className="text-xs font-mono bg-gray-100 p-2 rounded break-all">
                {contract.WalletAddress ?? "Not set"}
              </p>
            </div>

            {/* Accepter (only if accepted) */}
            {contract.status === "accepted" && contract.accepterWalletAddress && (
              <div>
                <p className="text-sm font-medium text-gray-700">Accepter</p>
                <p className="text-xs font-mono bg-gray-100 p-2 rounded break-all">
                  {contract.accepterWalletAddress}
                </p>
              </div>
            )}

            {/* Escrow Info */}
            {contract.status === "open" && (
              <div className="pt-4 border-t border-gray-300">
                <p className="text-sm font-medium text-gray-700 mb-2">Escrow Address (2-of-2)</p>
                <p className="text-xs text-gray-600 mb-2">
                  Creator stake is locked here. Accepter must send matching stake to this address.
                </p>
                <p className="text-xs font-mono bg-blue-50 p-2 rounded break-all border border-blue-200">
                  {contract.multisig_address || "Not set"}
                </p>
              </div>
            )}

            {contract.status === "accepted" && (
              <>
                <div className="pt-4 border-t border-gray-300">
                  <p className="text-sm font-medium text-gray-700 mb-2">Final Escrow (3-of-3 Multisig)</p>
                  <p className="text-xs text-gray-600 mb-2">
                    Contains creator stake. Full pot will be controlled from here after resolution.
                  </p>
                  <p className="text-xs font-mono bg-green-50 p-2 rounded break-all border border-green-200">
                    {contract.new_multisig_address || "Not available"}
                  </p>
                  {contract.pot_creator_txid && (
                    <p className="text-xs text-blue-600 mt-2">
                      Funds moved via:{" "}
                      <a
                        href={`https://insight.dash.org/insight/tx/${contract.pot_creator_txid}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        {contract.pot_creator_txid}
                      </a>
                    </p>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-300">
                  <p className="text-sm font-medium text-gray-700 mb-2">Legacy Escrow (2-of-2)</p>
                  <p className="text-xs text-gray-600 mb-2">
                    Contains accepter stake only (temporary).
                  </p>
                  <p className="text-xs font-mono bg-amber-50 p-2 rounded break-all border border-amber-200">
                    {contract.multisig_address || "Not set"}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* RESOLUTION DETAILS */}
        <div className="mb-6">
          <h3 className="text-md font-semibold text-gray-700 mb-4">Resolution Details</h3>
          <div className="space-y-5">
            {(contract.status === "settled" || contract.status === "twist") && (
              <>
                {contract.creator_winner_choice && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-800 mb-1">Creator's Claim</p>
                    <p className="text-sm text-gray-700">
                      Winner: <strong>{contract.creator_winner_choice}</strong>
                    </p>
                    {contract.creator_winner_reasoning && (
                      <details className="mt-2 text-sm">
                        <summary className="cursor-pointer text-primary hover:underline">View Reasoning</summary>
                        <p className="mt-2 text-gray-700 whitespace-pre-wrap bg-white p-3 rounded border">
                          {contract.creator_winner_reasoning}
                        </p>
                      </details>
                    )}
                  </div>
                )}

                {contract.accepter_winner_choice && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm font-medium text-gray-800 mb-1">Accepter's Claim</p>
                    <p className="text-sm text-gray-700">
                      Winner: <strong>{contract.accepter_winner_choice}</strong>
                    </p>
                    {contract.accepter_winner_reasoning && (
                      <details className="mt-2 text-sm">
                        <summary className="cursor-pointer text-primary hover:underline">View Reasoning</summary>
                        <p className="mt-2 text-gray-700 whitespace-pre-wrap bg-white p-3 rounded border">
                          {contract.accepter_winner_reasoning}
                        </p>
                      </details>
                    )}
                  </div>
                )}
              </>
            )}

            {eventResolution && (
              <div className={`p-4 rounded-lg border-2 ${
                contract.status === "settled" ? "bg-green-50 border-green-300" : "bg-blue-50 border-blue-300"
              }`}>
                <p className="text-sm font-medium text-gray-800 mb-2">
                  {contract.status === "settled" ? "Final Resolution" : "Oracle Resolution (Escalated)"}
                </p>
                <p className="text-lg font-bold text-gray-900">
                  Outcome: {eventResolution}
                </p>
                <p className="text-sm font-semibold text-gray-800 mt-2">
                  Winner: {contract.winner || "Pending payout"}
                </p>
                {contract.event_resolution_timestamp && (
                  <p className="text-xs text-gray-600 mt-2">
                    Resolved on: {formatCustomDate(contract.event_resolution_timestamp)}
                  </p>
                )}
                {contract.event_resolution_reasoning && (
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer text-primary hover:underline font-medium">Oracle Reasoning</summary>
                    <p className="mt-2 text-gray-700 whitespace-pre-wrap bg-white p-3 rounded border">
                      {contract.event_resolution_reasoning}
                    </p>
                  </details>
                )}
              </div>
            )}

            {contract.status === "open" && (
              <p className="text-sm text-gray-500 italic">
                Resolution will appear here after the event date.
              </p>
            )}

            {contract.status === "accepted" && !eventResolution && (
              <p className="text-sm text-gray-500 italic">
                Awaiting event outcome and party claims.
              </p>
            )}

            {contract.status === "twist" && !eventResolution && (
              <p className="text-sm text-amber-700 font-medium">
                Dispute escalated — awaiting oracle resolution.
              </p>
            )}
          </div>
        </div>

        {/* STATUS MESSAGES */}
        {contract.status === "open" && <p className="text-gray-600 mt-2">Contract is open for acceptance.</p>}
        {contract.status === "accepted" && <p className="text-green-600 mt-2">This contract has been accepted.</p>}
        {contract.status === "cancelled" && (
          <p className="text-yellow-500 mt-2">
            Cancelled: Creator accepted with the same wallet address.
            {transactionInfo ? (
              <span>
                {" "}
                Transaction: {transactionInfo.status}, {transactionInfo.amount} DASH,{" "}
                {formatCustomDate(transactionInfo.timestamp)}
              </span>
            ) : (
              <span> Transaction: Not available</span>
            )}
          </p>
        )}
        {contract.status === "settled" && (
          <p className="text-green-600 mt-2">
            Settled: Outcome - {eventResolution ?? "Not set"}
            {transactionInfo ? (
              <span>
                {" "}
                Transaction: {transactionInfo.status}, {transactionInfo.amount} DASH,{" "}
                {formatCustomDate(transactionInfo.timestamp)}
              </span>
            ) : (
              <span> Transaction: Not available</span>
            )}
          </p>
        )}
        {contract.status === "twist" && (
          <p className="text-blue-600 mt-2">
            Escalated to Twist: Awaiting resolution.
            {contract.event_resolution_reasoning && <span> Reason: {contract.event_resolution_reasoning}</span>}
          </p>
        )}

        {/* ACCEPT FORM */}
        {contract.status === "open" && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-md font-semibold text-gray-700 mb-2">Accept Contract</h3>
            <p className="text-sm text-gray-600 mb-2">
              Enter your wallet address to accept this peer-to-peer contract (use the same address as creator to cancel).
            </p>

            {/* Wallet address */}
            <label htmlFor={`accepterWalletAddress-${contract.contract_id}`} className="block text-sm font-medium text-gray-600">
              Your DASH Wallet Address
            </label>
            <input
              id={`accepterWalletAddress-${contract.contract_id}`}
              type="text"
              className="border p-2 rounded w-full mt-1 text-sm"
              value={accepterWalletAddress}
              onChange={(e) => setAccepterWalletAddress(e.target.value)}
              placeholder={`Enter a valid DASH ${NETWORK} address (starts with 'y')`}
              aria-label="Accepter wallet address"
              disabled={contract.status !== "open" || loading}
            />

            {/* Public key */}
            <label htmlFor={`accepterPublicKey-${contract.contract_id}`} className="block text-sm font-medium text-gray-600 mt-4">
              Your Public Key
            </label>
            <input
              id={`accepterPublicKey-${contract.contract_id}`}
              type="text"
              className="border p-2 rounded w-full mt-1 text-sm"
              value={accepterPublicKey}
              onChange={(e) => setAccepterPublicKey(e.target.value)}
              placeholder="Enter your public key from Dash Core (getaddressinfo)"
              aria-label="Accepter public key"
              disabled={contract.status !== "open" || loading}
            />
            <p className="text-gray-600 text-xs mt-1">
              Run <code>getaddressinfo your_wallet_address</code> in Dash Core ({NETWORK} mode) and copy the <code>pubkey</code> field.
            </p>

            {/* BIG DANISH SPACE BEFORE WALLET SIGNATURE */}
            <div className="h-8" />

            {/* Wallet signature */}
            <div className="mb-6">
              <label className="block text-lg font-bold text-primary mb-2">Wallet Signature</label>
              <button
                className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 text-sm"
                onClick={connectWallet}
                disabled={walletConnected || loading}
                aria-label="Connect Wallet and Sign"
              >
                {walletConnected
                  ? `Connected: ${accepterWalletAddress.slice(0, 6)}...${accepterWalletAddress.slice(-4)}`
                  : "Connect Wallet & Sign"}
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
                      disabled={loading}
                      aria-label="Verify Signature"
                    >
                      Verify Signature
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Generate Stake QR Code */}
            <div className="mb-6">
              <button
                type="button"
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm w-full font-bold shadow-md disabled:opacity-50"
                onClick={generateStakeQrCode}
                disabled={loading || !walletConnected || !signature || stakeTxValidated}
              >
                {stakeTxValidated ? "Stake Sent & Validated!" : "Generate Stake QR Code"}
              </button>

              {stakeQrCodeUrl && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-gray-800 font-medium mb-2">
                    Send exactly <strong>{Number(accepterStake(contract)).toFixed(8)} DASH</strong>
                  </p>
                  <p className="text-xs text-gray-700 mb-3 break-all font-mono bg-white p-2 rounded">
                    {contract.multisig_address}
                  </p>

                  <div className="bg-white p-4 rounded-lg shadow-inner mx-auto w-fit">
                    <img src={stakeQrCodeUrl} alt="Stake QR Code" className="w-64 h-64" />
                  </div>

                  <p className="text-green-700 font-bold mt-4 text-center text-lg">
                    No upfront fee! 3% deducted from winner only.
                  </p>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Paste Stake Transaction ID:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        className="border p-2 rounded flex-1 text-sm font-mono"
                        value={accepterTransactionId}
                        onChange={(e) => setAccepterTransactionId(e.target.value)}
                        placeholder="64-character txid..."
                        disabled={loading || stakeTxValidated}
                      />
                      <button
                        onClick={handleValidateStakeTransaction}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm whitespace-nowrap"
                        disabled={loading || stakeTxValidated}
                      >
                        {stakeTxValidated ? "Validated" : "Validate"}
                      </button>
                    </div>

                    {/* ERROR UNDER VALIDATE BUTTON */}
                    {validationError && (
                      <p className="text-red-500 text-sm mt-3 text-center font-medium">
                        {validationError}
                      </p>
                    )}

                    {stakeTxValidated && (
                      <p className="text-green-600 font-bold text-center mt-3 text-lg">
                        Stake confirmed! Ready to accept.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* FINAL ACCEPT BUTTON + ERROR BELOW */}
            <div className="mt-8">
              <button
                type="button"
                className="bg-orange-500 text-white px-6 py-4 rounded-lg hover:bg-orange-600 text-lg font-bold w-full shadow-2xl disabled:opacity-50"
                onClick={handleAcceptSubmission}
                disabled={
                  loading ||
                  !walletConnected ||
                  !signature ||
                  !stakeTxValidated
                }
              >
                {loading ? "Accepting Contract..." : "Accept Contract"}
              </button>

              {/* ERROR DISPLAYED BELOW THE BUTTON */}
              {submitError && (
                <p className="text-red-500 text-sm mt-4 text-center font-medium">
                  {submitError}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractCard;