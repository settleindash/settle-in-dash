<?php
header('Content-Type: application/json; charset=utf-8');

// Define SECURE_ACCESS
define('SECURE_ACCESS', true);

// Enable error logging
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', __DIR__ . '/../logs/php_errors.log');
error_log("contracts.php: Script started, method: " . $_SERVER["REQUEST_METHOD"]);

// Enable CORS
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
if (!defined('API_URL') || !defined('API_KEY')) {
    http_response_code(500);
    error_log("contracts.php: API_URL or API_KEY not defined in config.php");
    echo json_encode(["error" => "API configuration missing"]);
    exit;
}
$api_url = API_URL;
$api_key = API_KEY;

// Validate API constants
if (empty($api_url) || !filter_var($api_url, FILTER_VALIDATE_URL)) {
    http_response_code(500);
    error_log("contracts.php: Invalid or missing API_URL");
    echo json_encode(["error" => "Invalid API configuration"]);
    exit;
}
if (empty($api_key)) {
    http_response_code(500);
    error_log("contracts.php: Missing API_KEY");
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
        error_log("contracts.php: Invalid Dash testnet wallet address: $address");
    }
    return $isValid;
}

// Handle GET requests
if ($_SERVER["REQUEST_METHOD"] === "GET") {
    $action = filter_input(INPUT_GET, 'action', FILTER_SANITIZE_STRING) ?? '';
    if ($action === 'get-constants') {
        error_log("contracts.php: Handling get-constants");
        $settle_in_dash_wallet = defined('SETTLE_IN_DASH_WALLET_ADDRESSES') ? (SETTLE_IN_DASH_WALLET_ADDRESSES['testnet'] ?? '') : '';
        $oracle_public_key = defined('ORACLE_PUBLIC_KEYS') ? (ORACLE_PUBLIC_KEYS['testnet'] ?? '') : '';
        echo json_encode([
            "success" => true,
            "SETTLE_IN_DASH_WALLET" => $settle_in_dash_wallet,
            "ORACLE_PUBLIC_KEY" => $oracle_public_key
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
    // Parse JSON input
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
    if ($action === 'verify-signature') {
        $data = $input['data'] ?? [];
        $address = filter_var($data['address'] ?? '', FILTER_SANITIZE_STRING);
        $signature = $data['signature'] ?? '';
        $message = filter_var($data['message'] ?? '', FILTER_SANITIZE_STRING);
        error_log("contracts.php: verify-signature: Received data: address=$address, message=$message, signature=$signature");
        if (empty($address) || empty($signature) || empty($message)) {
            error_log("contracts.php: verify-signature: Invalid or missing data");
            http_response_code(400);
            echo json_encode(["isValid" => false, "message" => "Invalid or missing data"]);
            exit;
        }
        if (!validateDashWalletAddress($address)) {
            error_log("contracts.php: verify-signature: Invalid Dash testnet wallet address: $address");
            http_response_code(400);
            echo json_encode(["isValid" => false, "message" => "Invalid Dash testnet wallet address"]);
            exit;
        }
        // Forward to db_proxy.php
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
        $response = curl_exec($ch);
        if ($response === false) {
            $error = curl_error($ch);
            error_log("contracts.php: verify-signature: cURL error: " . $error);
            echo json_encode(["isValid" => false, "message" => "cURL error: " . $error]);
            curl_close($ch);
            exit;
        }
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($http_code !== 200) {
            error_log("contracts.php: verify-signature: API returned non-200 status code: " . $http_code);
            echo json_encode(["isValid" => false, "message" => "Signature verification failed with status code: $http_code"]);
            exit;
        }
        $result = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log("contracts.php: verify-signature: JSON decode error: " . json_last_error_msg());
            echo json_encode(["isValid" => false, "message" => "Invalid API response"]);
            exit;
        }
        echo json_encode([
            "isValid" => $result['isValid'] ?? false,
            "message" => $result['message'] ?? ($result['isValid'] ? "Signature verified successfully" : "Invalid signature")
        ]);
        exit;
    }

    if ($action === 'create-multisig') {
        $data = $input['data'] ?? [];
        $public_keys = $data['public_keys'] ?? [];
        $required_signatures = (int) ($data['required_signatures'] ?? 2);
        $network = filter_var($data['network'] ?? 'testnet', FILTER_SANITIZE_STRING);
        error_log("contracts.php: create-multisig: Received data: public_keys=" . json_encode($public_keys) . ", required_signatures=$required_signatures, network=$network");
        if (count($public_keys) < 2 || $required_signatures < 1 || $network !== 'testnet') {
            error_log("contracts.php: create-multisig: Invalid parameters");
            http_response_code(400);
            echo json_encode(["error" => "Invalid multisig parameters"]);
            exit;
        }
        // Forward to db_proxy.php
        $payload = json_encode([
            'api_key' => $api_key,
            'action' => 'create_multisig',
            'data' => [
                'public_keys' => $public_keys,
                'required_signatures' => $required_signatures,
                'network' => $network
            ]
        ]);
        $ch = curl_init($api_url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        $response = curl_exec($ch);
        if ($response === false) {
            $error = curl_error($ch);
            error_log("contracts.php: create-multisig: cURL error: " . $error);
            echo json_encode(["error" => "cURL error: " . $error]);
            curl_close($ch);
            exit;
        }
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($http_code !== 200) {
            error_log("contracts.php: create-multisig: API returned non-200 status code: " . $http_code);
            echo json_encode(["error" => "Multisig creation failed with status code: $http_code"]);
            exit;
        }
        $result = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log("contracts.php: create-multisig: JSON decode error: " . json_last_error_msg());
            echo json_encode(["error" => "Invalid API response"]);
            exit;
        }
        if (isset($result['success']) && $result['success']) {
            error_log("contracts.php: create-multisig: Multisig created successfully, address: " . $result['multisig_address']);
            echo json_encode(["success" => true, "multisig_address" => $result['multisig_address']]);
        } else {
            $error = $result['error'] ?? 'Unknown API error';
            error_log("contracts.php: create-multisig: API error: " . $error);
            echo json_encode(["error" => $error]);
        }
        exit;
    }

    if ($action === 'create_contract') {
        $data = $input['data'] ?? [];
        error_log("contracts.php: create_contract: Received data: " . json_encode($data));
        $contract_id = filter_var($data['contract_id'] ?? '', FILTER_SANITIZE_STRING);
        $event_id = filter_var($data['event_id'] ?? '', FILTER_SANITIZE_STRING);
        $title = filter_var($data['title'] ?? '', FILTER_SANITIZE_STRING);
        $creator_address = filter_var($data['creator_address'] ?? '', FILTER_SANITIZE_STRING);
        $outcome = filter_var($data['outcome'] ?? '', FILTER_SANITIZE_STRING);
        $position_type = filter_var($data['position_type'] ?? 'buy', FILTER_SANITIZE_STRING);
        $stake = (float) ($data['stake'] ?? 0);
        $odds = (float) ($data['odds'] ?? 1.0);
        $acceptance_deadline = filter_var($data['acceptance_deadline'] ?? '', FILTER_SANITIZE_STRING);
        $multisig_address = filter_var($data['multisig_address'] ?? '', FILTER_SANITIZE_STRING);
        $refund_transaction_id = filter_var($data['refund_transaction_id'] ?? '', FILTER_SANITIZE_STRING);
        $creator_public_key = filter_var($data['creator_public_key'] ?? '', FILTER_SANITIZE_STRING);
        $signature = filter_var($data['signature'] ?? '', FILTER_SANITIZE_FULL_SPECIAL_CHARS);

        if (empty($contract_id) || empty($event_id) || empty($title) || empty($creator_address) || empty($outcome) || empty($multisig_address)) {
            error_log("contracts.php: create_contract: Missing required fields");
            http_response_code(400);
            echo json_encode(["error" => "Missing required fields for contract creation"]);
            exit;
        }

        if (!validateDashWalletAddress($creator_address)) {
            error_log("contracts.php: create_contract: Invalid creator_address: $creator_address");
            http_response_code(400);
            echo json_encode(["error" => "Invalid Dash testnet wallet address"]);
            exit;
        }

        // Validate acceptance_deadline
        try {
            $deadline_date = new DateTimeImmutable($acceptance_deadline, new DateTimeZone('UTC'));
            $now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
            if ($deadline_date <= $now) {
                error_log("contracts.php: create_contract: Acceptance deadline must be in the future");
                http_response_code(400);
                echo json_encode(["error" => "Acceptance deadline must be in the future"]);
                exit;
            }
        } catch (Exception $e) {
            error_log("contracts.php: create_contract: Invalid acceptance_deadline format: " . $e->getMessage());
            http_response_code(400);
            echo json_encode(["error" => "Invalid acceptance_deadline format"]);
            exit;
        }

        // Forward to db_proxy.php
        $payload = json_encode([
            'api_key' => $api_key,
            'action' => 'create_contract',
            'data' => [
                'contract_id' => $contract_id,
                'event_id' => $event_id,
                'title' => $title,
                'creator_address' => $creator_address,
                'outcome' => $outcome,
                'position_type' => $position_type,
                'stake' => $stake,
                'odds' => $odds,
                'acceptance_deadline' => $acceptance_deadline,
                'multisig_address' => $multisig_address,
                'refund_transaction_id' => $refund_transaction_id,
                'creator_public_key' => $creator_public_key,
                'signature' => $signature
            ]
        ]);
        $ch = curl_init($api_url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        $response = curl_exec($ch);
        if ($response === false) {
            $error = curl_error($ch);
            error_log("contracts.php: create_contract: cURL error: " . $error);
            echo json_encode(["error" => "cURL error: " . $error]);
            curl_close($ch);
            exit;
        }
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($http_code !== 200) {
            $result = json_decode($response, true);
            $error = isset($result['error']) ? $result['error'] : 'Unknown API error';
            error_log("contracts.php: create_contract: API returned non-200 status code: $http_code, response: $error");
            echo json_encode(["error" => "Contract creation failed with status code: $http_code, details: $error"]);
            exit;
        }
        $result = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log("contracts.php: create_contract: JSON decode error: " . json_last_error_msg());
            echo json_encode(["error" => "Invalid API response"]);
            exit;
        }
        if (isset($result['success']) && $result['success']) {
            error_log("contracts.php: create_contract: Contract created successfully, contract_id: " . $result['data']['contract_id']);
            echo json_encode(["success" => true, "contract_id" => $result['data']['contract_id']]);
        } else {
            $error = $result['error'] ?? 'Unknown API error';
            error_log("contracts.php: create_contract: API error: " . $error);
            echo json_encode(["error" => $error]);
        }
        exit;
    }

    if ($action === 'accept_contract') {
        $data = $input['data'] ?? [];
        error_log("contracts.php: accept_contract: Received data: " . json_encode($data));
        $contract_id = filter_var($data['contract_id'] ?? '', FILTER_SANITIZE_STRING);
        $accepter_address = filter_var($data['accepterWalletAddress'] ?? '', FILTER_SANITIZE_STRING);
        $accepter_stake = (float) ($data['accepter_stake'] ?? 0);
        $accepter_transaction_id = filter_var($data['accepter_transaction_id'] ?? '', FILTER_SANITIZE_STRING);
        $signature = filter_var($data['signature'] ?? '', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $multisig_address = filter_var($data['multisig_address'] ?? '', FILTER_SANITIZE_STRING);

        if (empty($contract_id) || empty($accepter_address) || empty($signature) || empty($multisig_address)) {
            error_log("contracts.php: accept_contract: Missing required fields");
            http_response_code(400);
            echo json_encode(["error" => "Missing required fields"]);
            exit;
        }

        if (!validateDashWalletAddress($accepter_address)) {
            error_log("contracts.php: accept_contract: Invalid accepter_address: $accepter_address");
            http_response_code(400);
            echo json_encode(["error" => "Invalid Dash testnet wallet address"]);
            exit;
        }

        // Forward to db_proxy.php
        $payload = json_encode([
            'api_key' => $api_key,
            'action' => 'accept_contract',
            'data' => [
                'contract_id' => $contract_id,
                'accepterWalletAddress' => $accepter_address,
                'accepter_stake' => $accepter_stake,
                'accepter_transaction_id' => $accepter_transaction_id,
                'signature' => $signature,
                'multisig_address' => $multisig_address
            ]
        ]);
        $ch = curl_init($api_url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        $response = curl_exec($ch);
        if ($response === false) {
            $error = curl_error($ch);
            error_log("contracts.php: accept_contract: cURL error: " . $error);
            echo json_encode(["error" => "cURL error: " . $error]);
            curl_close($ch);
            exit;
        }
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($http_code !== 200) {
            $result = json_decode($response, true);
            $error = isset($result['error']) ? $result['error'] : 'Unknown API error';
            error_log("contracts.php: accept_contract: API returned non-200 status code: $http_code, response: $error");
            echo json_encode(["error" => "Accept contract failed with status code: $http_code, details: $error"]);
            exit;
        }
        $result = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log("contracts.php: accept_contract: JSON decode error: " . json_last_error_msg());
            echo json_encode(["error" => "Invalid API response"]);
            exit;
        }
        if (isset($result['success']) && $result['success']) {
            error_log("contracts.php: accept_contract: Contract accepted successfully, contract_id: $contract_id");
            echo json_encode(["success" => true]);
        } else {
            $error = $result['error'] ?? 'Unknown API error';
            error_log("contracts.php: accept_contract: API error: " . $error);
            echo json_encode(["error" => $error]);
        }
        exit;
    }

    error_log("contracts.php: Invalid action for POST request: $action");
    http_response_code(400);
    echo json_encode(["error" => "Invalid action"]);
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
        $accepter_address = filter_var($data['acceptor_address'] ?? '', FILTER_SANITIZE_STRING);
        $accepter_stake = (float) ($data['accepter_stake'] ?? 0);
        $accepter_transaction_id = filter_var($data['accepter_transaction_id'] ?? '', FILTER_SANITIZE_STRING);
        $signature = filter_var($data['signature'] ?? '', FILTER_SANITIZE_FULL_SPECIAL_CHARS);
        $multisig_address = filter_var($data['multisig_address'] ?? '', FILTER_SANITIZE_STRING);

        if (empty($contract_id) || empty($accepter_address) || empty($signature) || empty($multisig_address)) {
            error_log("contracts.php: accept: Missing required fields");
            http_response_code(400);
            echo json_encode(["error" => "Missing required fields"]);
            exit;
        }

        if (!validateDashWalletAddress($accepter_address)) {
            error_log("contracts.php: accept: Invalid acceptor_address: $accepter_address");
            http_response_code(400);
            echo json_encode(["error" => "Invalid Dash testnet wallet address"]);
            exit;
        }

        // Forward to db_proxy.php
        $payload = json_encode([
            'api_key' => $api_key,
            'action' => 'accept_contract',
            'data' => [
                'contract_id' => $contract_id,
                'accepterWalletAddress' => $accepter_address,
                'accepter_stake' => $accepter_stake,
                'accepter_transaction_id' => $accepter_transaction_id,
                'signature' => $signature,
                'multisig_address' => $multisig_address
            ]
        ]);
        $ch = curl_init($api_url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
        $response = curl_exec($ch);
        if ($response === false) {
            $error = curl_error($ch);
            error_log("contracts.php: accept: cURL error: " . $error);
            echo json_encode(["error" => "cURL error: " . $error]);
            curl_close($ch);
            exit;
        }
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        if ($http_code !== 200) {
            $result = json_decode($response, true);
            $error = isset($result['error']) ? $result['error'] : 'Unknown API error';
            error_log("contracts.php: accept: API returned non-200 status code: $http_code, response: $error");
            echo json_encode(["error" => "Accept contract failed with status code: $http_code, details: $error"]);
            exit;
        }
        $result = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log("contracts.php: accept: JSON decode error: " . json_last_error_msg());
            echo json_encode(["error" => "Invalid API response"]);
            exit;
        }
        if (isset($result['success']) && $result['success']) {
            error_log("contracts.php: accept: Contract accepted successfully, contract_id: $contract_id");
            echo json_encode(["success" => true]);
        } else {
            $error = $result['error'] ?? 'Unknown API error';
            error_log("contracts.php: accept: API error: " . $error);
            echo json_encode(["error" => $error]);
        }
        exit;
    }

    error_log("contracts.php: Invalid action for PUT request: $action");
    http_response_code(400);
    echo json_encode(["error" => "Invalid action"]);
    exit;
}

error_log("contracts.php: Invalid method: " . $_SERVER["REQUEST_METHOD"]);
http_response_code(405);
echo json_encode(["error" => "Method not allowed"]);
exit;