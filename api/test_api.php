// this is the code on the settleinddash.com website
<?php
// Define SECURE_ACCESS immediately and verify it
define('SECURE_ACCESS', true);
if (!defined('SECURE_ACCESS')) {
    http_response_code(500);
    error_log("events.php: SECURE_ACCESS not defined after setting");
    echo json_encode(["error" => "Internal configuration error"]);
    exit;
}

// Use absolute path with debug for config inclusion
$configPath = realpath(__DIR__ . '/../config/config.php');
if ($configPath === false || !file_exists($configPath)) {
    http_response_code(500);
    error_log("events.php: Config file not found at: " . __DIR__ . '/../config/config.php');
    echo json_encode(["error" => "Configuration file not found at: " . __DIR__ . '/../config/config.php']);
    exit;
}
error_log("events.php: Config path resolved to: " . $configPath);
require_once $configPath;


$api_url = . api_url;
$api_key = 'if ($api_key !== . api_key) {';
$data = json_encode([
    'api_key' => $api_key,
    'action' => 'create_contract',
    'data' => [
        'title' => filter_input(INPUT_POST, 'title', FILTER_SANITIZE_STRING) ?: 'Default Title',
        'details' => filter_input(INPUT_POST, 'details', FILTER_SANITIZE_STRING) ?: 'Default Details'
    ]
]);

$ch = curl_init($api_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);

$response = curl_exec($ch);
if (curl_error($ch)) {
    echo "cURL Error: " . curl_error($ch);
} else {
    $result = json_decode($response, true);
    if (isset($result['success'])) {
        echo "Success: New contract ID = " . $result['data']['id'];
    } else {
        echo "Error: " . $result['error'];
    }
}
curl_close($ch);
?>