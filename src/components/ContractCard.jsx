import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom"; // Added Link import
import { useContracts } from "../hooks/useContracts";
import { validateDashPublicKey, fetchConstants } from "../utils/constants";
import { validateWalletAddress } from "../utils/validation";
import PageHeader from "../utils/formats/PageHeader.jsx";
import { Html5Qrcode } from "html5-qrcode";
import QRCode from "qrcode";

const ContractCard = ({
  contract,
  eventTitle,
  onAcceptSuccess,
  navigateTo,
  isSingleView = false,
}) => {
  const navigate = useNavigate();
  const { acceptContract, formatStatus, formatDate, accepterStake, toWin, refundDetails, contractsLoading } = useContracts({ contract_id: contract.contract_id });
  const [accepterWalletAddress, setAccepterWalletAddress] = useState("");
  const [accepterPublicKey, setAccepterPublicKey] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isMoreInfoOpen, setIsMoreInfoOpen] = useState(false);
  const [transactionQrCode, setTransactionQrCode] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [signature, setSignature] = useState("");
  const [manualSignature, setManualSignature] = useState(""); // Added for manual signature
  const [constants, setConstants] = useState({ SETTLE_IN_DASH_WALLET: "", ORACLE_PUBLIC_KEY: "" });
  const qrReaderRef = useRef(null);

  useEffect(() => {
    console.log("ContractCard: Rendering with contract_id:", contract.contract_id, "isSingleView:", isSingleView);
    fetchConstants().then((result) => {
      setConstants(result);
      console.log("ContractCard: Fetched constants:", result);
    });
    return () => {
      if (qrReaderRef.current) {
        qrReaderRef.current.stop().catch(() => {});
      }
    };
  }, []);

  const formatCustomDate = (dateString) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
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
    const creatorFee = (creatorWinnings * 0.02).toFixed(2);
    const accepterFee = accepterWinnings < 0 ? "0.00" : (accepterWinnings * 0.02).toFixed(2);
    console.log("ContractCard: Creator fee:", creatorFee, "Accepter fee:", accepterFee);
    return { fee: "Fee:", creatorFee: `Creator: ${creatorFee} DASH`, accepterFee: `Accepter: ${accepterFee} DASH` };
  };

  const creatorNetWinnings = () => {
    if (!contract.stake) return "Not set";
    const stake = parseFloat(contract.stake);
    return (stake * 0.98).toFixed(2) + " DASH";
  };

  const accepterNetWinnings = () => {
    if (!contract.stake || !contract.odds) return "Not set";
    const stake = parseFloat(contract.stake);
    const odds = parseFloat(contract.odds);
    const winnings = stake * (odds - 1);
    return (winnings * 0.98).toFixed(2) + " DASH";
  };

  const startQRScanner = async (type = "signature") => {
    if (!document.getElementById(`qr-reader-${contract.contract_id}`)) {
      setError("QR reader element not found. Please refresh the page.");
      return;
    }
    if (qrReaderRef.current) {
      qrReaderRef.current.stop().catch(() => {});
    }
    qrReaderRef.current = new Html5Qrcode(`qr-reader-${contract.contract_id}`);
    setIsScanning(true);
    try {
      await qrReaderRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          if (type === "signature") {
            if (decodedText.startsWith("signmessage:")) {
              const [, address, message, sig] = decodedText.split(":");
              if (address === accepterWalletAddress && message === `SettleInDash:${accepterWalletAddress}`) {
                // Verify signature via backend
                const response = await fetch("https://settleindash.com/api/contracts.php?action=verify-signature", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ address, message, signature: sig }),
                });
                const result = await response.json();
                if (result.isValid) {
                  setSignature(sig);
                  setMessage("Signature captured! Proceed with transaction.");
                  qrReaderRef.current.stop().then(() => {
                    setIsScanning(false);
                    setTransactionQrCode(null);
                  });
                } else {
                  setError(result.message || "Invalid signature from QR code");
                  qrReaderRef.current.stop().then(() => setIsScanning(false));
                }
              } else {
                setError("Invalid QR code: Address or message does not match");
                qrReaderRef.current.stop().then(() => setIsScanning(false));
              }
            } else {
              setError(
                `Invalid QR code format. Expected a signature for <code>SettleInDash:${accepterWalletAddress}</code>. Use Dash Core (Tools &gt; Sign Message).`
              );
              qrReaderRef.current.stop().then(() => setIsScanning(false));
            }
          } else if (type === "transaction") {
            const signedTransaction = decodedText;
            qrReaderRef.current.stop().then(async () => {
              setIsScanning(false);
              setTransactionQrCode(null);
              try {
                // Send transaction to backend for verification and broadcasting
                const response = await fetch("https://settleindash.com/api/contracts.php", {
                  method: "PUT",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    contract_id: contract.contract_id,
                    action: "accept",
                    acceptor_address: accepterWalletAddress,
                    accepter_stake: accepterStake(contract),
                    accepter_transaction_id: signedTransaction,
                    signature,
                    multisig_address: newMultisigAddress,
                  }),
                });
                const result = await response.json();
                if (result.success) {
                  setMessage(result.message || `Contract ${result.message ? "cancelled" : "accepted"} successfully! Transaction ID: ${signedTransaction}`);
                  if (result.refund_txid) {
                    setMessage((prev) => `${prev} Refund Transaction ID: ${result.refund_txid}`);
                  }
                  if (onAcceptSuccess) onAcceptSuccess();
                  setAccepterWalletAddress("");
                  setAccepterPublicKey("");
                  setSignature("");
                  if (navigateTo) navigate(navigateTo);
                } else {
                  setError(result.error || "Failed to process contract");
                }
              } catch (err) {
                setError("Failed to process transaction: " + err.message);
                console.error("ContractCard: Transaction error", err);
              }
            });
          }
        },
        (error) => {
          console.warn("QR Scan error:", error);
          setError(`Failed to scan ${type} QR code: ${error}. Try signing in Dash Core.`);
          setIsScanning(false);
        }
      );
    } catch (err) {
      setError(`Failed to start QR scanner: ${err.message}`);
      setIsScanning(false);
      console.error("ContractCard: QR scanner error", err);
    }
  };

  // Verify manual signature
  const verifyManualSignature = async () => {
    if (!manualSignature) {
      setError("Please enter a signature");
      return;
    }
    try {
      const response = await fetch("https://settleindash.com/api/contracts.php?action=verify-signature", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: accepterWalletAddress,
          message: `SettleInDash:${accepterWalletAddress}`,
          signature: manualSignature
        }),
      });
      const result = await response.json();
      if (result.isValid) {
        setSignature(manualSignature);
        setMessage("Signature verified! Proceed with transaction.");
        setManualSignature("");
        setTransactionQrCode(null);
      } else {
        setError(result.message || "Invalid signature");
      }
    } catch (err) {
      setError("Failed to verify manual signature: " + err.message);
      console.error("ContractCard: Manual signature verification error", err);
    }
  };

  let newMultisigAddress = "";
  const handleAcceptContract = async () => {
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
    console.log("ContractCard: Processing contract with contract_id", contract.contract_id, "accepterWalletAddress", accepterWalletAddress);

    try {
      const qrCodeUrl = await QRCode.toDataURL(`signmessage:${accepterWalletAddress}:SettleInDash:${accepterWalletAddress}:`);
      setTransactionQrCode(qrCodeUrl);
      setMessage(`Scan this QR code to sign <code>SettleInDash:${accepterWalletAddress}</code> in Dash Core (Tools &gt; Sign Message).`);
    } catch (err) {
      setError("Failed to generate signature QR code: " + err.message);
      console.error("ContractCard: QR code generation error", err);
    }
  };

  const handleTransactionCreation = async () => {
    if (!signature) {
      setError("Please provide a valid signature first");
      console.log("ContractCard: No signature provided for transaction");
      return;
    }

    try {
      if (accepterWalletAddress === contract.WalletAddress) {
        // Cancellation: Backend handles refund transaction signing
        const result = await acceptContract(contract.contract_id, {
          acceptor_address: accepterWalletAddress,
          accepter_stake: 0,
          accepter_transaction_id: null,
          signature,
          multisig_address: contract.multisig_address,
        });
        if (result.success) {
          setMessage(result.message || "Contract cancelled successfully!");
          if (result.refund_txid) {
            setMessage((prev) => `${prev} Refund Transaction ID: ${result.refund_txid}`);
          }
          if (onAcceptSuccess) onAcceptSuccess();
          setAccepterWalletAddress("");
          setAccepterPublicKey("");
          setSignature("");
          if (navigateTo) navigate(navigateTo);
        } else {
          setError(result.error || "Failed to cancel contract");
        }
      } else {
        // Acceptance: Prompt for public keys and create multisig
        const publicKey = prompt(
          `Enter the public key for your wallet address (${accepterWalletAddress}).\n` +
          `In Dash Core (testnet mode), run: validateaddress "${accepterWalletAddress}"\n` +
          `Copy the "pubkey" field.`
        );
        if (!publicKey || !validateDashPublicKey(publicKey)) {
          setError("Invalid or missing public key. Ensure you entered the correct 'pubkey' from Dash Core.");
          console.log("ContractCard: Invalid public key");
          return;
        }
        setAccepterPublicKey(publicKey);

        // Use creator_public_key from contract
        const creatorPublicKey = contract.creator_public_key;
        if (!creatorPublicKey || !validateDashPublicKey(creatorPublicKey)) {
          setError("Invalid or missing creator public key in contract details.");
          console.log("ContractCard: Invalid creator public key");
          return;
        }

        // Create multisig address via backend
        const multisigResponse = await fetch("https://settleindash.com/api/contracts.php?action=create-multisig", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            public_keys: [creatorPublicKey, publicKey, constants.ORACLE_PUBLIC_KEY],
            required_signatures: 2,
            network: "testnet",
          }),
        });
        const multisigResult = await multisigResponse.json();
        if (!multisigResult.success) {
          setError(multisigResult.error || "Failed to create multisig address");
          console.log("ContractCard: Failed to create multisig address");
          return;
        }
        newMultisigAddress = multisigResult.multisig_address;

        // Prompt for transaction details (UTXO)
        const utxoTxId = prompt("Enter UTXO txid from your wallet (e.g., from listunspent)");
        const utxoOutputIndex = parseInt(prompt("Enter UTXO output index (e.g., 0)"));
        const utxoAmount = parseFloat(prompt("Enter UTXO amount in DASH (e.g., 1.0)"));
        if (!utxoTxId || isNaN(utxoOutputIndex) || isNaN(utxoAmount) || utxoAmount < Number(accepterStake(contract))) {
          setError("Invalid UTXO details or insufficient funds");
          console.log("ContractCard: Invalid UTXO details");
          return;
        }

        // Generate transaction QR code
        const txData = {
          utxo_txid: utxoTxId,
          utxo_output_index: utxoOutputIndex,
          utxo_amount: utxoAmount,
          to_address: newMultisigAddress,
          amount: Number(accepterStake(contract)),
          change_address: accepterWalletAddress,
          fee: 10000,
        };
        const txQrCode = await QRCode.toDataURL(JSON.stringify(txData));
        setTransactionQrCode(txQrCode);
        setMessage("Scan this QR code with your Dash wallet to sign the transaction to lock funds.");
        startQRScanner("transaction");
      }
    } catch (err) {
      setError("Failed to process contract: " + err.message);
      console.error("ContractCard: Error processing contract", err);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
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
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="text-md font-semibold text-gray-700">Acceptance Details</h3>
            <p className="mt-2 text-gray-600">Odds: {contract.odds ? contract.odds : "Not set"}</p>
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
          <p className="mt-2 text-gray-600">Created At: {formatCustomDate(contract.created_at)}</p>
          <p className="mt-2 text-gray-600">Event Time: {formatCustomDate(contract.time)}</p>
        </div>
        <div className="mb-6">
          <h3 className="text-md font-semibold text-gray-700 mb-2">Parties</h3>
          <p className="text-gray-600">Creator Wallet Address: {contract.WalletAddress || "Not set"}</p>
          <p className="text-gray-600">Accepter Wallet Address: {contract.accepterWalletAddress || "Not set"}</p>
        </div>
        {contract.status === "cancelled" && (
          <p className="text-yellow-500 mt-2">
            Cancelled: Creator accepted with the same wallet address.
            {refundDetails(contract)?.refundTx && (
              <span>
                {" "}
                Refund Transaction ID:{" "}
                <a
                  href={`https://testnet-insight.dash.org/insight/tx/${refundDetails(contract).refundTx}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  {refundDetails(contract).refundTx}
                </a>
              </span>
            )}
          </p>
        )}
        {contract.status === "accepted" && (
          <p className="text-green-600 mt-2">This contract has been accepted.</p>
        )}
        {refundDetails(contract)?.message && contract.status === "open" && (
          <p className="text-yellow-500 mt-2">
            {refundDetails(contract).message}
            {refundDetails(contract).refundTx && (
              <span>
                {" "}
                <a
                  href={`https://testnet-insight.dash.org/insight/tx/${refundDetails(contract).refundTx}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  {refundDetails(contract).refundTx}
                </a>
              </span>
            )}
          </p>
        )}
        <div className="mt-2">
          <button
            onClick={() => setIsMoreInfoOpen(!isMoreInfoOpen)}
            className="text-blue-500 hover:underline text-sm"
            aria-label={isMoreInfoOpen ? "Hide more info" : "Show more info"}
          >
            {isMoreInfoOpen ? "Hide More Info" : "More Info"}
          </button>
          {isMoreInfoOpen && (
            <div className="mt-2 text-gray-600">
              <p>Creator Winner Choice: {contract.creator_winner_choice || "Not set"}</p>
              <p>Creator Winner Reasoning: {contract.creator_winner_reasoning || "Not set"}</p>
              <p>Accepter Winner Choice: {contract.accepter_winner_choice || "Not set"}</p>
              <p>Accepter Winner Reasoning: {contract.accepter_winner_reasoning || "Not set"}</p>
              <p>Resolution: {contract.resolution || "Not set"}</p>
              <p>Resolution Reasoning: {contract.resolutionDetails_reasoning || "Not set"}</p>
              <p>Resolved On: {contract.resolutionDetails_timestamp ? formatCustomDate(contract.resolutionDetails_timestamp) : "Not set"}</p>
              <p>Winner: {contract.winner || "Not set"}</p>
            </div>
          )}
        </div>
        {contract.status === "open" ? (
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
            {transactionQrCode && (
              <div className="mt-4">
                <p className="text-gray-700 text-sm mb-2">
                  {signature ? "Scan this QR code with your Dash wallet to sign the transaction to lock funds." : 
                    `Scan this QR code to sign <code>SettleInDash:${accepterWalletAddress}</code> in Dash Core (Tools &gt; Sign Message).`}
                </p>
                <img src={transactionQrCode} alt="QR Code" className="w-64 h-64 mx-auto" />
                <button
                  onClick={() => startQRScanner(signature ? "transaction" : "signature")}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 text-sm mt-2"
                  disabled={isScanning || contractsLoading}
                  aria-label="Start QR Scan"
                >
                  {isScanning ? "Scanning..." : "Start QR Scanner"}
                </button>
                {!signature && (
                  <div className="mt-4">
                    <label htmlFor={`manualSignature-${contract.contract_id}`} className="block text-sm text-gray-700 mb-2">
                      Or enter signature manually:
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
                      onClick={verifyManualSignature}
                      className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 text-sm"
                      disabled={isScanning || contractsLoading}
                      aria-label="Verify manual signature"
                    >
                      Verify Manual Signature
                    </button>
                  </div>
                )}
              </div>
            )}
            <div
              id={`qr-reader-${contract.contract_id}`}
              style={{ width: "300px", height: "300px", display: isScanning ? "block" : "none", margin: "0 auto" }}
            ></div>
            <button
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mt-4 text-sm w-full"
              onClick={signature ? handleTransactionCreation : handleAcceptContract}
              aria-label={`Accept ${contract.position_type} contract ${contract.contract_id}`}
              disabled={contractsLoading || contract.status !== "open"}
            >
              {contractsLoading ? "Processing..." : contract.position_type === "buy" ? "Sell (Lay)" : "Buy (Back)"} Contract
            </button>
            {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
            {message && <p className="text-green-500 text-sm mt-2">{message}</p>}
          </div>
        ) : (
          <p className="text-gray-600 mt-6">This contract is no longer available for acceptance.</p>
        )}
      </div>
    </div>
  );
};

export default ContractCard;