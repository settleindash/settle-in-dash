<?php
/* constants.php – public API for constants */
header('Content-Type: application/json; charset=utf-8');

ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/php_errors.log');
error_log("constants.php: Started – {$_SERVER['REQUEST_METHOD']}");

$allowedOrigins = ['https://settleindash.com', 'https://www.settleindash.com'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
header('Access-Control-Allow-Origin: ' . (in_array($origin, $allowedOrigins) ? $origin : 'https://settleindash.com'));
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

/* ------------------------------------------------------------------ */
/* Load config                                                        */
/* ------------------------------------------------------------------ */
$configPath = realpath(__DIR__ . '/../config/config.php');
if (!$configPath || !file_exists($configPath)) {
    http_response_code(500);
    error_log("constants.php: config.php missing");
    echo json_encode(['error' => 'Configuration missing']);
    exit;
}
require_once $configPath;

if (!defined('API_URL') || !defined('API_KEY')) {
    http_response_code(500);
    error_log("constants.php: API_URL or API_KEY missing");
    echo json_encode(['error' => 'API configuration missing']);
    exit;
}
$api_url = API_URL;
$api_key = API_KEY;

/* ------------------------------------------------------------------ */
/* GET – get-constants                                                */
/* ------------------------------------------------------------------ */
$payload = json_encode([
    'api_key' => $api_key,
    'action' => 'get_constants'
]);

$ch = curl_init($api_url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
    CURLOPT_TIMEOUT => 10,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false,
]);
$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($code !== 200) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to fetch constants']);
    exit;
}

$result = json_decode($resp, true);
if (!$result['success']) {
    http_response_code(500);
    echo json_encode(['error' => $result['error'] ?? 'Unknown error']);
    exit;
}

$data = $result['data'];
echo json_encode([
    'success' => true,
    'NETWORK' => $data['network'],
    'SETTLE_IN_DASH_WALLET' => $data['fee_address'],
    'ORACLE_PUBLIC_KEY' => $data['oracle_public_key'],
    'PLACEHOLDER_PUBLIC_KEY' => $data['placeholder_public_key'],
], JSON_FORCE_OBJECT);
exit;