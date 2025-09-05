<?php
// api/test.php
ob_start();
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', '../logs/php_errors.log');
header("Content-Type: application/json");
require_once "../config/config.php";
try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    echo json_encode(["success" => "Config and DB connection successful"]);
} catch (PDOException $e) {
    error_log("test.php: DB connection failed: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "DB connection failed: " . $e->getMessage()]);
}
ob_end_clean();
?>