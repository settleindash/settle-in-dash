<?php
header('Content-Type: application/json; charset=utf-8');

// CORS
$allowed = ['https://settleindash.com', 'https://www.settleindash.com'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed)) {
    header('Access-Control-Allow-Origin: ' . $origin);
}
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Load config as array (works perfectly on one.com)
$config = require __DIR__ . '/../config/config.php';

if (empty($config['API_URL']) || empty($config['API_KEY'])) {
    http_response_code(500);
    echo json_encode(['error' => 'API config missing']);
    exit;
}

// Call backend
$payload = json_encode([
    'api_key' => $config['API_KEY'],
    'action'  => 'get_constants'
]);

$ch = curl_init(rtrim($config['API_URL'], '/') . '/index.php');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_TIMEOUT        => 15,
]);

$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($code !== 200 || !$resp) {
    http_response_code(502);
    echo json_encode(['error' => 'Backend unreachable']);
    exit;
}

$data = json_decode($resp, true);
if (!($data['success'] ?? false)) {
    http_response_code(502);
    echo json_encode(['error' => 'Invalid backend response']);
    exit;
}

// THIS IS GOLD — KEEP IT FOREVER
echo json_encode([
    'success'                => true,
    'NETWORK'                => $data['data']['network'] ?? 'testnet',
    'SETTLE_IN_DASH_WALLET'  => $data['data']['fee_address'] ?? '',
    'ORACLE_PUBLIC_KEY'      => $data['data']['oracle_public_key'] ?? '',
    'PLACEHOLDER_PUBLIC_KEY' => $data['data']['placeholder_public_key'] ?? '',
    'FEE_PERCENTAGE'         => $data['data']['fee_percentage'] ?? 3,
    'TX_FEE'                 => $data['data']['tx_fee'] ?? '0.00001',
]);
exit;