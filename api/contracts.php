<?php
// api/contracts.php
// API to manage contracts in the MariaDB database for a betting application.
// Supports GET (retrieve contracts), POST (create contract), and PUT (accept, settle, resolve_twist with xAI Grok API).

// Include database and Grok API configurations
require_once "../config/config.php";
require_once "grok.php";

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

// Current server time
$currentDateTime = date('Y-m-d H:i:s');

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

    try {
        $time = (new DateTime($time))->format('Y-m-d H:i:s');
        $acceptanceDeadline = (new DateTime($acceptanceDeadline))->format('Y-m-d H:i:s');
    } catch (Exception $e) {
        error_log("POST: Invalid datetime format - " . $e->getMessage());
        http_response_code(400);
        echo json_encode(["error" => "Invalid datetime format: " . $e->getMessage()]);
        exit;
    }

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
        echo json_encode(["error" => "Time must be a valid date and after the current time"]);
        exit;
    }
    if (!strtotime($acceptanceDeadline) || strtotime($acceptanceDeadline) <= strtotime($currentDateTime)) {
        error_log("POST: Validation failed - Invalid or past acceptance deadline");
        http_response_code(400);
        echo json_encode(["error" => "Acceptance deadline must be a valid date and after the current time"]);
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
        $submitterEmail = $data["submitterEmail"];
        $winnerEmail = $data["winnerEmail"];
        $reasoning = $data["reasoning"] ?? "";
        if ($contract["status"] !== "accepted") {
            error_log("PUT: Contract not accepted, ID: $id");
            http_response_code(400);
            echo json_encode(["error" => "Contract not accepted"]);
            exit;
        }
        if (!filter_var($submitterEmail, FILTER_VALIDATE_EMAIL)) {
            error_log("PUT: Validation failed - Invalid submitter email");
            http_response_code(400);
            echo json_encode(["error" => "Please provide a valid submitter email address"]);
            exit;
        }
        if ($submitterEmail !== $contract["email"] && $submitterEmail !== $contract["accepterEmail"]) {
            error_log("PUT: Unauthorized - Submitter must be creator or accepter, ID: $id");
            http_response_code(403);
            echo json_encode(["error" => "Unauthorized: Only creator or accepter can submit settlement"]);
            exit;
        }
        if ($winnerEmail !== "tie" && $winnerEmail !== $contract["email"] && $winnerEmail !== $contract["accepterEmail"]) {
            error_log("PUT: Validation failed - Invalid winner email, must be creator, accepter, or 'tie'");
            http_response_code(400);
            echo json_encode(["error" => "Winner must be creator, accepter, or 'tie'"]);
            exit;
        }

        // Store winner choice and reasoning
        $fieldPrefix = $submitterEmail === $contract["email"] ? "creator" : "accepter";
        $stmt = mysqli_prepare($conn, "UPDATE contracts SET ${fieldPrefix}_winner_choice = ?, ${fieldPrefix}_winner_reasoning = ? WHERE id = ?");
        mysqli_stmt_bind_param($stmt, "sss", $winnerEmail, $reasoning, $id);
        if (!mysqli_stmt_execute($stmt)) {
            error_log("PUT: Failed to store winner choice - " . mysqli_error($conn));
            http_response_code(500);
            echo json_encode(["error" => "Failed to store winner choice: " . mysqli_error($conn)]);
            exit;
        }
        mysqli_stmt_close($stmt);

        // Check if both parties have submitted
        $query = "SELECT creator_winner_choice, accepter_winner_choice FROM contracts WHERE id = ?";
        $stmt = mysqli_prepare($conn, $query);
        mysqli_stmt_bind_param($stmt, "s", $id);
        mysqli_stmt_execute($stmt);
        $result = mysqli_stmt_get_result($stmt);
        $choices = mysqli_fetch_assoc($result);
        mysqli_stmt_close($stmt);

        if ($choices["creator_winner_choice"] && $choices["accepter_winner_choice"]) {
            // Both have submitted
            if ($choices["creator_winner_choice"] === $choices["accepter_winner_choice"]) {
                // Agreement: Settle the contract
                $payout = $choices["creator_winner_choice"] === "tie" ? "Split" : ($choices["creator_winner_choice"] === $contract["email"] ? $contract["stake"] * 0.97 : $contract["stake"] * 0.95);
                $stmt = mysqli_prepare($conn, "UPDATE contracts SET status = 'settled', winner = ? WHERE id = ?");
                mysqli_stmt_bind_param($stmt, "ss", $choices["creator_winner_choice"], $id);
                if (mysqli_stmt_execute($stmt)) {
                    $message = $choices["creator_winner_choice"] === "tie" ? "Contract settled as a tie!" : "Contract settled! {$choices["creator_winner_choice"]} receives $payout DASH.";
                    error_log("PUT: Contract settled successfully - ID: $id, Winner: {$choices["creator_winner_choice"]}");
                    echo json_encode(["success" => true, "message" => $message, "contract" => array_merge($contract, ["status" => "settled", "winner" => $choices["creator_winner_choice"]])]);
                } else {
                    error_log("PUT: Failed to settle contract - " . mysqli_error($conn));
                    http_response_code(500);
                    echo json_encode(["error" => "Failed to settle contract: " . mysqli_error($conn)]);
                }
                mysqli_stmt_close($stmt);
            } else {
                // Disagreement: Create twist
                $stmt = mysqli_prepare($conn, "UPDATE contracts SET status = 'twist' WHERE id = ?");
                mysqli_stmt_bind_param($stmt, "s", $id);
                if (mysqli_stmt_execute($stmt)) {
                    error_log("PUT: Twist created due to disagreement - ID: $id");
                    echo json_encode(["success" => true, "message" => "Twist created due to disagreement between creator and accepter.", "contract" => array_merge($contract, ["status" => "twist"])]);
                } else {
                    error_log("PUT: Failed to create twist - " . mysqli_error($conn));
                    http_response_code(500);
                    echo json_encode(["error" => "Failed to create twist: " . mysqli_error($conn)]);
                }
                mysqli_stmt_close($stmt);
            }
        } else {
            // Only one party has submitted
            error_log("PUT: Settlement submission recorded - ID: $id, Submitter: $submitterEmail");
            echo json_encode(["success" => true, "message" => "Settlement submission recorded. Waiting for other party's submission.", "contract" => array_merge($contract, ["${fieldPrefix}_winner_choice" => $winnerEmail, "${fieldPrefix}_winner_reasoning" => $reasoning])]);
        }
    }

    elseif ($action === "resolve_twist") {
        if ($contract["status"] !== "twist") {
            error_log("PUT: Contract not in twist state, ID: $id");
            http_response_code(400);
            echo json_encode(["error" => "Contract not in twist state"]);
            exit;
        }

        // Call xAI Grok API to resolve the twist
        $grokResult = resolveTwistWithGrok(
            $contract,
            $contract["creator_winner_choice"],
            $contract["accepter_winner_choice"],
            $contract["creator_winner_reasoning"],
            $contract["accepter_winner_reasoning"]
        );

        if (isset($grokResult["error"])) {
            error_log("PUT: Grok API error - ID: $id, Error: {$grokResult["error"]}");
            http_response_code(500);
            echo json_encode(["error" => $grokResult["error"]]);
            exit;
        }

        $winner = $grokResult["winner"];
        $reasoning = $grokResult["reasoning"];
        if ($winner !== "tie" && $winner !== $contract["email"] && $winner !== $contract["accepterEmail"]) {
            error_log("PUT: Invalid winner from Grok API - ID: $id, Winner: $winner");
            http_response_code(400);
            echo json_encode(["error" => "Invalid winner from Grok API"]);
            exit;
        }

        $payout = $winner === "tie" ? "Split" : ($winner === $contract["email"] ? $contract["stake"] * 0.97 : $contract["stake"] * 0.95);
        $timestamp = date("Y-m-d H:i:s");
        $stmt = mysqli_prepare($conn, "UPDATE contracts SET status = 'settled', winner = ?, resolutionDetails_reasoning = ?, resolutionDetails_timestamp = ? WHERE id = ?");
        mysqli_stmt_bind_param($stmt, "ssss", $winner, $reasoning, $timestamp, $id);
        if (mysqli_stmt_execute($stmt)) {
            $message = $winner === "tie" ? "Twist resolved as a tie by Grok API!" : "Twist resolved by Grok API! $winner receives $payout DASH.";
            error_log("PUT: Twist resolved successfully - ID: $id, Winner: $winner");
            echo json_encode(["success" => true, "message" => $message, "contract" => array_merge($contract, ["status" => "settled", "winner" => $winner, "resolutionDetails_reasoning" => $reasoning, "resolutionDetails_timestamp" => $timestamp])]);
        } else {
            error_log("PUT: Failed to resolve twist - " . mysqli_error($conn));
            http_response_code(500);
            echo json_encode(["error" => "Failed to resolve twist: " . mysqli_error($conn)]);
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