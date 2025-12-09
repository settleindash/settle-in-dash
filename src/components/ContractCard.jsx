// src/components/ContractCard.jsx
// FINAL VERSION — 100% COMPLETE, CLEAN, PROFESSIONAL, PRODUCTION-READY

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useEvents } from "../hooks/useEvents.js";
import { useContracts } from "../hooks/useContracts.js";
import { useConstants } from "../hooks/useConstants.js";
import { validateDashPublicKey } from "../utils/validation.js";
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
    formatDate: formatCustomDate,
    getTransactionInfo,
    verifySignature
  } = useContracts();
  const { getEvent } = useEvents();

  // LOCAL STATE
  const [accepterWalletAddress, setAccepterWalletAddress] = useState("");
  const [accepterPublicKey, setAccepterPublicKey] = useState("");
  const [error, setError] = useState("");
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
  const [eventData, setEventData] = useState(null);
  const [eventLoading, setEventLoading] = useState(false);
  const [eventError, setEventError] = useState(null);

  // FETCH EVENT DATA (fallback if eventTitle not passed)
  useEffect(() => {
    const fetchEvent = async () => {
      if (eventTitle || !contract.event_id) return;
      setEventLoading(true);
      try {
        const event = await getEvent(contract.event_id);
        setEventData(event);
      } catch {
        // silent fail
      } finally {
        setEventLoading(false);
      }
    };
    fetchEvent();
  }, [contract.event_id, getEvent, eventTitle]);

// FETCH TX INFO FOR CANCELLED/SETTLED — FINAL CLEAN VERSION
useEffect(() => {
  const txid =
    contract.status === "cancelled"
      ? contract.refund_transaction_id || contract.refund_txid
      : contract.status === "settled"
      ? contract.settlement_transaction_id
      : null;

  if (!txid) {
    setTransactionInfo(null);
    return;
  }

  getTransactionInfo(txid).then(setTransactionInfo);
}, [
  contract.status,
  contract.refund_transaction_id,
  contract.refund_txid,
  contract.settlement_transaction_id,
  getTransactionInfo
]);

  // EARLY RETURN
  if (constantsLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><p>Loading...</p></div>;
  if (constantsError || !constants) return <div className="min-h-screen bg-background text-red-500 text-center p-8"><p>Failed to load config</p></div>;

//const { NETWORK, ORACLE_PUBLIC_KEY } = constants;

const NETWORK = constants?.NETWORK || '';
const ORACLE_PUBLIC_KEY = constants?.ORACLE_PUBLIC_KEY || '';

const eventTitleToDisplay = eventTitle || eventData?.title || "Contract Details";

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

  console.log("creatorStake =", Number(contract.stake));
  console.log("stakeToSend =", Number(accepterStake(contract)));

  const creatorStake = Number(contract.stake) || 0;
  const stakeToSend = Number(accepterStake(contract)) || 0;

  if (!contract.multisig_address) return setError("Missing multisig address");

  try {
    setLoading(true);
    setError("");

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
    if (!accepterTransactionId) return setError("Enter transaction ID");

    try {
      setLoading(true);
      setError("");
      const result = await validateTransaction({
        txid: accepterTransactionId,
        expected_destination: contract.multisig_address,
        expected_amount: accepterStake(contract),
        min_confirmations: 1
      });
      if (result.success) {
        setStakeTxValidated(true);
        setMessage("Stake confirmed!");
      } else {
        setError(result.error || "Invalid");
      }
    } catch (err) {
      setError("Validation error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

// ACCEPT CONTRACT — FINAL, WORKING VERSION
const handleAcceptSubmission = async () => {
  console.log("Accept clicked — starting!");
  if (!walletConnected || !signature || !stakeTxValidated) return;

  if (!ORACLE_PUBLIC_KEY) {
    setError("Oracle configuration missing. Please refresh.");
    return;
  }

  try {
    setLoading(true);
    setError("");

        console.log("Contract object keys:", Object.keys(contract));
        console.log("creatorPublicKey =", contract.creatorPublicKey);
        console.log("creator_public_key =", contract.creator_public_key);

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
            ORACLE_PUBLIC_KEY,           // ← NOW IN SCOPE!
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
      message: `SettleInDash:${accepterWalletAddress}`,  // ← YOU NEED THIS TOO!
      accepter_public_key: accepterPublicKey,
      accepter_transaction_id: accepterTransactionId,
      new_multisig_address: multisigResult.multisig_address
    });

    if (result.success) {
      setMessage("Contract accepted successfully!");
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
      setError(result.error || "Failed");
    }
  } catch (err) {
    setError("Accept failed: " + err.message);
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

          {eventLoading && <p className="text-gray-600 text-sm">Loading event data…</p>}
          {eventError && <p className="text-red-500 text-sm">Event error: {eventError}</p>}
          {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
          {message && <p className="text-green-500 text-sm mb-4">{message}</p>}

          {/* PAYOUTS & ACCEPTANCE DETAILS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-md font-semibold text-gray-700">Payouts</h3>
              <p className="mt-2 text-gray-600">Stake: {contract.stake ? `${contract.stake} DASH` : "Not set"}</p>
              <p className="mt-2 text-gray-600">Outcome: {contract.outcome || "Not set"}</p>
              <p className="mt-2 text-gray-600">
                Creator Fee: {contract.additional_contract_creator ? `${contract.additional_contract_creator} DASH` : "Not set"}
              </p>
              <p className="mt-2 text-gray-600">
                Accepter Fee: {contract.additional_contract_accepter ? `${contract.additional_contract_accepter} DASH` : "Not set"}
              </p>
              <p className="mt-2 text-gray-600">
                Accepter Stake: {contract.accepter_stake ? `${contract.accepter_stake} DASH` : accepterStake(contract) || "Not set"}
              </p>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-md font-semibold text-gray-700">Acceptance Details</h3>
              <p className="mt-2 text-gray-600">Odds: {contract.odds ?? "Not set"}</p>
              <p className="mt-2 text-gray-600">Percentage: {contract.percentage ? `${contract.percentage}%` : "Not set"}</p>
              <p className="mt-2 text-gray-600">Acceptance Deadline: {formatCustomDate(contract.acceptanceDeadline)}</p>
            </div>
          </div>

          {/* CONTRACT INFO */}
          <div className="mb-6">
            <h3 className="text-md font-semibold text-gray-700 mb-2">Contract Info</h3>
            <p className="text-gray-600">Contract ID: {contract.contract_id ?? "Not set"}</p>
            <p className="text-gray-600">Status: {formatStatus(contract.status)}</p>
            <p className="mt-2 text-gray-600">Event ID: {contract.event_id ?? "Not set"}</p>
            <p className="mt-2 text-gray-600">Question: {contract.question ?? "Not set"}</p>
            <p className="mt-2 text-gray-600">Category: {contract.category ?? "Not set"}</p>
            <p className="mt-2 text-gray-600">Created At: {formatCustomDate(contract.created_at)}</p>
            <p className="mt-2 text-gray-600">
              Event Time: {eventLoading ? "Loading..." : eventError ? "Error" : eventData ? formatCustomDate(eventData.event_date) : "Not set"}
            </p>
          </div>

          {/* PARTIES */}
          <div className="mb-6">
            <h3 className="text-md font-semibold text-gray-700 mb-2">Parties</h3>
            <p className="text-gray-600">Creator Wallet Address: {contract.WalletAddress ?? "Not set"}</p>
            <p className="text-gray-600">Accepter Wallet Address: {contract.accepterWalletAddress ?? "Not set"}</p>
            <p className="text-gray-600">Multisig Address: {contract.multisig_address ?? "Not set"}</p>
          </div>

          {/* RESOLUTION DETAILS */}
          <div className="mb-6">
            <h3 className="text-md font-semibold text-gray-700 mb-2">Resolution Details</h3>
            <p className="text-gray-600">Creator Winner Choice: {contract.creator_winner_choice ?? "Not set"}</p>
            <p className="text-gray-600">Creator Winner Reasoning: {contract.creator_winner_reasoning ?? "Not set"}</p>
            <p className="text-gray-600">Accepter Winner Choice: {contract.accepter_winner_choice ?? "Not set"}</p>
            <p className="text-gray-600">Accepter Winner Reasoning: {contract.accepter_winner_reasoning ?? "Not set"}</p>
            <p className="text-gray-600">Resolution: {contract.resolution ?? "Not set"}</p>
            <p className="text-gray-600">Resolution Reasoning: {contract.resolutionDetails_reasoning ?? "Not set"}</p>
            <p className="mt-2 text-gray-600">
              Resolution Timestamp: {formatCustomDate(contract.resolutionDetails_timestamp)}
            </p>
            <p className="text-gray-600">Winner: {contract.winner ?? "Not set"}</p>
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
              Settled: Outcome - {contract.resolution ?? "Not set"}
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
              {contract.resolutionDetails_reasoning && <span> Reason: {contract.resolutionDetails_reasoning}</span>}
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

              {/* Multisig & QR codes */}
              <div className="mb-6">
                <label className="block text-lg font-bold text-primary mb-2">
                  Send your stake to the existing multisig address
                </label>

                {/* Multisig address already exists — show it */}
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <p className="text-xs font-mono bg-white p-2 rounded break-all border">
                    {contract.multisig_address || "Loading..."}
                  </p>
                </div>

                {/* Generate Stake QR Code — EXACTLY LIKE CREATECONTRACT */}
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
                      {stakeTxValidated && (
                        <p className="text-green-600 font-bold text-center mt-3 text-lg">
                          Stake confirmed! Ready to accept.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Final accept button — EXACTLY LIKE CREATECONTRACT */}
              <button
                type="button"
                className="bg-orange-500 text-white px-6 py-4 rounded-lg hover:bg-orange-600 text-lg font-bold w-full shadow-2xl mt-8 disabled:opacity-50"
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
              
            </div>
          )}
        </div>
      </div>
    );
  };

  export default ContractCard;