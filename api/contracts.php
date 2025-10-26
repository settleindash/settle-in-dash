<?php
// api/contracts.php
// API endpoint to handle contract-related actions, forwarding requests to db_proxy.php.

header('Content-Type: application/json; charset=utf-8');

// Define SECURE_ACCESS to prevent direct access
define('SECURE_ACCESS', true);

// Enable error logging to php_errors.log
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/php_errors.log');
error_log("contracts.php: Script started, method: " . $_SERVER["REQUEST_METHOD"]);

// Enable CORS for allowed origins
$allowedOrigins = ['https://settleindash.com', 'https://www.settleindash.com'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: https://settleindash.com");
}
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT");
header("Access-Control-Allow-Headers: Content-Type, Signature");

// Include config file
$configPath = realpath(__DIR__ . '/../config/config.php');
if ($configPath === false || !file_exists($configPath)) {
    http_response_code(500);
    error_log("contracts.php: Config file not found at: " . __DIR__ . '/../config/config.php');
    echo json_encode(["error" => "Configuration file not found"]);
    exit;
}
require_once $configPath;

// Reference API constants
if (!defined('API_URL') || !defined('API_KEY') || !defined('ORACLE_KEYPAIRS')) {
    http_response_code(500);
    error_log("contracts.php: API_URL, API_KEY, or ORACLE_KEYPAIRS not defined in config.php");
    echo json_encode(["error" => "API configuration missing"]);
    exit;
}
$api_url = API_URL;
$api_key = API_KEY;

// Validate API constants
if (empty($api_url) || !filter_var($api_url, FILTER_VALIDATE_URL)) {
    http_response_code(500);
    error_log("contracts.php: Invalid or missing API_URL: " . ($api_url ?? 'null'));
    echo json_encode(["error" => "Invalid API configuration"]);
    exit;
}
if (empty($api_key)) {
    http_response_code(500);
    error_log("contracts.php: Missing API_KEY");
    echo json_encode(["error" => "Invalid API configuration"]);
    exit;
}

// Handle OPTIONS preflight request
if ($_SERVER["REQUEST_METHOD"] === "OPTIONS") {
    http_response_code(200);
    exit;
}

// Validate Dash wallet address (26-35 characters, starts with 'y')
function validateDashWalletAddress($address) {
    $isValid = preg_match('/^y[1-9A-HJ-NP-Za-km-z]{25,34}$/', $address);
    if (!$isValid) {
        error_log("contracts.php: Invalid Dash testnet wallet address: " . ($address ?? 'null'));
    }
    return $isValid;
}

// Handle GET requests
if ($_SERVER["REQUEST_METHOD"] === "GET") {
    $action = filter_input(INPUT_GET, 'action', FILTER_SANITIZE_STRING) ?? '';
    if ($action === 'get-constants') {
        error_log("contracts.php: Handling get-constants");
        echo json_encode([
            "success" => true,
            "SETTLE_IN_DASH_WALLET" => ORACLE_KEYPAIRS['testnet']['address'] ?? '',
            "ORACLE_PUBLIC_KEY" => ORACLE_KEYPAIRS['testnet']['public_key'] ?? '',
            "PLACEHOLDER_PUBLIC_KEY" => ORACLE_KEYPAIRS['testnet']['placeholder_public_key'] ?? ''
        ], JSON_FORCE_OBJECT);
        exit;
    }
    error_log("contracts.php: Invalid action for GET request: $action");
    http_response_code(400);
    echo json_encode(["error" => "Invalid action"]);
    exit;
}

// Handle POST requests
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $raw_input = file_get_contents('php://input');
    error_log("contracts.php: Raw input: " . $raw_input);
    $input = json_decode($raw_input, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("contracts.php: Invalid JSON - " . json_last_error_msg());
        http_response_code(400);
        echo json_encode(["error" => "Invalid JSON: " . json_last_error_msg()]);
        exit;
    }
    if (empty($input)) {
        error_log("contracts.php: Empty input received");
        http_response_code(400);
        echo json_encode(["error" => "Empty input"]);
        exit;
    }

    $action = filter_var($input['action'] ?? '', FILTER_SANITIZE_STRING);
    $supported_actions = [
        'get_contracts',
        'verify-signature',
        'create-multisig',
        'create_contract',
        'accept_contract',
        'get_balance',
        'validate_transaction',
        'get_constants'
    ];
    if (!in_array($action, $supported_actions)) {
        error_log("contracts.php: Invalid action for POST request: $action");
        http_response_code(400);
        echo json_encode(["error" => "Invalid action"]);
        exit;
    }

    if ($action === 'get_balance') {
        $address = filter_var($input['data']['address'] ?? '', FILTER_SANITIZE_STRING);
        if (!validateDashWalletAddress($address)) {
            error_log("contracts.php: get_balance: Invalid address: $address");
            http_response_code(400);
            echo json_encode(["error" => "Invalid Dash testnet wallet address"]);
            exit;
        }
    }

    $payload = json_encode([
        'api_key' => $api_key,
        'action' => $action === 'get_contracts' ? 'fetch_contracts' : $action,
        'data' => $input['data'] ?? []
    ], JSON_THROW_ON_ERROR);
    error_log("contracts.php: Forwarding to $api_url with payload: $payload");

    $ch = curl_init($api_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_FAILONERROR, false);
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($response === false) {
        $error = curl_error($ch);
        error_log("contracts.php: $action: cURL error: $error, HTTP code: $http_code");
        http_response_code(503);
        echo json_encode(["error" => "cURL error: $error"]);
        curl_close($ch);
        exit;
    }
    curl_close($ch);
    $result = json_decode($response, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("contracts.php: $action: JSON decode error: " . json_last_error_msg() . ", response: " . ($response ?? 'null'));
        http_response_code(500);
        echo json_encode(["error" => "Invalid API response: " . json_last_error_msg()]);
        exit;
    }
    if ($http_code !== 200) {
        $error = isset($result['error']) ? $result['error'] : "API returned non-200 status code: $http_code";
        error_log("contracts.php: $action: API error: $error, HTTP code: $http_code, response: " . ($response ?? 'null'));
        http_response_code($http_code);
        echo json_encode(["error" => $error]);
        exit;
    }
    error_log("contracts.php: $action: Success, response: " . json_encode($result));
    echo json_encode($result);
    exit;
}

// Handle PUT requests
if ($_SERVER["REQUEST_METHOD"] === "PUT") {
    $raw_input = file_get_contents('php://input');
    error_log("contracts.php: Raw input for PUT: " . $raw_input);
    $input = json_decode($raw_input, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("contracts.php: Invalid JSON for PUT - " . json_last_error_msg());
        http_response_code(400);
        echo json_encode(["error" => "Invalid JSON: " . json_last_error_msg()]);
        exit;
    }
    if (empty($input)) {
        error_log("contracts.php: Empty input received for PUT");
        http_response_code(400);
        echo json_encode(["error" => "Empty input"]);
        exit;
    }

    $action = filter_var($input['action'] ?? '', FILTER_SANITIZE_STRING);
    if ($action === 'accept') {
        $data = $input;
        error_log("contracts.php: accept: Received data: " . json_encode($data));
        $contract_id = filter_var($data['contract_id'] ?? '', FILTER_SANITIZE_STRING);
        $accepter_address = filter_var($data['accepterWalletAddress'] ?? '', FILTER_SANITIZE_STRING);
        $accepter_stake = (float) ($data['accepter_stake'] ?? 0);
        $accepter_transaction_id = filter_var($data['accepter_transaction_id'] ?? '', FILTER_SANITIZE_STRING);
        $accepter_fee_transaction_id = filter_var($data['accepter_fee_transaction_id'] ?? '', FILTER_SANITIZE_STRING);
        $signature = filter_var($data['signature'] ?? '', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $new_multisig_address = filter_var($data['new_multisig_address'] ?? '', FILTER_SANITIZE_STRING);
        $accepter_public_key = filter_var($data['accepter_public_key'] ?? '', FILTER_SANITIZE_STRING);

        if (empty($contract_id) || empty($accepter_address) || empty($signature) || empty($new_multisig_address) || empty($accepter_transaction_id) || empty($accepter_fee_transaction_id)) {
            error_log("contracts.php: accept: Missing required fields");
            http_response_code(400);
            echo json_encode(["error" => "Missing required fields"]);
            exit;
        }

        if (!validateDashWalletAddress($accepter_address)) {
            error_log("contracts.php: accept: Invalid accepterWalletAddress: $accepter_address");
            http_response_code(400);
            echo json_encode(["error" => "Invalid Dash testnet wallet address"]);
            exit;
        }

        $payload = json_encode([
            'api_key' => $api_key,
            'action' => 'accept_contract',
            'data' => [
                'contract_id' => $contract_id,
                'accepterWalletAddress' => $accepter_address,
                'accepter_stake' => $accepter_stake,
                'accepter_transaction_id' => $accepter_transaction_id,
                'accepter_fee_transaction_id' => $accepter_fee_transaction_id,
                'signature' => $signature,
                'new_multisig_address' => $new_multisig_address,
                'accepter_public_key' => $accepter_public_key,
                'message' => "SettleInDash:$accepter_address"
            ]
        ], JSON_THROW_ON_ERROR);
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
            error_log("contracts.php: accept: cURL error: $error, HTTP code: $http_code");
            http_response_code(503);
            echo json_encode(["error" => "cURL error: $error"]);
            curl_close($ch);
            exit;
        }
        curl_close($ch);
        $result = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log("contracts.php: accept: JSON decode error: " . json_last_error_msg() . ", response: " . ($response ?? 'null'));
            http_response_code(500);
            echo json_encode(["error" => "Invalid API response"]);
            exit;
        }
        if ($http_code !== 200) {
            $error = $result['error'] ?? "API returned non-200 status code: $http_code";
            error_log("contracts.php: accept: API error: $error, HTTP code: $http_code, response: " . ($response ?? 'null'));
            http_response_code($http_code);
            echo json_encode(["error" => "Accept contract failed: $error"]);
            exit;
        }
        error_log("contracts.php: accept: Contract accepted successfully, contract_id: $contract_id");
        echo json_encode(["success" => true]);
        exit;
    }

    error_log("contracts.php: Invalid action for PUT request: $action");
    http_response_code(400);
    echo json_encode(["error" => "Invalid action"]);
    exit;
}

// Handle invalid HTTP methods
error_log("contracts.php: Invalid method: " . $_SERVER["REQUEST_METHOD"]);
http_response_code(405);
echo json_encode(["error" => "Method not allowed"]);
exit;
?>