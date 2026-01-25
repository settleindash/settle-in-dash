<?php
header('Content-Type: application/json; charset=utf-8');

ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/php_errors.log');
error_log("contracts.php: Started – {$_SERVER['REQUEST_METHOD']}");

// CORS
$allowedOrigins = ['https://settleindash.com', 'https://www.settleindash.com'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Signature');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Load config
$config = require __DIR__ . '/../config/config.php';
$backend_url = rtrim($config['API_URL'], '/') . '/index.php';

// READ POST BODY
$raw = file_get_contents('php://input');
$input = json_decode($raw, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON']);
    exit;
}

$action = $input['action'] ?? '';

// Whitelist actions
$allowedActions = [
    'verify_signature', 'create_multisig', 'validate_transaction',
    'create_contract', 'accept_contract', 'get_balance', 'get_contracts', 'listunspent','settle_contract','generate_unsigned_settlement_tx'
];
if (!in_array($action, $allowedActions)) {
    http_response_code(400);
    echo json_encode(['error' => 'Unsupported action']);
    exit;
}

// FINAL PAYLOAD — must have data wrapper
$payload = json_encode([
    'api_key' => $config['API_KEY'],
    'action'  => $action,
    'data'    => $input['data'] ?? []
]);

$ch = curl_init($backend_url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_CONNECTTIMEOUT => 10,
]);

$response = curl_exec($ch);

if ($response === false) {
    $curlError = curl_error($ch);
    curl_close($ch);
    error_log("contracts.php: CURL failed for action $action: $curlError");
    http_response_code(502);
    echo json_encode(['error' => 'Backend service unavailable']);
    exit;
}

$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

// Always try to decode response, fallback gracefully
$decoded = json_decode($response, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    error_log("contracts.php: Backend returned invalid JSON for action $action: " . substr($response, 0, 500));
    http_response_code(502);
    echo json_encode(['error' => 'Invalid response from backend']);
    exit;
}

// If backend returned its own error structure
if ($httpCode !== 200) {
    $errorMsg = $decoded['error'] ?? 'Backend error';
    http_response_code($httpCode >= 400 ? $httpCode : 502);
    echo json_encode(['error' => $errorMsg]);
    exit;
}

// Success — forward clean JSON
echo json_encode($decoded);
exit;