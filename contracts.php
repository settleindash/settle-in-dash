<?php
// public_html/api/contracts.php
// API to manage contracts in the MariaDB database for a betting application.
// Supports GET (retrieve contracts), POST (create contract), and PUT (accept, settle, twist).

// Include database configuration
require_once "../config.php"; // Path to config.php outside public_html

// Enable CORS to allow React app to make requests
header("Access-Control-Allow-Origin: *"); // Allow all origins (adjust for production)
header("Access-Control-Allow-Methods: GET, POST, PUT, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Connect to MariaDB
$conn = mysqli_connect(DB_HOST, DB_USER, DB_PASS, DB_NAME);
if (!$conn) {
    http_response_code(500);
    echo json_encode(["error" => "Connection failed: " . mysqli_connect_error()]);
    exit;
}

// Handle HTTP methods
$method = $_SERVER["REQUEST_METHOD"];

if ($method === "OPTIONS") {
    // Handle CORS preflight request
    http_response_code(200);
    exit;
}

if ($method === "GET") {
    // Retrieve all contracts or a specific contract by ID
    $id = isset($_GET["id"]) ? mysqli_real_escape_string($conn, $_GET["id"]) : null;
    if ($id) {
        $query = "SELECT * FROM contracts WHERE id = '$id'";
    } else {
        $query = "SELECT * FROM contracts";
    }
    $result = mysqli_query($conn, $query);
    $contracts = [];
    while ($row = mysqli_fetch_assoc($result)) {
        // Format resolutionDetails as an object
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
    echo json_encode($contracts);
}

elseif ($method === "POST") {
    // Create a new contract
    $data = json_decode(file_get_contents("php://input"), true);
    if (!$data) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid JSON data"]);
        exit;
    }

    $id = mysqli_real_escape_string($conn, $data["id"] ?? uniqid());
    $question = mysqli_real_escape_string($conn, $data["question"]);
    $time = mysqli_real_escape_string($conn, $data["time"]);
    $stake = floatval($data["stake"]);
    $percentage = floatval($data["percentage"]);
    $category = mysqli_real_escape_string($conn, $data["category"]);
    $email = mysqli_real_escape_string($conn, $data["email"]);
    $acceptanceDeadline = mysqli_real_escape_string($conn, $data["acceptanceDeadline"]);

    // Validation
    if (!preg_match("/\?$/", $question)) {
        http_response_code(400);
        echo json_encode(["error" => "Question must end with ?"]);
        exit;
    }
    if ($stake < 1) {
        http_response_code(400);
        echo json_encode(["error" => "Minimum 1 DASH stake"]);
        exit;
    }
    if ($percentage < 0 || $percentage > 100) {
        http_response_code(400);
        echo json_encode(["error" => "Percentage must be a number between 0 and 100"]);
        exit;
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        http_response_code(400);
        echo json_encode(["error" => "Please provide a valid email address"]);
        exit;
    }
    $currentDateTime = "2025-07-18 13:52:00"; // Updated for testing
    if (!strtotime($time) || strtotime($time) <= strtotime($currentDateTime)) {
        http_response_code(400);
        echo json_encode(["error" => "Time must be a valid date and after the current time"]);
        exit;
    }
    if (!strtotime($acceptanceDeadline) || strtotime($acceptanceDeadline) <= strtotime($currentDateTime)) {
        http_response_code(400);
        echo json_encode(["error" => "Acceptance deadline must be a valid date and after the current time"]);
        exit;
    }
    if (strtotime($acceptanceDeadline) > strtotime($time)) {
        http_response_code(400);
        echo json_encode(["error" => "Acceptance deadline must be before or on the event time"]);
        exit;
    }

    $query = "INSERT INTO contracts (id, question, time, stake, percentage, category, email, acceptanceDeadline, status) 
              VALUES ('$id', '$question', '$time', $stake, $percentage, '$category', '$email', '$acceptanceDeadline', 'open')";
    if (mysqli_query($conn, $query)) {
        echo json_encode(["success" => true]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Failed to create contract: " . mysqli_error($conn)]);
    }
}

elseif ($method === "PUT") {
    // Handle accept, settle, or twist actions
    $data = json_decode(file_get_contents("php://input"), true);
    if (!$data || !isset($data["action"])) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid JSON data or missing action"]);
        exit;
    }
    $action = $data["action"];
    $id = mysqli_real_escape_string($conn, $data["id"]);

    // Check if contract exists
    $query = "SELECT * FROM contracts WHERE id = '$id'";
    $result = mysqli_query($conn, $query);
    if (mysqli_num_rows($result) === 0) {
        http_response_code(404);
        echo json_encode(["error" => "Contract not found"]);
        exit;
    }
    $contract = mysqli_fetch_assoc($result);

    if ($action === "accept") {
        $accepterEmail = mysqli_real_escape_string($conn, $data["accepterEmail"]);
        $currentDateTime = "2025-07-18 13:52:00";
        if (strtotime($contract["acceptanceDeadline"]) < strtotime($currentDateTime)) {
            http_response_code(400);
            echo json_encode(["error" => "Cannot accept contract: Acceptance deadline has passed"]);
            exit;
        }
        if (!filter_var($accepterEmail, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(["error" => "Please provide a valid accepter email address"]);
            exit;
        }
        if ($contract["email"] === $accepterEmail) {
            $query = "UPDATE contracts SET status = 'cancelled', accepter = '0xMockAccepter', accepterEmail = '$accepterEmail' WHERE id = '$id'";
            mysqli_query($conn, $query);
            echo json_encode(["success" => true, "message" => "Contract cancelled! Creator and accepter cannot have the same email."]);
            exit;
        }
        if ($contract["accepter"] || $contract["status"] !== "open") {
            http_response_code(400);
            echo json_encode(["error" => "Contract already accepted or not open"]);
            exit;
        }
        $query = "UPDATE contracts SET accepter = '0xMockAccepter', status = 'accepted', accepterEmail = '$accepterEmail' WHERE id = '$id'";
        if (mysqli_query($conn, $query)) {
            echo json_encode(["success" => true, "message" => "Contract accepted!"]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Failed to accept contract: " . mysqli_error($conn)]);
        }
    }

    elseif ($action === "settle") {
        $winnerEmail = mysqli_real_escape_string($conn, $data["winnerEmail"]);
        if ($contract["status"] !== "accepted") {
            http_response_code(400);
            echo json_encode(["error" => "Contract not accepted"]);
            exit;
        }
        if (!filter_var($winnerEmail, FILTER_VALIDATE_EMAIL)) {
            http_response_code(400);
            echo json_encode(["error" => "Please provide a valid winner email address"]);
            exit;
        }
        $payout = $winnerEmail === $contract["email"] ? $contract["stake"] * 0.97 : $contract["stake"] * 0.95;
        $query = "UPDATE contracts SET status = 'settled' WHERE id = '$id'";
        if (mysqli_query($conn, $query)) {
            echo json_encode(["success" => true, "message" => "Contract settled! $winnerEmail receives $payout DASH."]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Failed to settle contract: " . mysqli_error($conn)]);
        }
    }

    elseif ($action === "twist") {
        if ($contract["status"] !== "accepted") {
            http_response_code(400);
            echo json_encode(["error" => "Contract not accepted"]);
            exit;
        }
        $resolution = "Yes";
        $reasoning = "Mock Grok response based on public data";
        $timestamp = date("Y-m-d H:i:s");
        $query = "UPDATE contracts SET status = 'twist', resolution = '$resolution', 
                  resolutionDetails_reasoning = '$reasoning', resolutionDetails_timestamp = '$timestamp' 
                  WHERE id = '$id'";
        if (mysqli_query($conn, $query)) {
            echo json_encode(["success" => true, "message" => "Twist triggered! Grok resolved: Yes outcome."]);
        } else {
            http_response_code(500);
            echo json_encode(["error" => "Failed to trigger twist: " . mysqli_error($conn)]);
        }
    }

    else {
        http_response_code(400);
        echo json_encode(["error" => "Invalid action"]);
    }
}

else {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
}

mysqli_close($conn);
?>