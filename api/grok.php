<?php
// api/grok.php - CLEAN VERSION (requires new local+timezone fields)

function debug_log($msg) {
    file_put_contents(__DIR__ . '/grok_debug.log', date('Y-m-d H:i:s') . " - " . $msg . PHP_EOL, FILE_APPEND | LOCK_EX);
}

debug_log("=== grok.php started ===");
debug_log("RAW INPUT: " . file_get_contents('php://input'));

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: https://settleindash.com');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    debug_log("Error: Not POST");
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || !is_array($input)) {
    debug_log("Invalid input");
    http_response_code(400);
    echo json_encode(["error" => "Invalid JSON input"]);
    exit;
}

require_once __DIR__ . '/../config/config.php';

if (!defined('XAI_API_KEY')) {
    debug_log("FATAL: XAI_API_KEY not defined!");
    http_response_code(500);
    echo json_encode(["error" => "Server config error"]);
    exit;
}

// ─── Extract NEW fields only ───
$title                = trim($input['title'] ?? '');
$category             = trim($input['category'] ?? '');
$event_start_local    = trim($input['event_start_local'] ?? '');
$event_start_timezone = trim($input['event_start_timezone'] ?? '');
$expected_finish_local = trim($input['expected_finish_local'] ?? '');
$expected_finish_timezone = trim($input['expected_finish_timezone'] ?? $event_start_timezone);
$description          = trim($input['description'] ?? '');
$possible_outcomes    = $input['possible_outcomes'] ?? [];
$user_timezone        = trim($input['user_timezone'] ?? 'UTC');

debug_log("Fields: start_local='$event_start_local' tz='$event_start_timezone'");

// === VALIDATION ===
$missing = [];
if (empty($title)) $missing[] = "title";
if (empty($category)) $missing[] = "category";
if (empty($event_start_local)) $missing[] = "event_start_local";
if (empty($event_start_timezone)) $missing[] = "event_start_timezone";
if (empty($description)) $missing[] = "description";
if (count($possible_outcomes) < 2) $missing[] = "at least 2 outcomes";

if (!empty($missing)) {
    echo json_encode([
        "is_valid" => false,
        "reasoning" => "Missing required fields: " . implode(", ", $missing),
        "improved_description" => $description
    ]);
    exit;
}

// ─── Parse start time as local ───
try {
    $tz = new DateTimeZone($event_start_timezone);
    $start_local = new DateTimeImmutable($event_start_local, $tz);
    $start_obj   = $start_local->setTimezone(new DateTimeZone('UTC'));
    $start_mysql = $start_obj->format('Y-m-d H:i:s');
} catch (Exception $e) {
    debug_log("ERROR: Invalid start time - " . $e->getMessage());
    http_response_code(400);
    echo json_encode(["error" => "Invalid event start date/time or timezone"]);
    exit;
}

// Future check
$now = new DateTimeImmutable('now', new DateTimeZone('UTC'));
if ($start_obj <= $now->modify('+5 minutes')) {
    http_response_code(400);
    echo json_encode(["error" => "Event must be at least 5 minutes in the future"]);
    exit;
}

// ─── Parse expected finish (optional) ───
$finish_obj = null;
if ($expected_finish_local) {
    try {
        $tz_finish = new DateTimeZone($expected_finish_timezone);
        $finish_local = new DateTimeImmutable($expected_finish_local, $tz_finish);
        $finish_obj = $finish_local->setTimezone(new DateTimeZone('UTC'));

        if ($finish_obj <= $start_obj) {
            http_response_code(400);
            echo json_encode(["error" => "Expected finish must be after start time"]);
            exit;
        }
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid expected finish date/time or timezone"]);
        exit;
    }
}

// Normalize outcomes
$outcomes = array_filter(array_map('trim', (array)$possible_outcomes), 'strlen');
if (count($outcomes) < 2) {
    echo json_encode([
        "is_valid" => false,
        "reasoning" => "At least 2 non-empty possible outcomes are required.",
        "improved_description" => $description
    ]);
    exit;
}

// ─── Prompt ───
$prompt = "You are an expert validator for prediction market events on SettleInDash and should write a describe that make it easy to settle what was the correct outcome when the event is finished.

SUGGESTED TIME FORMAT – VERY IMPORTANT:
- If you want to suggest a corrected start or finish time, return it **in the same timezone as the user input** (i.e. the timezone you received in event_start_timezone / expected_finish_timezone)
- Return the time as a simple ISO-like string without Z, e.g. \"2026-01-20T21:00\" 
- Also include the timezone name in the response so frontend knows it
- Example: if user input was in Europe/Copenhagen, suggest \"2026-01-20T21:00\" in Europe/Copenhagen


User's browser timezone: $user_timezone

Event details:
- Title: \"$title\"
- Category: \"$category\"
- Start (local): \"$event_start_local\" ({$event_start_timezone})
- Expected Finish (local): " . ($expected_finish_local ? "\"$expected_finish_local\" ({$expected_finish_timezone})" : "Not specified") . "
- Outcomes: " . implode(", ", $outcomes) . "
- Description: \"$description\"

Task:
1. Validate using the local times above
2. Check clarity, resolvability, verifiability
3. Suggest corrections in UTC ISO if needed
4. Improve description

Respond ONLY with JSON:
{
  \"is_valid\": boolean,
  \"reasoning\": \"short text – mention local time\",
  \"improved_description\": \"string\",
  \"suggested_start_time\": \"YYYY-MM-DDTHH:mm\" or null,
  \"suggested_start_timezone\": \"Europe/Copenhagen\" or null,
  \"suggested_finish_time\": \"YYYY-MM-DDTHH:mm\" or null,
  \"suggested_finish_timezone\": \"Europe/Copenhagen\" or null,
  \"timezone_note\": \"string or null\
}";

$payload = [
    "model" => "grok-3",
    "messages" => [["role" => "user", "content" => $prompt]],
    "max_tokens" => 600,
    "temperature" => 0.3
];

$ch = curl_init("https://api.x.ai/v1/chat/completions");
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_HTTPHEADER => [
        "Content-Type: application/json",
        "Authorization: Bearer " . XAI_API_KEY
    ],
    CURLOPT_POSTFIELDS => json_encode($payload),
    CURLOPT_TIMEOUT => 45
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200 || !$response) {
    http_response_code(502);
    echo json_encode(["error" => "Grok API error"]);
    exit;
}

$data = json_decode($response, true);
$content = trim($data['choices'][0]['message']['content'] ?? '');

try {
    $result = json_decode($content, true);
    if (!is_array($result) || !isset($result['is_valid'])) {
        throw new Exception("Invalid response");
    }
    $result['improved_description'] ??= $description;
    $result['suggested_start_time'] ??= null;
    $result['suggested_finish_time'] ??= null;
    $result['timezone_note'] ??= null;

    echo json_encode($result);
} catch (Exception $e) {
    http_response_code(502);
    echo json_encode(["error" => "Invalid Grok format"]);
}