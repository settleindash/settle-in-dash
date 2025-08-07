<?php
// api/contracts.php
// API to manage contracts in the MariaDB database for Settle In DASH.
// Supports GET (retrieve contracts), POST (create contract), and PUT (accept, settle, resolve_twist with xAI Grok API).

// Include database and Grok API configurations
require_once "../config/config.php";
require_once "grok.php";

// Enable error logging
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', '../logs/php_errors.log');

// Enable CORS
header("Access-Control-Allow-Origin: https://settleindash.com");
header("Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

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
 $required_fields = ['event_id', 'stake', 'percentage', 'WalletAddress', 'acceptanceDeadline', 'outcome', 'position_type'];
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
 $percentage = floatval($data['percentage']);
 $WalletAddress = filter_var($data['WalletAddress'], FILTER_SANITIZE_STRING);
 $acceptanceDeadline = $data['acceptanceDeadline'];
 $outcome = filter_var($data['outcome'], FILTER_SANITIZE_STRING);
 $position_type = in_array($data['position_type'], ['buy', 'sell']) ? $data['position_type'] : null;

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
 if ($percentage <= 1) {
 error_log("POST: Validation failed - Percentage (odds) must be greater than 1");
 http_response_code(400);
 echo json_encode(["error" => "Percentage (odds) must be greater than 1"]);
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
 contract_id, WalletAddress, time, stake, percentage,
 category, acceptanceDeadline, status, event_id, outcome, position_type, created_at
 ) VALUES (?, ?, ?, ?, ?, ?, ?, 'open', ?, ?, ?, NOW())"
 );
 $stmt->execute([
 $contract_id, $WalletAddress, $event_time, $stake, $percentage,
 $category, $acceptanceDeadline, $event_id, $outcome, $position_type
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
 $required_fields = ['accepterWalletAddress', 'accepter_stake'];
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
 $stmt = $pdo->prepare("UPDATE contracts SET status = 'cancelled', accepterWalletAddress = ? WHERE contract_id = ?");
 $stmt->execute([$accepterWalletAddress, $contract_id]);
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

 // Validate accepter_stake based on position_type and percentage
 $expected_stake = $contract['position_type'] === 'buy' 
 ? $contract['stake'] * $contract['percentage'] 
 : $contract['stake'] / $contract['percentage'];
 if ( abs($accepter_stake - $expected_stake) > 0.01) {
 error_log("PUT: Invalid accepter stake - contract_id: $contract_id, expected: $expected_stake, provided: $accepter_stake");
 http_response_code(400);
 echo json_encode(["error" => "Invalid accepter stake"]);
 exit;
 }

 // Update contract
 try {
 $stmt = $pdo->prepare(
 "UPDATE contracts SET status = 'accepted', accepterWalletAddress = ?, 
 accepter_stake = ? 
 WHERE contract_id = ?"
 );
 $stmt->execute([$accepterWalletAddress, $accepter_stake, $contract_id]);
 error_log("PUT: Contract accepted successfully - contract_id: $contract_id");
 echo json_encode([
 "success" => true,
 "message" => "Contract accepted!",
 "contract" => [
 "contract_id" => $contract_id,
 "status" => "accepted",
 "accepterWalletAddress" => $accepterWalletAddress,
 "accepter_stake" => $accepter_stake
 ]
 ]);
 } catch (PDOException $e) {
 error_log("PUT: Failed to accept contract - " . $e->getMessage());
 http_response_code(500);
 echo json_encode(["error" => "Failed to accept contract: " . $e->getMessage()]);
 }
 }

 elseif ($action === "settle") {
 $required_fields = ['submitterWalletAddress', 'winnerWalletAddress', 'reasoning'];
 foreach ($required_fields as $field) {
 if (!isset($data[$field])) {
 error_log("PUT: Missing required field - $field");
 http_response_code(400);
 echo json_encode(["error" => "Missing required field: $field"]);
 exit;
 }
 }

 $submitterWalletAddress = filter_var($data["submitterWalletAddress"], FILTER_SANITIZE_STRING);
 $winnerWalletAddress = filter_var($data["winnerWalletAddress"], FILTER_SANITIZE_STRING);
 $reasoning = filter_var($data["reasoning"], FILTER_SANITIZE_STRING);

 if ($contract["status"] !== "accepted") {
 error_log("PUT: Contract not accepted, contract_id: $contract_id");
 http_response_code(400);
 echo json_encode(["error" => "Contract not accepted"]);
 exit;
 }
 if (empty($submitterWalletAddress) || !validateDashAddress($submitterWalletAddress)) {
 error_log("PUT: Validation failed - Invalid submitter wallet address");
 http_response_code(400);
 echo json_encode(["error" => "Please provide a valid submitter wallet address"]);
 exit;
 }
 if ($submitterWalletAddress !== $contract["WalletAddress"] && $submitterWalletAddress !== $contract["accepterWalletAddress"]) {
 error_log("PUT: Unauthorized - Submitter must be creator or accepter, contract_id: $contract_id");
 http_response_code(403);
 echo json_encode(["error" => "Unauthorized: Only creator or accepter can submit settlement"]);
 exit;
 }
 if ($winnerWalletAddress !== "tie" && $winnerWalletAddress !== $contract["WalletAddress"] && $winnerWalletAddress !== $contract["accepterWalletAddress"]) {
 error_log("PUT: Validation failed - Invalid winner wallet address, must be creator, accepter, or 'tie'");
 http_response_code(400);
 echo json_encode(["error" => "Winner must be creator, accepter, or 'tie'"]);
 exit;
 }

 // Store winner choice and reasoning
 $fieldPrefix = $submitterWalletAddress === $contract["WalletAddress"] ? "creator" : "accepter";
 try {
 $stmt = $pdo->prepare(
 "UPDATE contracts SET ${fieldPrefix}_winner_choice = ?, ${fieldPrefix}_winner_reasoning = ? 
 WHERE contract_id = ?"
 );
 $stmt->execute([$winnerWalletAddress, $reasoning, $contract_id]);
 } catch (PDOException $e) {
 error_log("PUT: Failed to store winner choice - " . $e->getMessage());
 http_response_code(500);
 echo json_encode(["error" => "Failed to store winner choice: " . $e->getMessage()]);
 exit;
 }

 // Check if both parties have submitted
 try {
 $stmt = $pdo->prepare(
 "SELECT creator_winner_choice, accepter_winner_choice, stake, percentage, position_type 
 FROM contracts WHERE contract_id = ?"
 );
 $stmt->execute([$contract_id]);
 $choices = $stmt->fetch(PDO::FETCH_ASSOC);
 } catch (PDOException $e) {
 error_log("PUT: Failed to fetch choices - " . $e->getMessage());
 http_response_code(500);
 echo json_encode(["error" => "Failed to fetch choices: " . $e->getMessage()]);
 exit;
 }

 if ($choices["creator_winner_choice"] && $choices["accepter_winner_choice"]) {
 // Both have submitted
 if ($choices["creator_winner_choice"] === $choices["accepter_winner_choice"]) {
 // Agreement: Settle the contract
 $payout = $choices[" creator_winner_choice"] === "tie" 
 ? "Split"
 : ($choices["creator_winner_choice"] === $contract["WalletAddress"]
 ? $contract["stake"] * ($contract["position_type"] === "buy" ? 0.99 * $contract["percentage"] : 0.99)
 : $contract["stake"] * ($contract["position_type"] === "sell" ? 0.99 * $contract["percentage"] : 0.99));
 try {
 $stmt = $pdo->prepare(
 "UPDATE contracts SET status = 'settled', winner = ? WHERE contract_id = ?"
 );
 $stmt->execute([$choices["creator_winner_choice"], $contract_id]);
 $message = $choices["creator_winner_choice"] === "tie" 
 ? "Contract settled as a tie!" 
 : "Contract settled! {$choices["creator_winner_choice"]} receives $payout DASH.";
 error_log("PUT: Contract settled successfully - contract_id: $contract_id, Winner: {$choices["creator_winner_choice"]}");
 echo json_encode([
 "success" => true,
 "message" => $message,
 "contract" => array_merge($contract, [
 "status" => "settled",
 "winner" => $choices["creator_winner_choice"]
 ])
 ]);
 } catch (PDOException $e) {
 error_log("PUT: Failed to settle contract - " . $e->getMessage());
 http_response_code(500);
 echo json_encode(["error" => "Failed to settle contract: " . $e->getMessage()]);
 }
 } else {
 // Disagreement: Create twist
 try {
 $stmt = $pdo->prepare("UPDATE contracts SET status = 'twist' WHERE contract_id = ?");
 $stmt->execute([$contract_id]);
 error_log("PUT: Twist created due to disagreement - contract_id: $contract_id");
 echo json_encode([
 "success" => true,
 "message" => "Twist created due to disagreement between creator and accepter.",
 "contract" => array_merge($contract, ["status" => "twist"])
 ]);
 } catch (PDOException $e) {
 error_log("PUT: Failed to create twist - " . $e->getMessage());
 http_response_code(500);
 echo json_encode(["error" => "Failed to create twist: " . $e->getMessage()]);
 }
 }
 } else {
 // Only one party has submitted
 error_log("PUT: Settlement submission recorded - contract_id: $contract_id, Submitter: $submitterWalletAddress");
 echo json_encode([
 "success" => true,
 "message" => "Settlement submission recorded. Waiting for other party's submission.",
 "contract" => array_merge($contract, [
 "${fieldPrefix}_winner_choice" => $winnerWalletAddress,
 "${fieldPrefix}_winner_reasoning" => $reasoning
 ])
 ]);
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

 $payout = $winner === "tie" 
 ? "Split"
 : ($winner === $contract["WalletAddress"]
 ? $contract["stake"] * ($contract["position_type"] === "buy" ? 0.98 * $contract["percentage"] : 0.98)
 : $contract["stake"] * ($contract["position_type"] === "sell" ? 0.98 * $contract["percentage"] : 0.98));
 $timestamp = date("Y-m-d H:i:s");
 try {
 $stmt = $pdo->prepare(
 "UPDATE contracts SET status = 'settled', winner = ?, 
 resolutionDetails_reasoning = ?, resolutionDetails_timestamp = ? 
 WHERE contract_id = ?"
 );
 $stmt->execute([$winner, $reasoning, $timestamp, $contract_id]);
 $message = $winner === "tie" 
 ? "Twist resolved as a tie by Grok API!" 
 : "Twist resolved by Grok API! $winner receives $payout DASH.";
 error_log("PUT: Twist resolved successfully - contract_id: $contract_id, Winner: $winner");
 echo json_encode([
 "success" => true,
 "message" => $message,
 "contract" => array_merge($contract, [
 "status" => "settled",
 "winner" => $winner,
 "resolutionDetails_reasoning" => $reasoning,
 "resolutionDetails_timestamp" => $timestamp
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