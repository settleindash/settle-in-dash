  // src/components/ContractCard.jsx
  import { useState, useEffect, useCallback } from "react";
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

    // -----------------------------------------------------------------
    // ALL HOOKS FIRST — NEVER RETURN EARLY
    // -----------------------------------------------------------------
    const { constants, loading: constantsLoading, error: constantsError } = useConstants();
    const { acceptContract, formatStatus, accepterStake, contractsLoading } = useContracts();
    const { getEvent } = useEvents();
    const [accepterWalletAddress, setAccepterWalletAddress] = useState("");
    const [accepterPublicKey, setAccepterPublicKey] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");
    const [walletConnected, setWalletConnected] = useState(false);
    const [signature, setSignature] = useState("");
    const [manualSignature, setManualSignature] = useState("");
    const [accepterTransactionId, setAccepterTransactionId] = useState("");
    const [accepterFeeTransactionId, setAccepterFeeTransactionId] = useState("");
    const [stakeTxValidated, setStakeTxValidated] = useState(false);
    const [feeTxValidated, setFeeTxValidated] = useState(false);
    const [stakeQrCodeUrl, setStakeQrCodeUrl] = useState(null);
    const [feeQrCodeUrl, setFeeQrCodeUrl] = useState(null);
    const [newMultisigAddress, setNewMultisigAddress] = useState("");
    const [newRedeemScript, setNewRedeemScript] = useState("");
    const [qrCodeUrl, setQrCodeUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [transactionInfo, setTransactionInfo] = useState(null);
    const [eventData, setEventData] = useState(null);
    const [eventLoading, setEventLoading] = useState(false);
    const [eventError, setEventError] = useState(null);

// 1. FETCH CONSTANTS — INDEPENDENT
// (already handled inside useConstants.js)

// 2. FETCH EVENT — SEPARATE EFFECT (JUST LIKE CREATECONTRACT)
useEffect(() => {
  const fetchEvent = async () => {
    setEventLoading(true);
    setEventError("");

    if (!contract.event_id) {
      setEventError("No event ID");
      setEventLoading(false);
      return;
    }

    try {
      const event = await getEvent(contract.event_id);
      if (!event) throw new Error("Event not found");

      setEventData(event);
    } catch (err) {
      setEventError(err.message);
    } finally {
      setEventLoading(false);
    }
  };

  fetchEvent();
}, [contract.event_id, getEvent]);


    // -----------------------------------------------------------------
    // Fetch transaction info (cancelled / settled)
    // -----------------------------------------------------------------
    useEffect(() => {
      const txid =
        contract.status === "cancelled"
          ? contract.refund_transaction_id || contract.refund_txid
          : contract.status === "settled"
          ? contract.settlement_transaction_id
          : null;

      if (!txid) return;

      const fetchTransactionInfo = async () => {
        try {
          setLoading(true);
          const response = await fetch("https://settleindash.com/api/contracts.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "get_transaction_info", data: { txid } }),
          });
          const result = await response.json();
          if (result.success) setTransactionInfo(result.data);
          else setError("Failed to fetch transaction info.");
        } catch (err) {
          console.error("ContractCard: Error fetching transaction info:", err);
          setError("Failed to fetch transaction info.");
        } finally {
          setLoading(false);
        }
      };

      fetchTransactionInfo();
    }, [
      contract.status,
      contract.refund_transaction_id,
      contract.refund_txid,
      contract.settlement_transaction_id,
    ]);


// REPLACE WITH:
if (constantsLoading) {
  return (
    <div className="min-h-screen bg-background p-8 flex items-center justify-center">
      <p className="text-xl">Loading contract...</p>
    </div>
  );
}

if (constantsError || !constants) {
  return (
    <div className="min-h-screen bg-background p-8 text-red-500 text-center">
      <p>Failed to load configuration</p>
    </div>
  );
}

   // === NOW SAFE TO DESTRUCTURE ===
  const { NETWORK, ORACLE_PUBLIC_KEY, SETTLE_IN_DASH_WALLET } = constants || {};


    // -----------------------------------------------------------------
    // Helper: Format date
    // -----------------------------------------------------------------
    const formatCustomDate = (dateString) => {
      if (!dateString) return "Not set";
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Invalid date";
      return date
        .toLocaleString("en-GB", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZone: "Europe/Paris",
        })
        .replace(/(\d+)\/(\d+)\/(\d+)/, "$2/$1/$3");
    };

    // -----------------------------------------------------------------
    // Wallet connection
    // -----------------------------------------------------------------
    const connectWallet = async () => {
      if (!accepterWalletAddress) return setError("Please enter your DASH wallet address");
      if (!accepterPublicKey) return setError("Please enter your public key");

      if (!/^y[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(accepterWalletAddress))
        return setError(`Invalid Dash ${NETWORK} wallet address`);

      if (!validateDashPublicKey(accepterPublicKey))
        return setError("Invalid public key. Ensure you entered the correct 'pubkey' from Dash Core.");

      if (contract.status !== "open") return setError("This contract is no longer open for acceptance");

      setError("");
      console.log("ContractCard: Initiating wallet connection for contract_id:", contract.contract_id);

      try {
        setLoading(true);
        const url = await QRCode.toDataURL(
          `signmessage:${accepterWalletAddress}:SettleInDash:${accepterWalletAddress}:`
        );
        setQrCodeUrl(url);
        setMessage(
          `Please sign the message 'SettleInDash:${accepterWalletAddress}' in Dash Core (Tools > Sign Message) and enter the signature below.`
        );
      } catch (err) {
        console.error("ContractCard: QR code generation error:", err);
        setMessage(
          `Failed to generate QR code. Please sign the message 'SettleInDash:${accepterWalletAddress}' in Dash Core and enter the signature below.`
        );
      } finally {
        setLoading(false);
      }
    };

    // -----------------------------------------------------------------
    // Manual signature verification
    // -----------------------------------------------------------------
    const verifyManualSignature = async (retries = 3) => {
      if (!manualSignature) return setError("Please enter a signature");

      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          setLoading(true);
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
          const result = await response.json();

          if (!response.ok) {
            if ((response.status === 400 || response.status === 503) && attempt < retries) {
              await new Promise((r) => setTimeout(r, 1000 * attempt));
              continue;
            }
            throw new Error(`HTTP ${response.status}`);
          }

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
          console.error("ContractCard: Manual signature verification error:", err);
        } finally {
          setLoading(false);
        }
      }
    };

    // -----------------------------------------------------------------
    // Multisig creation
    // -----------------------------------------------------------------
    const createMultisig = async () => {
      if (!walletConnected || !signature) return setError("Please connect and sign first");
      if (!accepterPublicKey) return setError("Please provide your public key");

      try {
        setLoading(true);
        const response = await fetch("https://settleindash.com/api/contracts.php", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create-multisig",
            data: {
              public_keys: [contract.creator_public_key, accepterPublicKey, ORACLE_PUBLIC_KEY],
              required_signatures: 2,
              network: NETWORK,
            },
          }),
        });
        const result = await response.json();

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        if (!result.success) throw new Error(result.error || "Failed to create multisig");

        setNewMultisigAddress(result.multisig_address);
        setNewRedeemScript(result.redeemScript || "");
        setMessage("New multisig address created successfully!");
      } catch (err) {
        setError("Failed to create multisig address: " + err.message);
        console.error("ContractCard: Multisig creation error:", err);
      } finally {
        setLoading(false);
      }
    };

    // -----------------------------------------------------------------
    // QR code generation (stake & fee)
    // -----------------------------------------------------------------
    const generateStakeQrCode = async () => {
      if (!walletConnected || !signature) return setError("Please connect and sign first");
      if (!newMultisigAddress) return setError("Please create a new multisig address first");

      const stake = accepterStake(contract);
      if (!stake || Number(stake) <= 0) return setError("Invalid accepter stake amount");

      try {
        setLoading(true);
        const amount = Number(stake).toFixed(8);
        const url = await QRCode.toDataURL(`dash:${newMultisigAddress}?amount=${amount}`);
        setStakeQrCodeUrl(url);
        setMessage(
          `Scan the QR code to send ${amount} DASH to the multisig address ${newMultisigAddress}. Then enter the transaction ID.`
        );
      } catch (err) {
        setError("Failed to generate stake QR code: " + err.message);
        console.error("ContractCard: Stake QR code error:", err);
      } finally {
        setLoading(false);
      }
    };

    const generateFeeQrCode = async () => {
      if (!walletConnected || !signature) return setError("Please connect and sign first");
      if (!newMultisigAddress) return setError("Please create a new multisig address first");

      const stake = accepterStake(contract);
      if (!stake || Number(stake) <= 0) return setError("Invalid accepter stake amount");

      const feeAmount = Number(
        contract.additional_contract_accepter || Number(stake) * 0.02
      ).toFixed(8);

      try {
        setLoading(true);
        const url = await QRCode.toDataURL(`dash:${SETTLE_IN_DASH_WALLET}?amount=${feeAmount}`);
        setFeeQrCodeUrl(url);
        setMessage(
          `Scan the QR code to send ${feeAmount} DASH to the fee address ${SETTLE_IN_DASH_WALLET}. Then enter the fee transaction ID.`
        );
      } catch (err) {
        setError("Failed to generate fee QR code: " + err.message);
        console.error("ContractCard: Fee QR code error:", err);
      } finally {
        setLoading(false);
      }
    };

    // -----------------------------------------------------------------
    // Transaction validation
    // -----------------------------------------------------------------
    const validateTransaction = async (
      txid,
      expectedDestination,
      expectedAmount,
      type = "stake",
      retries = 3
    ) => {
      if (!/^[0-9a-fA-F]{64}$/.test(txid)) {
        setError("Invalid transaction ID format.");
        return false;
      }

      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          setLoading(true);
          const response = await fetch("https://settleindash.com/api/contracts.php", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "validate_transaction",
              data: {
                txid,
                expected_destination: expectedDestination,
                expected_amount: expectedAmount,
                min_confirmations: 1,
                network: NETWORK,
              },
            }),
          });
          const result = await response.json();

          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          if (!result.success) {
            if (result.message === "Insufficient confirmations" && attempt < retries) {
              setError(`Waiting for ${type} confirmations (attempt ${attempt}/${retries})…`);
              await new Promise((r) => setTimeout(r, 30000));
              continue;
            }
            throw new Error(result.message || `Failed to validate ${type} transaction`);
          }

          console.log(`ContractCard: ${type} transaction validated:`, txid);
          return true;
        } catch (err) {
          setError(`Failed to validate ${type} transaction: ${err.message}`);
          console.error(`ContractCard: ${type} validation error (attempt ${attempt}):`, err);
          return false;
        } finally {
          setLoading(false);
        }
      }
      return false;
    };

    const handleValidateStakeTransaction = async () => {
      if (!accepterTransactionId) return setError("Please enter the stake transaction ID");
      const stake = accepterStake(contract);
      if (!stake || Number(stake) <= 0) return setError("Invalid accepter stake amount");

      const amount = Number(stake).toFixed(8);
      const ok = await validateTransaction(accepterTransactionId, newMultisigAddress, Number(amount), "stake");
      if (ok) {
        setStakeTxValidated(true);
        setMessage("Stake transaction validated successfully!");
      } else {
        setStakeTxValidated(false);
      }
    };

    const handleValidateFeeTransaction = async () => {
      if (!accepterFeeTransactionId) return setError("Please enter the fee transaction ID");
      const stake = accepterStake(contract);
      if (!stake || Number(stake) <= 0) return setError("Invalid accepter stake amount");

      const feeAmount = Number(contract.additional_contract_accepter || Number(stake) * 0.02).toFixed(8);
      const ok = await validateTransaction(
        accepterFeeTransactionId,
        SETTLE_IN_DASH_WALLET,
        Number(feeAmount),
        "fee"
      );
      if (ok) {
        setFeeTxValidated(true);
        setMessage("Fee transaction validated successfully!");
      } else {
        setFeeTxValidated(false);
      }
    };

    // -----------------------------------------------------------------
    // Accept / Cancel submission
    // -----------------------------------------------------------------
    const handleAcceptSubmission = async () => {
      if (!walletConnected || !signature) return setError("Please connect and sign first");
      if (!stakeTxValidated) return setError("Please validate the stake transaction");
      if (!feeTxValidated) return setError("Please validate the fee transaction");
      if (!accepterPublicKey || !validateDashPublicKey(accepterPublicKey))
        return setError("Invalid public key");
      if (!newMultisigAddress || !newRedeemScript) return setError("Please create a new multisig address");

      setError("");
      console.log("ContractCard: Accepting contract for contract_id:", contract.contract_id);

      try {
        setLoading(true);
        const payload = {
          contract_id: contract.contract_id,
          accepterWalletAddress,
          signature,
          message: `SettleInDash:${accepterWalletAddress}`,
          new_multisig_address: newMultisigAddress,
          accepter_public_key: accepterPublicKey,
          accepter_transaction_id: accepterTransactionId,
          accepter_fee_transaction_id: accepterFeeTransactionId,
          redeem_script: newRedeemScript,
          network: NETWORK,
        };
        console.log("ContractCard: acceptContract payload:", JSON.stringify(payload));

        const result = await acceptContract(contract.contract_id, payload);

        if (result.success) {
          setMessage(
            `Contract ${accepterWalletAddress === contract.WalletAddress ? "cancelled" : "accepted"} successfully!`
          );
          if (onAcceptSuccess) onAcceptSuccess();
          // reset form
          setAccepterWalletAddress("");
          setAccepterPublicKey("");
          setSignature("");
          setManualSignature("");
          setAccepterTransactionId("");
          setAccepterFeeTransactionId("");
          setStakeTxValidated(false);
          setFeeTxValidated(false);
          setStakeQrCodeUrl(null);
          setFeeQrCodeUrl(null);
          setNewMultisigAddress("");
          setNewRedeemScript("");
          setWalletConnected(false);
          if (navigateTo) navigate(navigateTo);
        } else {
          setError(result.error || "Failed to accept or cancel contract");
        }
      } catch (err) {
        setError("Failed to accept contract: " + err.message);
        console.error("ContractCard: Error accepting contract:", err);
      } finally {
        setLoading(false);
      }
    };

    // -----------------------------------------------------------------
    // Render
    // -----------------------------------------------------------------
    return (
      <div className={isSingleView ? "min-h-screen bg-background p-4" : ""}>
        {isSingleView && <PageHeader title={eventTitle || eventData?.title || "Contract Details"} />}
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
                disabled={contract.status !== "open" || contractsLoading || loading}
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
                placeholder="Enter your public key from Dash Core (validateaddress)"
                aria-label="Accepter public key"
                disabled={contract.status !== "open" || contractsLoading || loading}
              />
              <p className="text-gray-600 text-xs mt-1">
                Run <code>validateaddress your_wallet_address</code> in Dash Core ({NETWORK} mode) and copy the <code>pubkey</code> field.
              </p>

              {/* Wallet signature */}
              <div className="mt-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">Wallet Signature</label>
                <button
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 text-sm"
                  onClick={connectWallet}
                  disabled={walletConnected || contractsLoading || loading}
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
                        disabled={contractsLoading || loading}
                        aria-label="Verify Signature"
                      >
                        Verify Signature
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Multisig & QR codes */}
              <div className="mt-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">Fund Multisig</label>

                {/* Create multisig */}
                <button
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
                  onClick={createMultisig}
                  disabled={loading || !walletConnected || !signature || !!newMultisigAddress}
                  aria-label="Create Multisig Address"
                >
                  Create New Multisig Address
                </button>
                {newMultisigAddress && (
                  <p className="text-gray-600 text-sm mt-2">New Multisig Address: {newMultisigAddress}</p>
                )}

                {/* Stake QR */}
                <button
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm mt-2"
                  onClick={generateStakeQrCode}
                  disabled={loading || !walletConnected || !signature || !newMultisigAddress || stakeTxValidated}
                  aria-label="Generate Stake QR Code"
                >
                  Generate Stake QR Code
                </button>

                {stakeQrCodeUrl && (
                  <div className="mt-4">
                    <p className="text-gray-700 text-sm mb-2">
                      Stake Transfer: Send {Number(accepterStake(contract)).toFixed(8)} DASH to multisig address {newMultisigAddress}
                    </p>
                    <p className="text-gray-600 text-xs mb-2">
                      Note: A small network fee (approximately 0.001 DASH) may be deducted from your stake.
                    </p>
                    <img src={stakeQrCodeUrl} alt="Stake QR Code" className="w-64 h-64 mx-auto" />
                    <p className="text-gray-600 text-xs mt-1">Multisig Address: {newMultisigAddress}</p>

                    <div className="mt-4">
                      <label htmlFor={`accepterTransactionId-${contract.contract_id}`} className="block text-sm text-gray-700 mb-2">
                        Stake Transaction ID:
                      </label>
                      <input
                        id={`accepterTransactionId-${contract.contract_id}`}
                        type="text"
                        className="border p-2 rounded w-full text-sm mb-2"
                        value={accepterTransactionId}
                        onChange={(e) => setAccepterTransactionId(e.target.value)}
                        placeholder="Enter stake transaction ID (64-character hex)"
                        disabled={loading || stakeTxValidated}
                        aria-label="Stake transaction ID"
                      />
                      <button
                        onClick={handleValidateStakeTransaction}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
                        disabled={loading || stakeTxValidated}
                        aria-label="Validate Stake Transaction"
                      >
                        Validate Stake Transaction
                      </button>
                    </div>
                    {stakeTxValidated && <p className="text-green-500 text-sm mt-2">Stake transaction validated successfully!</p>}
                  </div>
                )}

                {/* Fee QR */}
                <button
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm mt-2"
                  onClick={generateFeeQrCode}
                  disabled={loading || !walletConnected || !signature || !newMultisigAddress || feeTxValidated}
                  aria-label="Generate Fee QR Code"
                >
                  Generate Fee QR Code
                </button>

                {feeQrCodeUrl && (
                  <div className="mt-4">
                    <p className="text-gray-700 text-sm mb-2">
                      Fee Transfer: Send{" "}
                      {(contract.additional_contract_accepter || Number(accepterStake(contract)) * 0.02).toFixed(8)} DASH to fee address{" "}
                      {SETTLE_IN_DASH_WALLET}
                    </p>
                    <p className="text-gray-600 text-xs mb-2">
                      Note: A small network fee (approximately 0.001 DASH) may be deducted from your fee.
                    </p>
                    <img src={feeQrCodeUrl} alt="Fee QR Code" className="w-64 h-64 mx-auto" />
                    <p className="text-gray-600 text-xs mt-1">Fee Address: {SETTLE_IN_DASH_WALLET}</p>

                    <div className="mt-4">
                      <label htmlFor={`accepterFeeTransactionId-${contract.contract_id}`} className="block text-sm text-gray-700 mb-2">
                        Fee Transaction ID:
                      </label>
                      <input
                        id={`accepterFeeTransactionId-${contract.contract_id}`}
                        type="text"
                        className="border p-2 rounded w-full text-sm mb-2"
                        value={accepterFeeTransactionId}
                        onChange={(e) => setAccepterFeeTransactionId(e.target.value)}
                        placeholder="Enter fee transaction ID (64-character hex)"
                        disabled={loading || feeTxValidated}
                        aria-label="Fee transaction ID"
                      />
                      <button
                        onClick={handleValidateFeeTransaction}
                        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
                        disabled={loading || feeTxValidated}
                        aria-label="Validate Fee Transaction"
                      >
                        Validate Fee Transaction
                      </button>
                    </div>
                    {feeTxValidated && <p className="text-green-500 text-sm mt-2">Fee transaction validated successfully!</p>}
                  </div>
                )}
              </div>

              {/* Final accept button */}
              <button
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mt-4 text-sm w-full"
                onClick={handleAcceptSubmission}
                disabled={
                  contractsLoading ||
                  contract.status !== "open" ||
                  !walletConnected ||
                  !signature ||
                  !stakeTxValidated ||
                  !feeTxValidated ||
                  loading
                }
                aria-label={`Accept ${contract.position_type} contract ${contract.contract_id}`}
              >
                {contractsLoading || loading
                  ? "Processing..."
                  : contract.position_type === "buy"
                  ? "Sell (Lay)"
                  : "Buy (Back)"}{" "}
                Contract
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  export default ContractCard;