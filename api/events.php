<?php
header('Content-Type: application/json; charset=utf-8');
define('SECURE_ACCESS', true);

ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/php_errors.log');
error_log("events.php: Started – {$_SERVER['REQUEST_METHOD']}");

$allowedOrigins = ['https://settleindash.com', 'https://www.settleindash.com'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
header('Access-Control-Allow-Origin: ' . (in_array($origin, $allowedOrigins) ? $origin : 'https://settleindash.com'));
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Signature');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/* Load config */
$configPath = realpath(__DIR__ . '/../config/config.php');
if (!$configPath || !file_exists($configPath)) {
    http_response_code(500);
    error_log("events.php: config.php not found");
    echo json_encode(['error' => 'Configuration missing']);
    exit;
}
require_once $configPath;

if (!defined('API_URL') || !defined('API_KEY')) {
    http_response_code(500);
    error_log("events.php: API_URL or API_KEY missing");
    echo json_encode(['error' => 'API configuration missing']);
    exit;
}
$api_url = API_URL;
$api_key = API_KEY;

/* Helper – Dash testnet address validation */
function isDashAddress(string $addr): bool {
    return preg_match('/^y[1-9A-HJ-NP-Za-km-z]{25,34}$/', $addr) === 1;
}

/* POST handling */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $raw = file_get_contents('php://input');
    error_log("events.php: POST raw → $raw");
    $input = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid JSON']);
        exit;
    }

    // Restore old action fallback
    $action = filter_var($input['action'] ?? (filter_input(INPUT_GET, 'action', FILTER_SANITIZE_STRING) ?? ''), FILTER_SANITIZE_STRING);

    // Fallback: assume verify-signature if fields present
    if (!$action && isset($input['address'], $input['message'], $input['signature'])) {
        $action = 'verify-signature';
        error_log("events.php: Assumed action 'verify-signature' from payload");
    }

    /* verify-signature */
    if ($action === 'verify-signature') {
        $addr = $input['address'] ?? '';
        $msg  = $input['message'] ?? '';
        $sig  = $input['signature'] ?? '';

        if (!$addr || !$msg || !$sig || !isDashAddress($addr)) {
            http_response_code(400);
            echo json_encode(['isValid' => false, 'message' => 'Invalid data']);
            exit;
        }

        $payload = json_encode([
            'api_key' => $api_key,  // ← INJECTED
            'action'  => 'verify-signature',
            'data'    => ['address' => $addr, 'message' => $msg, 'signature' => $sig]
        ]);

        $ch = curl_init($api_url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
            CURLOPT_TIMEOUT        => 10,
        ]);
        $resp = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $out = json_decode($resp, true) ?? [];
        echo json_encode([
            'isValid' => $out['isValid'] ?? false,
            'message' => $out['message'] ?? ($out['isValid'] ? 'OK' : 'Invalid')
        ]);
        exit;
    }

    /* create_event */
    if ($action === 'create_event') {
        $d = $input['data'] ?? [];

        $title    = $d['title'] ?? '';
        $cat      = $d['category'] ?? '';
        $date     = $d['event_date'] ?? '';
        $outcomes = $d['possible_outcomes'] ?? ['Yes','No'];
        $oracle   = $d['oracle_source'] ?? '';
        $wallet   = $d['event_wallet_address'] ?? '';  // ← snake_case from frontend
        $sig      = $d['signature'] ?? '';

        if (!$title) {
            http_response_code(400);
            echo json_encode(['error' => 'Title required']);
            exit;
        }
        if ($wallet && !isDashAddress($wallet)) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid wallet address']);
            exit;
        }
        if (!is_array($outcomes) || count($outcomes) < 2) {
            http_response_code(400);
            echo json_encode(['error' => 'At least two outcomes required']);
            exit;
        }

        // Normalize date to full ISO (UTC)
        if (preg_match('/T\d{2}:\d{2}$/', $date)) {
            $date .= ':00';
        }
        if (!str_ends_with($date, 'Z') && !str_contains($date, '+')) {
            $date .= 'Z';
        }
        error_log("events.php: create_event: Normalized date → $date");

        /* Optional signature verification */
        if ($sig && $wallet) {
            $payload = json_encode([
                'api_key' => $api_key,  // ← INJECTED
                'action'  => 'verify-signature',
                'data'    => [
                    'address'   => $wallet,
                    'message'   => "SettleInDash:$wallet",
                    'signature' => $sig
                ]
            ]);
            $ch = curl_init($api_url);
            curl_setopt_array($ch, [
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_POST           => true,
                CURLOPT_POSTFIELDS     => $payload,
                CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
                CURLOPT_TIMEOUT        => 10,
            ]);
            $vresp = curl_exec($ch);
            $vcode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            $vres = json_decode($vresp, true) ?? [];
            if ($vcode !== 200 || !($vres['isValid'] ?? false)) {
                http_response_code(400);
                echo json_encode(['error' => $vres['message'] ?? 'Signature invalid']);
                exit;
            }
        }

        $payload = json_encode([
            'api_key' => $api_key,  // ← INJECTED
            'action'  => 'create_event',
            'data'    => [
                'title'            => $title,
                'category'         => $cat,
                'event_date'       => $date,
                'possible_outcomes'=> $outcomes,
                'oracle_source'    => $oracle,
                'eventWalletAddress'=> $wallet,  // camelCase for db_proxy
                'signature'        => $sig
            ]
        ]);

        $ch = curl_init($api_url);
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

        $res = json_decode($resp, true) ?? [];
        if ($code !== 200 || !($res['success'] ?? false)) {
            $err = $res['error'] ?? 'API error';
            error_log("events.php: create_event failed – $err");
            http_response_code($code === 200 ? 500 : $code);
            echo json_encode(['error' => $err]);
            exit;
        }

        echo json_encode([
            'success'  => true,
            'event_id' => $res['data']['event_id'] ?? null
        ]);
        exit;
    }

    /* unknown POST action */
    http_response_code(400);
    echo json_encode(['error' => 'Unsupported action']);
    exit;
}

/* GET – get_events */
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $action = $_GET['action'] ?? '';
    if ($action !== 'get_events') {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid action']);
        exit;
    }

    $status   = $_GET['status'] ?? 'open';
    $event_id = $_GET['event_id'] ?? null;

    $query = http_build_query([
        'api_key'  => $api_key,     // ← INJECTED
        'action'   => 'get_events',
        'status'   => $status,
        'event_id' => $event_id
    ]);

    $ch = curl_init("$api_url?$query");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPGET        => true,
        CURLOPT_HTTPHEADER     => ['Content-Type: application/json'],
        CURLOPT_TIMEOUT        => 10,
    ]);
    $resp = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $data = json_decode($resp, true) ?? [];
    if ($code !== 200 || !($data['success'] ?? false)) {
        $err = $data['error'] ?? 'API error';
        error_log("events.php: get_events failed – $err");
        http_response_code($code === 200 ? 500 : $code);
        echo json_encode(['error' => $err]);
        exit;
    }

    error_log("events.php: get_events: Retrieved " . count($data['data'] ?? []) . " events");
    echo json_encode($data);
    exit;
}

/* Invalid HTTP method */
http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);