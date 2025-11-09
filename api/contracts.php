<?php
/* contracts.php – public API for contracts (GET / POST / PUT) */
header('Content-Type: application/json; charset=utf-8');
define('SECURE_ACCESS', true);

ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/php_errors.log');
error_log("contracts.php: Started – {$_SERVER['REQUEST_METHOD']}");

$allowedOrigins = ['https://settleindash.com', 'https://www.settleindash.com'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
header('Access-Control-Allow-Origin: ' . (in_array($origin, $allowedOrigins) ? $origin : 'https://settleindash.com'));
header('Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT');
header('Access-Control-Allow-Headers: Content-Type, Signature');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/* ------------------------------------------------------------------ */
/* Load config                                                        */
/* ------------------------------------------------------------------ */
$configPath = realpath(__DIR__ . '/../config/config.php');
if (!$configPath || !file_exists($configPath)) {
    http_response_code(500);
    error_log("contracts.php: config.php missing");
    echo json_encode(['error' => 'Configuration missing']);
    exit;
}
require_once $configPath;

// ONLY CHECK API_URL and API_KEY — NOT ORACLE_KEYPAIRS
if (!defined('API_URL') || !defined('API_KEY')) {
    http_response_code(500);
    error_log("contracts.php: API_URL or API_KEY missing");
    echo json_encode(['error' => 'API configuration missing']);
    exit;
}
$api_url = API_URL;
$api_key = API_KEY;

/* ------------------------------------------------------------------ */
/* Helper – Dash address validation                                   */
/* ------------------------------------------------------------------ */
function isDashAddress(string $addr): bool {
    return preg_match('/^y[1-9A-HJ-NP-Za-km-z]{25,34}$/', $addr) === 1;
}

/* ------------------------------------------------------------------ */
/* GET – ONLY RETURN 400 (no get-constants)                           */
/* ------------------------------------------------------------------ */
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    http_response_code(400);
    echo json_encode(['error' => 'GET not supported. Use constants.php for get-constants.']);
    exit;
}

/* ------------------------------------------------------------------ */
/* POST – forward everything else to the backend                      */
/* ------------------------------------------------------------------ */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    error_log("contracts.php: POST raw → $raw");
    $input = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON']);
        exit;
    }

    $action = $input['action'] ?? '';
    $allowed = [
        'get_contracts','verify-signature','create-multisig','create_contract',
        'accept_contract','get_balance','validate_transaction','get_constants'
    ];
    if (!in_array($action, $allowed)) {
        http_response_code(400);
        echo json_encode(['error' => 'Unsupported action']);
        exit;
    }

    $payload = json_encode([
        'api_key' => $api_key,
        'action'  => $action === 'get_contracts' ? 'fetch_contracts' : $action,
        'data'    => $input['data'] ?? []
    ], JSON_THROW_ON_ERROR);

    $ch = curl_init($api_url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_TIMEOUT        => 12,
        CURLOPT_CONNECTTIMEOUT => 5,
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $out = json_decode($resp, true) ?? [];
    if ($code !== 200) {
        $err = $out['error'] ?? "HTTP $code";
        error_log("contracts.php: $action – $err");
        http_response_code($code);
        echo json_encode(['error' => $err]);
        exit;
    }

    echo json_encode($out);
    exit;
}

/* ------------------------------------------------------------------ */
/* PUT – accept (legacy path – kept for backward compat)             */
/* ------------------------------------------------------------------ */
if ($_SERVER['REQUEST_METHOD'] === 'PUT') {
    $raw = file_get_contents('php://input');
    $input = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON']);
        exit;
    }

    if (($input['action'] ?? '') !== 'accept') {
        http_response_code(400);
        echo json_encode(['error' => 'Unsupported action']);
        exit;
    }

    $payload = json_encode([
        'api_key' => $api_key,
        'action'  => 'accept_contract',
        'data'    => $input
    ], JSON_THROW_ON_ERROR);

    $ch = curl_init($api_url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => $payload,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_TIMEOUT        => 12,
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $out = json_decode($resp, true) ?? [];
    if ($code !== 200 || !($out['success'] ?? false)) {
        $err = $out['error'] ?? "HTTP $code";
        http_response_code($code);
        echo json_encode(['error' => $err]);
        exit;
    }
    echo json_encode(['success' => true]);
    exit;
}

/* ------------------------------------------------------------------ */
/* Anything else → 405                                                */
/* ------------------------------------------------------------------ */
http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);