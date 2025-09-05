<?php
// api/contracts.php
// API to manage contracts in the MariaDB database for Settle In DASH.
// Supports GET (retrieve contracts), POST (create contract), and PUT (accept, settle, resolve_twist with xAI Grok API).

// Define SECURE_ACCESS immediately and verify it
define('SECURE_ACCESS', true);
if (!defined('SECURE_ACCESS')) {
    http_response_code(500);
    error_log("contracts.php: SECURE_ACCESS not defined after setting");
    echo json_encode(["error" => "Internal configuration error"]);
    exit;
}

// Use absolute path with debug for config inclusion
$configPath = realpath(__DIR__ . '/../config/config.php');
if ($configPath === false || !file_exists($configPath)) {
    http_response_code(500);
    error_log("contracts.php: Config file not found at: " . __DIR__ . '/../config/config.php');
    echo json_encode(["error" => "Configuration file not found at: " . __DIR__ . '/../config/config.php']);
    exit;
}
error_log("contracts.php: Config path resolved to: " . $configPath);
require_once $configPath;

// Enable error logging
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/php_errors.log');
error_log("contracts.php: Script started, method: " . $_SERVER["REQUEST_METHOD"]);

// Enable CORS dynamically for both domains
$allowedOrigins = [
    'https://settleindash.com',
    'https://www.settleindash.com'
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: https://settleindash.com"); // Fallback
}
header("Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");
error_log("events.php: Headers sent: Access-Control-Allow-Origin: " . ($origin ? $origin : 'https://settleindash.com'));


// Connect to MariaDB using PDO
try {
 $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
 $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
 error_log("Connection failed: " . $e->getMessage());
 http_response_code(500);
 echo json_encode(["error" => "Connection failed: " . $e->getMessage()]);
 exit;
}

// Handle HTTP methods
$method = $_SERVER["REQUEST_METHOD"];

// Current server time
$currentDateTime = date('Y-m-d H:i:s');

if ($method === "OPTIONS") {
 http_response_code(200);
 exit;
}

if ($method === "GET") {
 $contract_id = isset($_GET["contract_id"]) ? filter_var($_GET["contract_id"], FILTER_SANITIZE_STRING) : null;
 $event_id = isset($_GET["event_id"]) ? filter_var($_GET["event_id"], FILTER_SANITIZE_STRING) : null;
 $status = isset($_GET["status"]) ? filter_var($_GET["status"], FILTER_SANITIZE_STRING) : null;

 $query = "SELECT c.*, e.title, e.category AS event_category, e.event_date,
 c.resolutionDetails_reasoning AS resolutionDetails_reasoning,
 c.resolutionDetails_timestamp AS resolutionDetails_timestamp
 FROM contracts c
 LEFT JOIN events e ON c.event_id = e.event_id
 WHERE 1=1";
 $params = [];

 if ($contract_id) {
 $query .= " AND c.contract_id = ?";
 $params[] = $contract_id;
 }
 if ($event_id) {
 $query .= " AND c.event_id = ?";
 $params[] = $event_id;
 }
 if ($status) {
 $query .= " AND c.status = ?";
 $params[] = $status;
 }

 try {
 $stmt = $pdo->prepare($query);
 $stmt->execute($params);
 $contracts = $stmt->fetchAll(PDO::FETCH_ASSOC);

 // Format resolutionDetails
 foreach ($contracts as &$row) {
 $row["resolutionDetails"] = $row["resolutionDetails_reasoning"] || $row["resolutionDetails_timestamp"]
 ? [
 "reasoning" => $row["resolutionDetails_reasoning"],
 "timestamp" => $row["resolutionDetails_timestamp"]
 ]
 : null;
 unset($row["resolutionDetails_reasoning"]);
 unset($row["resolutionDetails_timestamp"]);
 }
 echo json_encode($contracts);
 } catch (PDOException $e) {
 error_log("GET: Failed to retrieve contracts - " . $e->getMessage());
 http_response_code(500);
 echo json_encode(["error" => "Failed to retrieve contracts: " . $e->getMessage()]);
 }
}

elseif ($method === "POST") {
 $data = json_decode(file_get_contents("php://input"), true);
 if (!$data) {
 error_log("POST: Invalid JSON data");
 http_response_code(400);
 echo json_encode(["error" => "Invalid JSON data"]);
 exit;
 }

 // Required fields
 $required_fields = ['event_id', 'stake', 'odds', 'WalletAddress', 'acceptanceDeadline', 'outcome', 'position_type', 'additional_contract_creator'];
 foreach ($required_fields as $field) {
 if (!isset($data[$field])) {
 error_log("POST: Missing required field - $field");
 http_response_code(400);
 echo json_encode(["error" => "Missing required field: $field"]);
 exit;
 }
 }

 // Sanitize and validate inputs
 $event_id = filter_var($data['event_id'], FILTER_SANITIZE_STRING);
 $contract_id = isset($data['contract_id']) ? filter_var($data['contract_id'], FILTER_SANITIZE_STRING) : uniqid("CONTRACT_");
 $stake = floatval($data['stake']);
 $odds = floatval($data['odds']);
 $WalletAddress = filter_var($data['WalletAddress'], FILTER_SANITIZE_STRING);
 $acceptanceDeadline = $data['acceptanceDeadline'];
 $outcome = filter_var($data['outcome'], FILTER_SANITIZE_STRING);
 $position_type = in_array($data['position_type'], ['buy', 'sell']) ? $data['position_type'] : null;
 $transaction_id = isset($data['transaction_id']) ? filter_var($data['transaction_id'], FILTER_SANITIZE_STRING) : null;
 $additional_contract_creator = floatval($data['additional_contract_creator']);

 // Validate inputs
 try {
 $acceptanceDeadline = (new DateTime($acceptanceDeadline))->format('Y-m-d H:i:s');
 } catch (Exception $e) {
 error_log("POST: Invalid datetime format - " . $e->getMessage());
 http_response_code(400);
 echo json_encode(["error" => "Invalid datetime format: " . $e->getMessage()]);
 exit;
 }

 if ($stake < 1) {
 error_log("POST: Validation failed - Minimum 1 DASH stake");
 http_response_code(400);
 echo json_encode(["error" => "Minimum 1 DASH stake"]);
 exit;
 }
 if ($odds <= 1) {
 error_log("POST: Validation failed - Odds must be greater than 1");
 http_response_code(400);
 echo json_encode(["error" => "Odds must be greater than 1"]);
 exit;
 }
 if (empty($WalletAddress) || !validateDashAddress($WalletAddress)) {
 error_log("POST: Validation failed - Invalid wallet address");
 http_response_code(400);
 echo json_encode(["error" => "Please provide a valid DASH wallet address"]);
 exit;
 }
 if (strtotime($acceptanceDeadline) <= strtotime($currentDateTime)) {
 error_log("POST: Validation failed - Invalid or past acceptance deadline");
 http_response_code(400);
 echo json_encode(["error" => "Acceptance deadline must be a valid date and after the current time"]);
 exit;
 }
 if ($additional_contract_creator != $stake * 0.1) {
 error_log("POST: Validation failed - Additional contract must be 10% of stake");
 http_response_code(400);
 echo json_encode(["error" => "Additional contract must be 10% of stake"]);
 exit;
 }

 // Validate event_id and outcome, fetch event time and category
 try {
 $stmt = $pdo->prepare("SELECT event_date, category, possible_outcomes FROM events WHERE event_id = ?");
 $stmt->execute([$event_id]);
 $event = $stmt->fetch(PDO::FETCH_ASSOC);
 if (!$event) {
 error_log("POST: Event not found - event_id: $event_id");
 http_response_code(404);
 echo json_encode(["error" => "Event not found"]);
 exit;
 }
 $event_time = $event['event_date'];
 $category = $event['category'];
 $outcomes = json_decode($event['possible_outcomes'], true) ?: explode(",", $event['possible_outcomes']);
 if (!in_array($outcome, $outcomes)) {
 error_log("POST: Invalid outcome - event_id: $event_id, outcome: $outcome");
 http_response_code(400);
 echo json_encode(["error" => "Invalid outcome for this event"]);
 exit;
 }
 if (strtotime($acceptanceDeadline) > strtotime($event_time)) {
 error_log("POST: Validation failed - Acceptance deadline after event time");
 http_response_code(400);
 echo json_encode(["error" => "Acceptance deadline must be before or on the event time"]);
 exit;
 }
 } catch (PDOException $e) {
 error_log("POST: Failed to validate event - " . $e->getMessage());
 http_response_code(500);
 echo json_encode(["error" => "Failed to validate event: " . $e->getMessage()]);
 exit;
 }

 // Insert contract
 try {
 $stmt = $pdo->prepare(
 "INSERT INTO contracts (
 contract_id, WalletAddress, time, stake, odds,
 category, acceptanceDeadline, status, event_id, outcome, position_type, created_at, transaction_id, additional_contract_creator
 ) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, NOW(), ?, ?)"
 );
 $stmt->execute([
 $contract_id, $WalletAddress, $event_time, $stake, $odds,
 $category, $acceptanceDeadline, $event_id, $outcome, $position_type, $transaction_id, $additional_contract_creator
 ]);
 error_log("POST: Contract created successfully - contract_id: $contract_id");
 echo json_encode(["success" => true, "contract_id" => $contract_id, "event_id" => $event_id]);
 } catch (PDOException $e) {
 error_log("POST: Failed to create contract - " . $e->getMessage());
 http_response_code(500);
 echo json_encode(["error" => "Failed to create contract: " . $e->getMessage()]);
 }
}

elseif ($method === "PUT") {
 $data = json_decode(file_get_contents("php://input"), true);
 if (!$data || !isset($data["action"])) {
 error_log("PUT: Invalid JSON data or missing action");
 http_response_code(400);
 echo json_encode(["error" => "Invalid JSON data or missing action"]);
 exit;
 }
 $action = $data["action"];
 $contract_id = filter_var($data["contract_id"], FILTER_SANITIZE_STRING);

 // Fetch contract
 try {
 $stmt = $pdo->prepare(
 "SELECT c.*, e.possible_outcomes 
 FROM contracts c 
 JOIN events e ON c.event_id = e.event_id 
 WHERE c.contract_id = ?"
 );
 $stmt->execute([$contract_id]);
 $contract = $stmt->fetch(PDO::FETCH_ASSOC);
 if (!$contract) {
 error_log("PUT: Contract not found - contract_id: $contract_id");
 http_response_code(404);
 echo json_encode(["error" => "Contract not found"]);
 exit;
 }
 } catch (PDOException $e) {
 error_log("PUT: Failed to fetch contract - " . $e->getMessage());
 http_response_code(500);
 echo json_encode(["error" => "Failed to fetch contract: " . $e->getMessage()]);
 exit;
 }

 if ($action === "accept") {
 $required_fields = ['accepterWalletAddress', 'accepter_stake', 'additional_contract_accepter'];
 foreach ($required_fields as $field) {
 if (!isset($data[$field])) {
 error_log("PUT: Missing required field - $field");
 http_response_code(400);
 echo json_encode(["error" => "Missing required field: $field"]);
 exit;
 }
 }

 $accepterWalletAddress = filter_var($data["accepterWalletAddress"], FILTER_SANITIZE_STRING);
 $accepter_stake = floatval($data["accepter_stake"]);
 $additional_contract_accepter = floatval($data["additional_contract_accepter"]);
 $transaction_id = isset($data['transaction_id']) ? filter_var($data['transaction_id'], FILTER_SANITIZE_STRING) : null;

 if (strtotime($contract["acceptanceDeadline"]) < strtotime($currentDateTime)) {
 error_log("PUT: Cannot accept contract - Deadline passed, contract_id: $contract_id");
 http_response_code(400);
 echo json_encode(["error" => "Cannot accept contract: Acceptance deadline has passed"]);
 exit;
 }
 if (empty($accepterWalletAddress) || !validateDashAddress($accepterWalletAddress)) {
 error_log("PUT: Validation failed - Invalid accepter wallet address");
 http_response_code(400);
 echo json_encode(["error" => "Please provide a valid accepter wallet address"]);
 exit;
 }
 if ($contract["WalletAddress"] === $accepterWalletAddress) {
 try {
 $stmt = $pdo->prepare("UPDATE contracts SET status = 'cancelled', accepterWalletAddress = ?, transaction_id = ? WHERE contract_id = ?");
 $stmt->execute([$accepterWalletAddress, $transaction_id, $contract_id]);
 error_log("PUT: Contract cancelled - Same wallet address, contract_id: $contract_id");
 echo json_encode(["success" => true, "message" => "Contract cancelled! Creator and accepter cannot have the same wallet address."]);
 } catch (PDOException $e) {
 error_log("PUT: Failed to cancel contract - " . $e->getMessage());
 http_response_code(500);
 echo json_encode(["error" => "Failed to cancel contract: " . $e->getMessage()]);
 }
 exit;
 }
 if ($contract["status"] !== "open") {
 error_log("PUT: Contract not open, contract_id: $contract_id, status: {$contract['status']}");
 http_response_code(400);
 echo json_encode(["error" => "Contract is not open for acceptance"]);
 exit;
 }

 // Validate accepter_stake and additional_contract_accepter
 $expected_stake = $contract['position_type'] === 'buy' 
 ? $contract['stake'] * ($contract['odds'] - 1) 
 : $contract['stake'] / ($contract['odds'] - 1);
 if (abs($accepter_stake - $expected_stake) > 0.01) {
 error_log("PUT: Invalid accepter stake - contract_id: $contract_id, expected: $expected_stake, provided: $accepter_stake");
 http_response_code(400);
 echo json_encode(["error" => "Invalid accepter stake"]);
 exit;
 }
 if ($additional_contract_accepter != $expected_stake * 0.1) {
 error_log("PUT: Invalid additional contract for accepter - contract_id: $contract_id, expected: " . ($expected_stake * 0.1) . ", provided: $additional_contract_accepter");
 http_response_code(400);
 echo json_encode(["error" => "Additional contract must be 10% of accepter stake"]);
 exit;
 }

 // Update contract
 try {
 $stmt = $pdo->prepare(
 "UPDATE contracts SET status = 'accepted', accepterWalletAddress = ?, 
 accepter_stake = ?, transaction_id = ?, additional_contract_accepter = ? 
 WHERE contract_id = ?"
 );
 $stmt->execute([$accepterWalletAddress, $accepter_stake, $transaction_id, $additional_contract_accepter, $contract_id]);
 error_log("PUT: Contract accepted successfully - contract_id: $contract_id");
 echo json_encode([
 "success" => true,
 "message" => "Contract accepted!",
 "contract" => [
 "contract_id" => $contract_id,
 "status" => "accepted",
 "accepterWalletAddress" => $accepterWalletAddress,
 "accepter_stake" => $accepter_stake,
 "transaction_id" => $transaction_id,
 "additional_contract_accepter" => $additional_contract_accepter
 ]
 ]);
 } catch (PDOException $e) {
 error_log("PUT: Failed to accept contract - " . $e->getMessage());
 http_response_code(500);
 echo json_encode(["error" => "Failed to accept contract: " . $e->getMessage()]);
 }
 }

 elseif ($action === "settle") {
 $required_fields = ['outcome'];
 foreach ($required_fields as $field) {
 if (!isset($data[$field])) {
 error_log("PUT: Missing required field - $field");
 http_response_code(400);
 echo json_encode(["error" => "Missing required field: $field"]);
 exit;
 }
 }

 $outcome = $data["outcome"];
 $transaction_id = isset($data["transaction_id"]) ? filter_var($data["transaction_id"], FILTER_SANITIZE_STRING) : null;
 $fee_transaction_id = isset($data["fee_transaction_id"]) ? filter_var($data["fee_transaction_id"], FILTER_SANITIZE_STRING) : null;
 $fee_recipient = isset($data["fee_recipient"]) ? filter_var($data["fee_recipient"], FILTER_SANITIZE_STRING) : null;
 $accepter_transaction_id = isset($data["accepter_transaction_id"]) ? filter_var($data["accepter_transaction_id"], FILTER_SANITIZE_STRING) : null;

 if ($contract["status"] !== "accepted") {
 error_log("PUT: Contract not accepted, contract_id: $contract_id");
 http_response_code(400);
 echo json_encode(["error" => "Contract not accepted"]);
 exit;
 }
 if ($outcome !== "tie" && (empty($fee_recipient) || !validateDashAddress($fee_recipient))) {
 error_log("PUT: Validation failed - Invalid fee recipient address");
 http_response_code(400);
 echo json_encode(["error" => "Please provide a valid fee recipient address"]);
 exit;
 }

 // Calculate payout
 $winner = $outcome === "tie" ? "tie" : ($outcome === "true" ? $contract["accepterWalletAddress"] : $contract["WalletAddress"]);
 $creator_stake = $contract["stake"];
 $accepter_stake = $contract["accepter_stake"];
 $creator_additional = $contract["additional_contract_creator"];
 $accepter_additional = $contract["additional_contract_accepter"];
 $total_stakes = $creator_stake + $accepter_stake;

 if ($outcome === "tie") {
 $creator_refunded = $creator_stake * 0.99;
 $accepter_refunded = $accepter_stake * 0.99;
 $fee = $total_stakes * 0.01; // 1% fee for tie
 $message = "Contract settled as tie! Creator refunded $creator_refunded DASH, Accepter refunded $accepter_refunded DASH, fee $fee DASH to $fee_recipient.";
 } else {
 $payout = $outcome === "true" ? ($accepter_stake * 0.98) : ($creator_stake * 0.98);
 $fee = $outcome === "true" ? ($accepter_stake * 0.02) : ($creator_stake * 0.02);
 $message = "Contract settled! $winner receives $payout DASH, fee $fee DASH to $fee_recipient.";
 }

 try {
 $stmt = $pdo->prepare(
 "UPDATE contracts SET status = 'settled', winner = ?, 
 transaction_id = ?, fee_transaction_id = ?, fee_recipient = ?, accepter_transaction_id = ? 
 WHERE contract_id = ?"
 );
 $stmt->execute([$winner, $transaction_id, $fee_transaction_id, $fee_recipient, $accepter_transaction_id, $contract_id]);
 error_log("PUT: Contract settled successfully - contract_id: $contract_id, Winner: $winner, Payout: " . ($outcome === "tie" ? "Split" : $payout) . ", Fee: $fee");
 echo json_encode([
 "success" => true,
 "message" => $message,
 "contract" => array_merge($contract, [
 "status" => "settled",
 "winner" => $winner,
 "transaction_id" => $transaction_id,
 "fee_transaction_id" => $fee_transaction_id,
 "fee_recipient" => $fee_recipient,
 "accepter_transaction_id" => $accepter_transaction_id
 ])
 ]);
 } catch (PDOException $e) {
 error_log("PUT: Failed to settle contract - " . $e->getMessage());
 http_response_code(500);
 echo json_encode(["error" => "Failed to settle contract: " . $e->getMessage()]);
 }
 }

 elseif ($action === "resolve_twist") {
 if ($contract["status"] !== "twist") {
 error_log("PUT: Contract not in twist state, contract_id: $contract_id");
 http_response_code(400);
 echo json_encode(["error" => "Contract not in twist state"]);
 exit;
 }

 // Call xAI Grok API to resolve the twist
 $grokResult = resolveTwistWithGrok(
 $contract,
 $contract["creator_winner_choice"],
 $contract["accepter_winner_choice"],
 $contract["creator_winner_reasoning"],
 $contract["accepter_winner_reasoning"]
 );

 if (isset($grokResult["error"])) {
 error_log("PUT: Grok API error - contract_id: $contract_id, Error: {$grokResult["error"]}");
 http_response_code(500);
 echo json_encode(["error" => $grokResult["error"]]);
 exit;
 }

 $winner = $grokResult["winner"];
 $reasoning = $grokResult["reasoning"];
 if ($winner !== "tie" && $winner !== $contract["WalletAddress"] && $winner !== $contract["accepterWalletAddress"]) {
 error_log("PUT: Invalid winner from Grok API - contract_id: $contract_id, Winner: $winner");
 http_response_code(400);
 echo json_encode(["error" => "Invalid winner from Grok API"]);
 exit;
 }

 $transaction_id = isset($data['transaction_id']) ? filter_var($data['transaction_id'], FILTER_SANITIZE_STRING) : null;
 $fee_transaction_id = isset($data['fee_transaction_id']) ? filter_var($data['fee_transaction_id'], FILTER_SANITIZE_STRING) : null;
 $fee_recipient = isset($data['fee_recipient']) ? filter_var($data['fee_recipient'], FILTER_SANITIZE_STRING) : null;
 $accepter_transaction_id = isset($data['accepter_transaction_id']) ? filter_var($data['accepter_transaction_id'], FILTER_SANITIZE_STRING) : null;

 $creator_stake = $contract["stake"];
 $accepter_stake = $contract["accepter_stake"];
 $creator_additional = $contract["additional_contract_creator"];
 $accepter_additional = $contract["additional_contract_accepter"];
 $total_stakes = $creator_stake + $accepter_stake + $creator_additional + $accepter_additional;

 if ($winner === "tie") {
 // Inconclusive: Refund stakes + additional contracts minus 1% fee
 $creator_refunded = ($creator_stake + $creator_additional) * 0.99;
 $accepter_refunded = ($accepter_stake + $accepter_additional) * 0.99;
 $fee = $total_stakes * 0.01;
 $payout = "Split";
 $message = "Twist inconclusive! Creator refunded $creator_refunded DASH, Accepter refunded $accepter_refunded DASH, fee $fee DASH to $fee_recipient.";
 } else {
 // Winner determined
 $is_creator_winner = $winner === $contract["WalletAddress"];
 $winner_payout = $is_creator_winner ? ($creator_stake + $accepter_stake + $accepter_additional) * 0.98 : ($accepter_stake + $creator_stake + $creator_additional) * 0.98;
 $loser_forfeited = $is_creator_winner ? ($accepter_stake + $accepter_additional) : ($creator_stake + $creator_additional);
 $fee = ($is_creator_winner ? ($creator_stake + $accepter_stake + $accepter_additional) : ($accepter_stake + $creator_stake + $creator_additional)) * 0.02;
 $payout = $winner_payout;
 $message = "Twist resolved! $winner receives $payout DASH (including loser's stake and additional contract), fee $fee DASH to $fee_recipient.";
 }

 $timestamp = date("Y-m-d H:i:s");
 try {
 $stmt = $pdo->prepare(
 "UPDATE contracts SET status = 'settled', winner = ?, 
 resolutionDetails_reasoning = ?, resolutionDetails_timestamp = ?, 
 transaction_id = ?, fee_transaction_id = ?, fee_recipient = ?, accepter_transaction_id = ? 
 WHERE contract_id = ?"
 );
 $stmt->execute([$winner, $reasoning, $timestamp, $transaction_id, $fee_transaction_id, $fee_recipient, $accepter_transaction_id, $contract_id]);
 error_log("PUT: Twist resolved successfully - contract_id: $contract_id, Winner: $winner, Payout: $payout, Fee: $fee");
 echo json_encode([
 "success" => true,
 "message" => $message,
 "contract" => array_merge($contract, [
 "status" => "settled",
 "winner" => $winner,
 "resolutionDetails_reasoning" => $reasoning,
 "resolutionDetails_timestamp" => $timestamp,
 "transaction_id" => $transaction_id,
 "fee_transaction_id" => $fee_transaction_id,
 "fee_recipient" => $fee_recipient,
 "accepter_transaction_id" => $accepter_transaction_id
 ])
 ]);
 } catch (PDOException $e) {
 error_log("PUT: Failed to resolve twist - " . $e->getMessage());
 http_response_code(500);
 echo json_encode(["error" => "Failed to resolve twist: " . $e->getMessage()]);
 }
 }

 else {
 error_log("PUT: Invalid action - $action");
 http_response_code(400);
 echo json_encode(["error" => "Invalid action"]);
 }
}

else {
 error_log("Invalid method: $method");
 http_response_code(405);
 echo json_encode(["error" => "Method not allowed"]);
}

function validateDashAddress($address) {
 // Basic regex for DASH address (starts with 'X', 34 chars, alphanumeric)
 return preg_match('/^X[1-9A-HJ-NP-Za-km-z]{33}$/', $address);
}
?>