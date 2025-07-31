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

// Handle HTTP methods
$method = $_SERVER["REQUEST_METHOD"];
$currentDateTime = date('Y-m-d H:i:s');

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

    // Required fields
    $required_fields = ['title', 'category', 'event_date', 'possible_outcomes'];
    foreach ($required_fields as $field) {
        if (!isset($data[$field])) {
            error_log("POST: Missing required field - $field");
            http_response_code(400);
            echo json_encode(["error" => "Missing required field: $field"]);
            exit;
        }
    }

    // Sanitize and validate inputs
    $title = filter_var($data['title'], FILTER_SANITIZE_STRING);
    $category = filter_var($data['category'], FILTER_SANITIZE_STRING);
    $event_date = $data['event_date'];
    $possible_outcomes = $data['possible_outcomes']; // Expecting array
    $oracle_source = isset($data['oracle_source']) ? filter_var($data['oracle_source'], FILTER_SANITIZE_STRING) : null;
    $event_id = isset($data['event_id']) ? filter_var($data['event_id'], FILTER_SANITIZE_STRING) : uniqid("EVENT_");

    // Validate inputs
    try {
        $event_date = (new DateTime($event_date))->format('Y-m-d H:i:s');
    } catch (Exception $e) {
        error_log("POST: Invalid event_date format - " . $e->getMessage());
        http_response_code(400);
        echo json_encode(["error" => "Invalid event_date format: " . $e->getMessage()]);
        exit;
    }

    if (empty($title) || strlen($title) > 255) {
        error_log("POST: Validation failed - Invalid title");
        http_response_code(400);
        echo json_encode(["error" => "Title must be non-empty and less than 255 characters"]);
        exit;
    }
    if (empty($category) || strlen($category) > 100) {
        error_log("POST: Validation failed - Invalid category");
        http_response_code(400);
        echo json_encode(["error" => "Category must be non-empty and less than 100 characters"]);
        exit;
    }
    if (strtotime($event_date) <= strtotime($currentDateTime)) {
        error_log("POST: Validation failed - Event date must be in the future");
        http_response_code(400);
        echo json_encode(["error" => "Event date must be in the future"]);
        exit;
    }
    if (!is_array($possible_outcomes) || count($possible_outcomes) < 2) {
        error_log("POST: Validation failed - At least two possible outcomes required");
        http_response_code(400);
        echo json_encode(["error" => "At least two possible outcomes are required"]);
        exit;
    }
    foreach ($possible_outcomes as $outcome) {
        if (empty($outcome) || strlen($outcome) > 255) {
            error_log("POST: Validation failed - Invalid outcome");
            http_response_code(400);
            echo json_encode(["error" => "Each outcome must be non-empty and less than 255 characters"]);
            exit;
        }
    }
    $possible_outcomes_json = json_encode($possible_outcomes);
    if (!$possible_outcomes_json) {
        error_log("POST: Validation failed - Failed to encode outcomes as JSON");
        http_response_code(400);
        echo json_encode(["error" => "Failed to encode outcomes as JSON"]);
        exit;
    }

    // Insert event
    try {
        $stmt = $pdo->prepare(
            "INSERT INTO events (event_id, title, category, event_date, possible_outcomes, oracle_source, created_at)
             VALUES (?, ?, ?, ?, ?, ?, NOW())"
        );
        $stmt->execute([$event_id, $title, $category, $event_date, $possible_outcomes_json, $oracle_source]);
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