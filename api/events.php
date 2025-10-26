<?php
header('Content-Type: application/json; charset=utf-8');

// Define SECURE_ACCESS
define('SECURE_ACCESS', true);

// Enable error logging
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/php_errors.log');
error_log("events.php: Script started, method: " . $_SERVER["REQUEST_METHOD"]);

// Enable CORS
$allowedOrigins = ['https://settleindash.com', 'https://www.settleindash.com'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: https://settleindash.com");
}
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Signature");

// Include config file
$configPath = realpath(__DIR__ . '/../config/config.php');
if ($configPath === false || !file_exists($configPath)) {
    http_response_code(500);
    error_log("events.php: Config file not found at: " . __DIR__ . '/../config/config.php');
    echo json_encode(["error" => "Configuration file not found"]);
    exit;
}
require_once $configPath;

// Reference API constants
if (!defined('API_URL') || !defined('API_KEY')) {
    http_response_code(500);
    error_log("events.php: API_URL or API_KEY not defined in config.php");
    echo json_encode(["error" => "API configuration missing"]);
    exit;
}
$api_url = API_URL;
$api_key = API_KEY;

// Validate API constants
if (empty($api_url) || !filter_var($api_url, FILTER_VALIDATE_URL)) {
    http_response_code(500);
    error_log("events.php: Invalid or missing API_URL");
    echo json_encode(["error" => "Invalid API configuration"]);
    exit;
}
if (empty($api_key)) {
    http_response_code(500);
    error_log("events.php: Missing API_KEY");
    echo json_encode(["error" => "Invalid API configuration"]);
    exit;
}

// Handle OPTIONS preflight
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

// Validate Dash wallet address
function validateDashWalletAddress($address) {
    $isValid = preg_match('/^y[1-9A-HJ-NP-Za-km-z]{25,34}$/', $address);
    if (!$isValid) {
        error_log("events.php: Invalid Dash testnet wallet address: $address");
    }
    return $isValid;
}

// Handle POST requests
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    // Parse JSON input
    $raw_input = file_get_contents('php://input');
    error_log("events.php: Raw input: " . $raw_input);
    $input = json_decode($raw_input, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("events.php: Invalid JSON - " . json_last_error_msg());
        http_response_code(400);
        echo json_encode(["error" => "Invalid JSON: " . json_last_error_msg()]);
        exit;
    }
    if (empty($input)) {
        error_log("events.php: Empty input received");
        http_response_code(400);
        echo json_encode(["error" => "Empty input"]);
        exit;
    }

    $action = filter_var($input['action'] ?? (filter_input(INPUT_GET, 'action', FILTER_SANITIZE_STRING) ?? ''), FILTER_SANITIZE_STRING);
    if ($action === 'verify-signature') {
        $address = filter_var($input['address'] ?? '', FILTER_SANITIZE_STRING);
        $signature = $input['signature'] ?? '';
        $message = filter_var($input['message'] ?? '', FILTER_SANITIZE_STRING);
        error_log("events.php: verify-signature: Received data: address=$address, message=$message, signature=$signature");
        if (empty($address) || empty($signature) || empty($message)) {
            error_log("events.php: verify-signature: Invalid or missing data");
            http_response_code(400);
            echo json_encode(["isValid" => false, "message" => "Invalid or missing data"]);
            exit;
        }
        if (!validateDashWalletAddress($address)) {
            error_log("events.php: verify-signature: Invalid Dash testnet wallet address: $address");
            http_response_code(400);
            echo json_encode(["isValid" => false, "message" => "Invalid Dash testnet wallet address"]);
            exit;
        }
        $payload = json_encode([
            'api_key' => $api_key,
            'action' => 'verify-signature',
            'data' => [
                'address' => $address,
                'message' => $message,
                'signature' => $signature
            ]
        ]);
        $ch = curl_init($api_url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_FAILONERROR, false);
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        if ($response === false) {
            $error = curl_error($ch);
            error_log("events.php: verify-signature: cURL error: " . $error);
            echo json_encode(["isValid" => false, "message" => "cURL error: " . $error]);
            curl_close($ch);
            exit;
        }
        curl_close($ch);
        $result = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log("events.php: verify-signature: JSON decode error: " . json_last_error_msg());
            echo json_encode(["isValid" => false, "message" => "Invalid API response"]);
            exit;
        }
        if ($http_code !== 200) {
            $error = $result['error'] ?? "API returned non-200 status code: $http_code";
            error_log("events.php: verify-signature: API error: $error");
            echo json_encode(["isValid" => false, "message" => $error]);
            exit;
        }
        echo json_encode([
            "isValid" => $result['isValid'] ?? false,
            "message" => $result['message'] ?? ($result['isValid'] ? "Signature verified successfully" : "Invalid signature")
        ]);
        exit;
    }

    if ($action === 'create_event') {
        $data = $input['data'] ?? [];
        error_log("events.php: create_event: Received data: " . json_encode($data));
        $event_id = filter_var($data['event_id'] ?? '', FILTER_SANITIZE_STRING);
        $title = filter_var($data['title'] ?? '', FILTER_SANITIZE_STRING);
        $category = filter_var($data['category'] ?? '', FILTER_SANITIZE_STRING);
        $event_date = filter_var($data['event_date'] ?? '', FILTER_SANITIZE_STRING);
        $possible_outcomes = $data['possible_outcomes'] ?? ['Yes', 'No'];
        $oracle_source = filter_var($data['oracle_source'] ?? '', FILTER_SANITIZE_STRING);
        $event_wallet_address = filter_var($data['event_wallet_address'] ?? '', FILTER_SANITIZE_STRING);
        $signature = filter_var($data['signature'] ?? '', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

        if (empty($title)) {
            http_response_code(400);
            error_log("events.php: create_event: Missing title in data: " . json_encode($data));
            echo json_encode(["error" => "Missing title"]);
            exit;
        }

        if (!empty($event_wallet_address) && !validateDashWalletAddress($event_wallet_address)) {
            http_response_code(400);
            error_log("events.php: create_event: Invalid event_wallet_address: $event_wallet_address");
            echo json_encode(["error" => "Invalid Dash testnet wallet address"]);
            exit;
        }

        if (!is_array($possible_outcomes) || count($possible_outcomes) < 2) {
            http_response_code(400);
            error_log("events.php: create_event: Invalid possible_outcomes: Must be an array with at least two outcomes");
            echo json_encode(["error" => "At least two possible outcomes required"]);
            exit;
        }

        if (!empty($signature)) {
            $payload = json_encode([
                'api_key' => $api_key,
                'action' => 'verify-signature',
                'data' => [
                    'address' => $event_wallet_address,
                    'message' => "SettleInDash:" . $event_wallet_address,
                    'signature' => $signature
                ]
            ]);
            $ch = curl_init($api_url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($ch, CURLOPT_FAILONERROR, false);
            $response = curl_exec($ch);
            $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            if ($response === false) {
                $error = curl_error($ch);
                error_log("events.php: create_event: verify-signature cURL error: " . $error);
                echo json_encode(["error" => "cURL error: " . $error]);
                exit;
            }
            if ($http_code !== 200) {
                $result = json_decode($response, true);
                $error = $result['error'] ?? "API returned non-200 status code: $http_code";
                error_log("events.php: create_event: verify-signature API error: $error");
                echo json_encode(["error" => $error]);
                exit;
            }
            $result = json_decode($response, true);
            if (json_last_error() !== JSON_ERROR_NONE || !isset($result['isValid']) || !$result['isValid']) {
                $error = $result['message'] ?? 'Invalid signature';
                error_log("events.php: create_event: Signature verification failed: " . $error);
                echo json_encode(["error" => $error]);
                exit;
            }
        }

        $data = [
            'api_key' => $api_key,
            'action' => 'create_event', // Changed from 'create_contract' to 'create_event'
            'data' => [
                'title' => $title,
                'category' => $category,
                'event_date' => $event_date,
                'possible_outcomes' => $possible_outcomes,
                'oracle_source' => $oracle_source,
                'eventWalletAddress' => $event_wallet_address,
                'signature' => $signature
            ]
        ];
        $payload = json_encode($data);
        $ch = curl_init($api_url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        curl_setopt($ch, CURLOPT_FAILONERROR, false);
        $response = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($response === false) {
            $error = curl_error($ch);
            error_log("events.php: create_event: cURL error: " . $error);
            echo json_encode(["error" => "cURL error: " . $error]);
            exit;
        }
        if ($http_code !== 200) {
            $result = json_decode($response, true);
            $error = isset($result['error']) ? $result['error'] : 'Unknown API error';
            error_log("events.php: create_event: API returned non-200 status code: $http_code, response: $error");
            echo json_encode(["error" => "API request failed with status code: $http_code, details: $error"]);
            exit;
        }
        $result = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log("events.php: create_event: JSON decode error: " . json_last_error_msg());
            echo json_encode(["error" => "Invalid API response"]);
            exit;
        }
        if (isset($result['success']) && $result['success']) {
            error_log("events.php: create_event: Event created successfully - event_id: " . ($result['data']['event_id'] ?? 'unknown'));
            echo json_encode(["success" => true, "event_id" => $result['data']['event_id'] ?? $event_id]);
        } else {
            $error = $result['error'] ?? 'Unknown API error';
            error_log("events.php: create_event: API error: " . $error);
            echo json_encode(["error" => $error]);
        }
        exit;
    }

    error_log("events.php: Invalid action for POST request: $action");
    http_response_code(400);
    echo json_encode(["error" => "Invalid action"]);
    exit;
}

// Handle GET requests
if ($_SERVER["REQUEST_METHOD"] === "GET") {
    $action = filter_input(INPUT_GET, 'action', FILTER_SANITIZE_STRING) ?? '';
    if ($action !== 'get_events') {
        error_log("events.php: Invalid action for GET request: $action");
        http_response_code(400);
        echo json_encode(["error" => "Invalid action"]);
        exit;
    }
    $status = filter_input(INPUT_GET, 'status', FILTER_SANITIZE_STRING) ?? 'open';
    error_log("events.php: get_events request with status: $status");
    $query = http_build_query([
        'api_key' => $api_key,
        'action' => 'get_events',
        'status' => $status
    ]);
    $ch = curl_init("$api_url?$query");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPGET, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_FAILONERROR, false);
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    if ($response === false) {
        $error = curl_error($ch);
        error_log("events.php: get_events: cURL error: " . $error);
        echo json_encode(["error" => "cURL error: " . $error]);
        exit;
    }
    if ($http_code !== 200) {
        $result = json_decode($response, true);
        $error = isset($result['error']) ? $result['error'] : 'Unknown API error';
        error_log("events.php: get_events: API returned non-200 status code: $http_code, response: $error");
        echo json_encode(["error" => "API request failed with status code: $http_code, details: $error"]);
        exit;
    }
    $result = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("events.php: get_events: JSON decode error: " . json_last_error_msg());
        echo json_encode(["error" => "Invalid API response"]);
        exit;
    }
    if (isset($result['success']) && $result['success']) {
        error_log("events.php: get_events: Events retrieved, count: " . count($result['data']));
        echo json_encode($result);
    } else {
        $error = $result['error'] ?? 'Unknown API error';
        error_log("events.php: get_events: API error: " . $error);
        echo json_encode(["error" => $error]);
    }
    exit;
}

error_log("events.php: Invalid method: " . $_SERVER["REQUEST_METHOD"]);
http_response_code(405);
echo json_encode(["error" => "Method not allowed"]);
exit;
?>