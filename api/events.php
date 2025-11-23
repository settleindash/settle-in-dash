<?php
header('Content-Type: application/json; charset=utf-8');

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
$input = json_decode(file_get_contents('php://input'), true) ?: [];

// ACTION AND DATA
$action = $input['action'] ?? ($_GET['action'] ?? 'get_events');
$data   = $input['data'] ?? $_GET;

// DELETE THIS LINE — IT CAUSES FATAL ERROR
// unset($data['action']);

$payload = json_encode([
    'api_key' => $config['API_KEY'],
    'action'  => $action,
    'data'    => $data
]);

$ch = curl_init($backend_url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
    CURLOPT_TIMEOUT        => 20,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

http_response_code($httpCode);
echo $response;
exit;