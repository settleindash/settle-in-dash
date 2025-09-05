<?php
// api/contracts.php
// API to manage contracts in the MariaDB database for Settle In DASH.
// Supports GET (retrieve contracts), POST (create contract), and PUT (accept, settle, resolve_twist with xAI Grok API).

// Define SECURE_ACCESS to prevent issues from config.php
define('SECURE_ACCESS', true);

// Include database and Grok API configurations
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/grok.php';

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
    header("Access-Control-Allow-Origin: https://settleindash.com");
}
header("Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Signature");
header("Content-Type: application/json");
error_log("contracts.php: Headers sent: Access-Control-Allow-Origin: " . ($origin ? $origin : 'https://settleindash.com'));

// Connect to MariaDB using PDO
try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4", DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    error_log("contracts.php: Database connection successful");
} catch (PDOException $e) {
    error_log("contracts.php: Connection failed: " . $e->getMessage() . " | Host: " . DB_HOST . " | DB: " . DB_NAME);
    http_response_code(500);
    echo json_encode(["error" => "Connection failed: " . $e->getMessage()]);
    exit;
}

// Handle OPTIONS preflight request
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

// Minimal validation function for contract creation
function validateContractCreation($data) {
    $errors = [];
    $required_fields = ['contract_id', 'event_id', 'creator_address', 'terms', 'multisig_address', 'transaction_id'];
    foreach ($required_fields as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            $errors[] = "Missing or empty required field: $field";
        }
    }
    if (isset($data['expiration_date']) && !empty($data['expiration_date'])) {
        try {
            new DateTime($data['expiration_date'], new DateTimeZone('Europe/Paris'));
        } catch (Exception $e) {
            $errors[] = "Invalid expiration date format";
        }
    }
    return [
        'isValid' => empty($errors),
        'message' => empty($errors) ? '' : implode('. ', $errors)
    ];
}

// Verify signature (simplified, assumes dashcore-lib PHP equivalent or API call)
function verifySignature($address, $message, $signature) {
    // Placeholder: In practice, use a PHP library like php-dash or call a JS worker via API
    // For now, basic check for presence and length (adjust with real verification)
    if (empty($signature) || strlen($signature) < 64) {
        return false;
    }
    // Simulate verification (replace with actual logic)
    return true; // Placeholder; integrate with dashcore-lib equivalent
}

// Log signature (if signatures table exists)
function logSignature($pdo, $contract_id, $wallet_address, $signature, $action) {
    try {
        $stmt = $pdo->prepare("INSERT INTO signatures (contract_id, wallet_address, signature, action) VALUES (?, ?, ?, ?)");
        $stmt->execute([$contract_id, $wallet_address, $signature, $action]);
        error_log("contracts.php: Signature logged for contract_id: $contract_id, action: $action");
    } catch (PDOException $e) {
        error_log("contracts.php: Failed to log signature - " . $e->getMessage());
    }
}

// Handle HTTP methods
$method = $_SERVER["REQUEST_METHOD"];

if ($method === "GET") {
    $contract_id = isset($_GET["contract_id"]) ? filter_var($_GET["contract_id"], FILTER_SANITIZE_STRING) : null;
    $query = "SELECT * FROM contracts WHERE 1=1";
    $params = [];
    if ($contract_id) {
        $query .= " AND contract_id = ?";
        $params[] = $contract_id;
    }
    try {
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $contracts = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $jsonOutput = json_encode($contracts);
        error_log("contracts.php: GET successful, contracts count: " . count($contracts));
        echo $jsonOutput;
    } catch (PDOException $e) {
        error_log("GET: Failed to retrieve contracts - " . $e->getMessage());
        http_response_code(500);
        echo json_encode(["error" => "Failed to retrieve contracts: " . $e->getMessage()]);
    }
} elseif ($method === "POST") {
    $data = json_decode(file_get_contents("php://input"), true);
    if (!$data) {
        error_log("POST: Invalid JSON data");
        http_response_code(400);
        echo json_encode(["error" => "Invalid JSON data"]);
        exit;
    }
    error_log("POST: Received data: " . print_r($data, true));

    $validationResult = validateContractCreation($data);
    if (!$validationResult['isValid']) {
        error_log("POST: Validation failed - " . $validationResult['message']);
        http_response_code(400);
        echo json_encode(["error" => $validationResult['message']]);
        exit;
    }

    $signature = isset($data['signature']) ? $data['signature'] : null;
    if (!$signature || !verifySignature($data['creator_address'], "SettleInDash:" . $data['creator_address'] . ":" . (time() - 10), $signature)) {
        error_log("POST: Invalid or missing signature for creator_address: " . $data['creator_address']);
        http_response_code(400);
        echo json_encode(["error" => "Invalid or missing signature for wallet address"]);
        exit;
    }

    $contract_id = filter_var($data['contract_id'], FILTER_SANITIZE_STRING);
    $event_id = filter_var($data['event_id'], FILTER_SANITIZE_STRING);
    $creator_address = filter_var($data['creator_address'], FILTER_SANITIZE_STRING);
    $terms = json_encode($data['terms']);
    $expiration_date = isset($data['expiration_date']) ? (new DateTime($data['expiration_date'], new DateTimeZone('Europe/Paris')))->format('Y-m-d H:i:s') : null;
    $multisig_address = filter_var($data['multisig_address'], FILTER_SANITIZE_STRING);
    $transaction_id = filter_var($data['transaction_id'], FILTER_SANITIZE_STRING);

    try {
        $stmt = $pdo->prepare(
            "INSERT INTO contracts (contract_id, event_id, creator_address, terms, expiration_date, created_at, status, multisig_address, transaction_id)
             VALUES (?, ?, ?, ?, ?, NOW(), 'pending', ?, ?)"
        );
        $stmt->execute([$contract_id, $event_id, $creator_address, $terms, $expiration_date, $multisig_address, $transaction_id]);
        // Log signature if signatures table exists
        logSignature($pdo, $contract_id, $creator_address, $signature, 'create');
        error_log("POST: Contract created successfully - contract_id: $contract_id");
        echo json_encode(["success" => true, "contract_id" => $contract_id]);
    } catch (PDOException $e) {
        error_log("POST: Failed to create contract - " . $e->getMessage());
        http_response_code(500);
        echo json_encode(["error" => "Failed to create contract: " . $e->getMessage()]);
    }
} elseif ($method === "PUT") {
    $data = json_decode(file_get_contents("php://input"), true);
    if (!$data || !isset($data['contract_id']) || !isset($data['action'])) {
        error_log("PUT: Invalid or missing data");
        http_response_code(400);
        echo json_encode(["error" => "Invalid or missing data"]);
        exit;
    }

    $contract_id = filter_var($data['contract_id'], FILTER_SANITIZE_STRING);
    $action = filter_var($data['action'], FILTER_SANITIZE_STRING);
    $signature = isset($data['signature']) ? $data['signature'] : null;
    $accepter_transaction_id = isset($data['accepter_transaction_id']) ? filter_var($data['accepter_transaction_id'], FILTER_SANITIZE_STRING) : null;
    $settlement_transaction_id = isset($data['settlement_transaction_id']) ? filter_var($data['settlement_transaction_id'], FILTER_SANITIZE_STRING) : null;

    try {
        if ($action === 'accept') {
            if (!$signature || !verifySignature($data['acceptor_address'], "SettleInDash:" . $data['acceptor_address'] . ":" . (time() - 10), $signature)) {
                error_log("PUT: Invalid or missing signature for acceptor_address: " . $data['acceptor_address']);
                http_response_code(400);
                echo json_encode(["error" => "Invalid or missing signature for acceptor address"]);
                exit;
            }
            $stmt = $pdo->prepare(
                "UPDATE contracts SET status = 'accepted', acceptor_address = ?, accepter_transaction_id = ? WHERE contract_id = ? AND status = 'pending'"
            );
            $stmt->execute([filter_var($data['acceptor_address'], FILTER_SANITIZE_STRING), $accepter_transaction_id, $contract_id]);
            // Log signature if signatures table exists
            logSignature($pdo, $contract_id, $data['acceptor_address'], $signature, 'accept');
        } elseif ($action === 'settle' || $action === 'resolve_twist') {
            $stmt = $pdo->prepare(
                "UPDATE contracts SET status = ?, settlement_date = NOW(), settlement_transaction_id = ? WHERE contract_id = ? AND status = 'accepted'"
            );
            $status = $action === 'settle' ? 'settled' : 'resolved';
            $stmt->execute([$status, $settlement_transaction_id, $contract_id]);
            if ($action === 'resolve_twist') {
                $outcome = callGrokAPI($data['event_id'], XAI_API_KEY);
                $stmt = $pdo->prepare("UPDATE contracts SET outcome = ?, resolution_date = NOW() WHERE contract_id = ?");
                $stmt->execute([$outcome, $contract_id]);
            }
        } else {
            error_log("PUT: Invalid action: $action");
            http_response_code(400);
            echo json_encode(["error" => "Invalid action"]);
            exit;
        }

        $rowCount = $stmt->rowCount();
        if ($rowCount > 0) {
            error_log("PUT: $action successful for contract_id: $contract_id");
            echo json_encode(["success" => true]);
        } else {
            error_log("PUT: No rows updated for $action on contract_id: $contract_id");
            http_response_code(404);
            echo json_encode(["error" => "Contract not found or action not applicable"]);
        }
    } catch (PDOException $e) {
        error_log("PUT: Failed to $action contract - " . $e->getMessage());
        http_response_code(500);
        echo json_encode(["error" => "Failed to $action contract: " . $e->getMessage()]);
    }
} else {
    error_log("Invalid method: $method");
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
}
?>