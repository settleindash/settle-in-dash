<?php
// api/contracts.php
// API to manage contracts in the MariaDB database for a betting application.
// Supports GET (retrieve contracts), POST (create contract), and PUT (accept, settle, twist).

// Include database configuration
require_once "../config/config.php";

// Enable error logging
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', '../logs/php_errors.log');

// Enable CORS
header("Access-Control-Allow-Origin: https://settleindash.com");
header("Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Connect to MariaDB
$conn = mysqli_connect(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if (!$conn) {
    error_log("Connection failed: " . mysqli_connect_error());
    http_response_code(500);
    echo json_encode(["error" => "Connection failed: " . mysqli_connect_error()]);
    exit;
}

// Handle HTTP methods
$method = $_SERVER["REQUEST_METHOD"];

// Current server time, rounded to start of the day
$currentDateTime = date('Y-m-d 00:00:00');

if ($method === "OPTIONS") {
    http_response_code(200);
    exit;
}

if ($method === "GET") {
    $id = isset($_GET["id"]) ? mysqli_real_escape_string($conn, $_GET["id"]) : null;
    if ($id) {
        $query = "SELECT * FROM contracts WHERE id = ?";
        $stmt = mysqli_prepare($conn, $query);
        mysqli_stmt_bind_param($stmt, "s", $id);
    } else {
        $query = "SELECT * FROM contracts";
        $stmt = mysqli_prepare($conn, $query);
    }
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    $contracts = [];
    while ($row = mysqli_fetch_assoc($result)) {
        $row["resolutionDetails"] = $row["resolutionDetails_reasoning"] || $row["resolutionDetails_timestamp"]
            ? [
                "reasoning" => $row["resolutionDetails_reasoning"],
                "timestamp" => $row["resolutionDetails_timestamp"]
            ]
            : null;
        unset($row["resolutionDetails_reasoning"]);
        unset($row["resolutionDetails_timestamp"]);
        $contracts[] = $row;
    }
    mysqli_stmt_close($stmt);
    echo json_encode($contracts);
}

elseif ($method === "POST") {
    $data = json_decode(file_get_contents("php://input"), true);
    if (!$data) {
        error_log("POST: Invalid JSON data");
        http_response_code(400);
        echo json_encode(["error" => "Invalid JSON data"]);
        exit;
    }

    $id = $data["id"] ?? uniqid();
    $question = $data["question"];
    $time = $data["time"];
    $stake = floatval($data["stake"]);
    $percentage = floatval($data["percentage"]);
    $category = $data["category"];
    $email = $data["email"];
    $acceptanceDeadline = $data["acceptanceDeadline"];

    // Convert ISO 8601 datetime to MariaDB DATETIME format
    try {
        $time = (new DateTime($time))->format('Y-m-d H:i:s');
        $acceptanceDeadline = (new DateTime($acceptanceDeadline))->format('Y-m-d H:i:s');
    } catch (Exception $e) {
        error_log("POST: Invalid datetime format - " . $e->getMessage());
        http_response_code(400);
        echo json_encode(["error" => "Invalid datetime format: " . $e->getMessage()]);
        exit;
    }

    // Validation
    if (!preg_match("/\?$/", $question)) {
        error_log("POST: Validation failed - Question must end with ?");
        http_response_code(400);
        echo json_encode(["error" => "Question must end with ?"]);
        exit;
    }
    if ($stake < 1) {
        error_log("POST: Validation failed - Minimum 1 DASH stake");
        http_response_code(400);
        echo json_encode(["error" => "Minimum 1 DASH stake"]);
        exit;
    }
    if ($percentage < 0 || $percentage > 100) {
        error_log("POST: Validation failed - Percentage must be between 0 and 100");
        http_response_code(400);
        echo json_encode(["error" => "Percentage must be a number between 0 and 100"]);
        exit;
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        error_log("POST: Validation failed - Invalid email");
        http_response_code(400);
        echo json_encode(["error" => "Please provide a valid email address"]);
        exit;
    }
    if (!strtotime($time) || strtotime($time) <= strtotime($currentDateTime)) {
        error_log("POST: Validation failed - Invalid or past event time");
        http_response_code(400);
        echo json_encode(["error" => "Time must be a valid date and after the current day"]);
        exit;
    }
    if (!strtotime($acceptanceDeadline) || strtotime($acceptanceDeadline) <= strtotime($currentDateTime)) {
        error_log("POST: Validation failed - Invalid or past acceptance deadline");
        http_response_code(400);
        echo json_encode(["error" => "Acceptance deadline must be a valid date and after the current day"]);
        exit;
    }
    if (strtotime($acceptanceDeadline) > strtotime($time)) {
        error_log("POST: Validation failed - Acceptance deadline after event time");
        http_response_code(400);
        echo json_encode(["error" => "Acceptance deadline must be before or on the event time"]);
        exit;
    }

    $stmt = mysqli_prepare($conn, "INSERT INTO contracts (id, question, time, stake, percentage, category, email, acceptanceDeadline, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open')");
    mysqli_stmt_bind_param($stmt, "sssddsss", $id, $question, $time, $stake, $percentage, $category, $email, $acceptanceDeadline);
    if (mysqli_stmt_execute($stmt)) {
        error_log("POST: Contract created successfully - ID: $id");
        echo json_encode(["success" => true, "id" => $id]);
    } else {
        error_log("POST: Failed to create contract - " . mysqli_error($conn));
        http_response_code(500);
        echo json_encode(["error" => "Failed to create contract: " . mysqli_error($conn)]);
    }
    mysqli_stmt_close($stmt);
}

elseif ($method === "PUT") {
    $data = json_decode(file_get_contents("php://input"), true);
    if (!$data || !isset($data["action"])) {
        error_log("PUT: Invalid JSON data or missing action");
        http_response_code(400);
        echo json_encode(["error" => "Invalid JSON data or missing action"]);
        exit;
    }
    $action = $data["action"];
    $id = $data["id"];

    $query = "SELECT * FROM contracts WHERE id = ?";
    $stmt = mysqli_prepare($conn, $query);
    mysqli_stmt_bind_param($stmt, "s", $id);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    if (mysqli_num_rows($result) === 0) {
        error_log("PUT: Contract not found - ID: $id");
        http_response_code(404);
        echo json_encode(["error" => "Contract not found"]);
        exit;
    }
    $contract = mysqli_fetch_assoc($result);
    mysqli_stmt_close($stmt);

    if ($action === "accept") {
        $accepterEmail = $data["accepterEmail"];
        if (strtotime($contract["acceptanceDeadline"]) < strtotime($currentDateTime)) {
            error_log("PUT: Cannot accept contract - Deadline passed, ID: $id");
            http_response_code(400);
            echo json_encode(["error" => "Cannot accept contract: Acceptance deadline has passed"]);
            exit;
        }
        if (!filter_var($accepterEmail, FILTER_VALIDATE_EMAIL)) {
            error_log("PUT: Validation failed - Invalid accepter email");
            http_response_code(400);
            echo json_encode(["error" => "Please provide a valid accepter email address"]);
            exit;
        }
        if ($contract["email"] === $accepterEmail) {
            $stmt = mysqli_prepare($conn, "UPDATE contracts SET status = 'cancelled', accepter = ?, accepterEmail = ? WHERE id = ?");
            $accepter = '0xMockAccepter';
            mysqli_stmt_bind_param($stmt, "sss", $accepter, $accepterEmail, $id);
            mysqli_stmt_execute($stmt);
            error_log("PUT: Contract cancelled - Same email, ID: $id");
            echo json_encode(["success" => true, "message" => "Contract cancelled! Creator and accepter cannot have the same email."]);
            mysqli_stmt_close($stmt);
            exit;
        }
        if ($contract["accepter"] || $contract["status"] !== "open") {
            error_log("PUT: Contract already accepted or not open, ID: $id");
            http_response_code(400);
            echo json_encode(["error" => "Contract already accepted or not open"]);
            exit;
        }
        $stmt = mysqli_prepare($conn, "UPDATE contracts SET accepter = ?, status = 'accepted', accepterEmail = ? WHERE id = ?");
        $accepter = '0xMockAccepter';
        mysqli_stmt_bind_param($stmt, "sss", $accepter, $accepterEmail, $id);
        if (mysqli_stmt_execute($stmt)) {
            error_log("PUT: Contract accepted successfully - ID: $id");
            echo json_encode(["success" => true, "message" => "Contract accepted!"]);
        } else {
            error_log("PUT: Failed to accept contract - " . mysqli_error($conn));
            http_response_code(500);
            echo json_encode(["error" => "Failed to accept contract: " . mysqli_error($conn)]);
        }
        mysqli_stmt_close($stmt);
    }

    elseif ($action === "settle") {
        $winnerEmail = $data["winnerEmail"];
        if ($contract["status"] !== "accepted") {
            error_log("PUT: Contract not accepted, ID: $id");
            http_response_code(400);
            echo json_encode(["error" => "Contract not accepted"]);
            exit;
        }
        if (!filter_var($winnerEmail, FILTER_VALIDATE_EMAIL)) {
            error_log("PUT: Validation failed - Invalid winner email");
            http_response_code(400);
            echo json_encode(["error" => "Please provide a valid winner email address"]);
            exit;
        }
        $payout = $winnerEmail === $contract["email"] ? $contract["stake"] * 0.97 : $contract["stake"] * 0.95;
        $stmt = mysqli_prepare($conn, "UPDATE contracts SET status = 'settled' WHERE id = ?");
        mysqli_stmt_bind_param($stmt, "s", $id);
        if (mysqli_stmt_execute($stmt)) {
            error_log("PUT: Contract settled successfully - ID: $id");
            echo json_encode(["success" => true, "message" => "Contract settled! $winnerEmail receives $payout DASH."]);
        } else {
            error_log("PUT: Failed to settle contract - " . mysqli_error($conn));
            http_response_code(500);
            echo json_encode(["error" => "Failed to settle contract: " . mysqli_error($conn)]);
        }
        mysqli_stmt_close($stmt);
    }

    elseif ($action === "twist") {
        if ($contract["status"] !== "accepted") {
            error_log("PUT: Contract not accepted for twist, ID: $id");
            http_response_code(400);
            echo json_encode(["error" => "Contract not accepted"]);
            exit;
        }
        $resolution = "Yes";
        $reasoning = "Mock Grok response based on public data";
        $timestamp = date("Y-m-d H:i:s");
        $stmt = mysqli_prepare($conn, "UPDATE contracts SET status = 'twist', resolution = ?, resolutionDetails_reasoning = ?, resolutionDetails_timestamp = ? WHERE id = ?");
        mysqli_stmt_bind_param($stmt, "ssss", $resolution, $reasoning, $timestamp, $id);
        if (mysqli_stmt_execute($stmt)) {
            error_log("PUT: Twist triggered successfully - ID: $id");
            echo json_encode(["success" => true, "message" => "Twist triggered! Grok resolved: Yes outcome."]);
        } else {
            error_log("PUT: Failed to trigger twist - " . mysqli_error($conn));
            http_response_code(500);
            echo json_encode(["error" => "Failed to trigger twist: " . mysqli_error($conn)]);
        }
        mysqli_stmt_close($stmt);
    }

    else {
        error_log("PUT: Invalid action - $action");
        http_response_code(400);
        echo json_encode(["error" => "Invalid action"]);
    }
}

else {
    error_log("Invalid method: $method");
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
}

mysqli_close($conn);
?>