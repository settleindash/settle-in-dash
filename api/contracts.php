<?php
// /var/www/html/api/contracts.php
// Improved proxy: better timeouts, logging, health check

header('Content-Type: application/json; charset=utf-8');

// Enable error logging (but not display)
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/php_errors.log');

error_log("contracts.php: Started – {$_SERVER['REQUEST_METHOD']} " . date('c'));

// CORS (allow frontend origins)
$allowedOrigins = ['https://settleindash.com', 'https://www.settleindash.com', 'http://localhost:3000'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Signature, Authorization');

// Handle preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Health check endpoint (GET /health or ?health=1)
if ($_SERVER['REQUEST_METHOD'] === 'GET' && (isset($_GET['health']) || $_SERVER['REQUEST_URI'] === '/health')) {
    echo json_encode([
        'status' => 'ok',
        'time' => date('c'),
        'proxy_version' => '1.1'
    ]);
    exit;
}

// Load config
$config = require __DIR__ . '/../config/config.php';
$backend_url = rtrim($config['API_URL'], '/') . '/index.php';

// Read POST body
$raw = file_get_contents('php://input');
$input = json_decode($raw, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    error_log("contracts.php: Invalid JSON input");
    exit;
}

$action = $input['action'] ?? '';

// Whitelist actions (add all your real actions)
$allowedActions = [
    'verify_signature', 'create_multisig', 'validate_transaction',
    'create_contract', 'accept_contract', 'get_balance', 'get_contracts',
    'listunspent', 'settle_contract', 'generate_settlement_signing_data',
    // add any others
];
if (!in_array($action, $allowedActions)) {
    http_response_code(400);
    echo json_encode(['error' => 'Unsupported action']);
    error_log("contracts.php: Unsupported action: $action");
    exit;
}

// Prepare payload
$payload = json_encode([
    'api_key' => $config['API_KEY'],
    'action'  => $action,
    'data'    => $input['data'] ?? []
]);

error_log("contracts.php: Forwarding action: $action");

// CURL setup with longer timeouts
$ch = curl_init($backend_url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_TIMEOUT        => 120,           // 2 minutes
    CURLOPT_CONNECTTIMEOUT => 30,            // 30s connect
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_HEADER         => false,
]);

// Execute
$start = microtime(true);
$response = curl_exec($ch);
$curlErr = curl_error($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$timeTaken = microtime(true) - $start;

curl_close($ch);

if ($response === false) {
    error_log("contracts.php: CURL failed for action $action: $curlErr (time: {$timeTaken}s)");
    http_response_code(502);
    echo json_encode(['error' => 'Backend service unavailable: ' . $curlErr]);
    exit;
}

error_log("contracts.php: Backend responded in {$timeTaken}s with HTTP $httpCode");

// Try to decode response
$decoded = json_decode($response, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    error_log("contracts.php: Backend returned invalid JSON for action $action: " . substr($response, 0, 500));
    http_response_code(502);
    echo json_encode(['error' => 'Invalid response from backend']);
    exit;
}

// Forward backend's HTTP code if it's an error
if ($httpCode !== 200) {
    // Pass through the original backend status code and full response body
    http_response_code($httpCode);
    
    // Forward Content-Type (usually already set by backend)
    header('Content-Type: application/json');
    
    // Send the RAW backend response (not re-encoded)
    echo $response;
    
    error_log("contracts.php: Backend error $httpCode: " . substr($response, 0, 500));
    exit;
}

// Success — forward clean JSON
echo json_encode($decoded);
exit;