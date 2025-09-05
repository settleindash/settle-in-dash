<?php
// api/events.php
// API to manage events in the MariaDB database for Settle In DASH.
// Supports GET (retrieve events) and POST (create event).

// Include database configuration
require_once "../config/config.php";

// Enable error logging
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', '../logs/php_errors.log');

// Enable CORS
header("Access-Control-Allow-Origin: https://settleindash.com");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Connect to MariaDB using PDO
try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    error_log("Connection failed: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(["error" => "Connection failed: " . $e->getMessage()]);
    exit;
}

// Minimal validation function to ensure database integrity
function validateEventCreation($data) {
    $errors = [];
    $currentDateTime = new DateTime('now', new DateTimeZone('Europe/Paris'));

    // Check required fields
    $required_fields = ['title', 'category', 'event_date', 'possible_outcomes', 'event_wallet_address'];
    foreach ($required_fields as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            $errors[] = "Missing or empty required field: $field";
        }
    }

    // Validate event_date format
    if (isset($data['event_date']) && !empty($data['event_date'])) {
        try {
            new DateTime($data['event_date'], new DateTimeZone('Europe/Paris'));
        } catch (Exception $e) {
            $errors[] = "Invalid event date format";
        }
    }

    // Validate possible_outcomes is an array
    if (isset($data['possible_outcomes']) && !is_array($data['possible_outcomes'])) {
        $errors[] = "Possible outcomes must be an array";
    }

    return [
        'isValid' => empty($errors),
        'message' => empty($errors) ? '' : implode('. ', $errors)
    ];
}

// Handle HTTP methods
$method = $_SERVER["REQUEST_METHOD"];
$currentDateTime = (new DateTime('now', new DateTimeZone('Europe/Paris')))->format('Y-m-d H:i:s');

if ($method === "OPTIONS") {
    http_response_code(200);
    exit;
}

if ($method === "GET") {
    $event_id = isset($_GET["event_id"]) ? filter_var($_GET["event_id"], FILTER_SANITIZE_STRING) : null;
    $category = isset($_GET["category"]) ? filter_var($_GET["category"], FILTER_SANITIZE_STRING) : null;

    $query = "SELECT * FROM events WHERE 1=1";
    $params = [];

    if ($event_id) {
        $query .= " AND event_id = ?";
        $params[] = $event_id;
    }
    if ($category) {
        $query .= " AND category = ?";
        $params[] = $category;
    }

    try {
        $stmt = $pdo->prepare($query);
        $stmt->execute($params);
        $events = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($events);
    } catch (PDOException $e) {
        error_log("GET: Failed to retrieve events - " . $e->getMessage());
        http_response_code(500);
        echo json_encode(["error" => "Failed to retrieve events: " . $e->getMessage()]);
    }
}

elseif ($method === "POST") {
    $data = json_decode(file_get_contents("php://input"), true);
    if (!$data) {
        error_log("POST: Invalid JSON data");
        http_response_code(400);
        echo json_encode(["error" => "Invalid JSON data"]);
        exit;
    }

    error_log("POST: Received data: " . print_r($data, true)); // Debug log

    // Validate inputs using validateEventCreation
    $validationResult = validateEventCreation($data);
    if (!$validationResult['isValid']) {
        error_log("POST: Validation failed - " . $validationResult['message']);
        http_response_code(400);
        echo json_encode(["error" => $validationResult['message']]);
        exit;
    }

    // Sanitize inputs
    $title = filter_var($data['title'], FILTER_SANITIZE_STRING);
    $category = filter_var($data['category'], FILTER_SANITIZE_STRING);
    $event_date = (new DateTime($data['event_date'], new DateTimeZone('Europe/Paris')))->format('Y-m-d H:i:s');
    $possible_outcomes = json_encode($data['possible_outcomes']);
    $oracle_source = isset($data['oracle_source']) ? filter_var($data['oracle_source'], FILTER_SANITIZE_STRING) : null;
    $event_wallet_address = filter_var($data['event_wallet_address'], FILTER_SANITIZE_STRING);
    $event_id = isset($data['event_id']) ? filter_var($data['event_id'], FILTER_SANITIZE_STRING) : uniqid("EVENT_");

    // Insert event
    try {
        $stmt = $pdo->prepare(
            "INSERT INTO events (event_id, title, category, event_date, possible_outcomes, oracle_source, eventWalletAddress, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())"
        );
        $stmt->execute([$event_id, $title, $category, $event_date, $possible_outcomes, $oracle_source, $event_wallet_address]);
        error_log("POST: Event created successfully - event_id: $event_id");
        echo json_encode(["success" => true, "event_id" => $event_id]);
    } catch (PDOException $e) {
        error_log("POST: Failed to create event - " . $e->getMessage());
        http_response_code(500);
        echo json_encode(["error" => "Failed to create event: " . $e->getMessage()]);
    }
}

else {
    error_log("Invalid method: $method");
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
}
?>