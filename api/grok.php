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

$prompt = "Respond **ONLY** with valid JSON. No markdown, no code blocks, no explanations, no extra text. The response must start with { and end with }. All strings must be properly escaped.\n\n.
You are an expert validator for prediction market events on SettleInDash. You MUST create clear, neutral, Polymarket-style descriptions that are easy to objectively settle, using verifiable facts.

CRITICAL FIRST STEP – AGGRESSIVE SOURCE SEARCH & CONSENSUS BUILDING – ALWAYS DO THIS FIRST:
- Start by searching using the TITLE as primary query (outcomes and category).
- Gather facts (date, time, venue, competition, status).
- Use consensus to: fill gaps, correct minor errors (time offsets, venue), enhance description.
- Note main confirming domains in reasoning (no full URLs).


CRITICAL TIME CORRECTION RULES – FLEXIBLE CONSENSUS-BASED:
- Compare user-provided local time against consensus from sources.
- If user time matches consensus within ±15 min (accounting for timezone), return suggested_start_time = null.
- If variance >15 min but strong consensus exists, suggest corrected time in user's input format/timezone.
- For imminent/today events: rely heavily on aggregator/live preview sources; do NOT require sole official-site confirmation if multi-source agreement is clear.
- If no time consensus → set suggested to null and note uncertainty in timezone_note.


IMPROVED DESCRIPTION GUIDELINES – ADAPT TO CATEGORY \"$category\":
- Use searched facts/sources to enhance detials.
- Write in neutral, factual third-person language.
- Always include: event details (date, local time, location), precise resolution criteria (from sources), primary sources (domains/URLs), tie-breakers, edge cases.
- Keep concise (100–250 words), structured, verifiable.
- Tailor to category:
  - Politics/Elections: Polling close time, counting rules, certification date.
  - Weather: Measurement location/method, metric, time window.
  - Commodities/Stocks: Price metric, exchange, timestamp.
  - Sports: Competition/stage, venue, rules (regular time? overtime?).
  - Crypto: Asset/exchange, metric, timestamp (UTC).
  - Other: Adapt (e.g., awards: announcement time, academy site).
- If user description is good, enhance with facts/sources without changing meaning.
- Use BEST PRACTICES FOR RULES and RESOLUTION CRITERIA

CRITICAL TIME CORRECTION RULES – MUST FOLLOW:
- Always verify user's local time against searched sources/schedules.
- MUST suggest correct local time in user's timezone.
- Do NOT accept errors — correct using official data.
- Return suggested time as null if user's time is correct.
- When suggesting, return in SAME format/timezone as user input (e.g., \"2026-01-20T21:00\") and include timezone name.

User's browser timezone: $user_timezone

Event details:
- Title: \"$title\"
- Category: \"$category\"
- Start (local): \"$event_start_local\" ({$event_start_timezone})
- Expected Finish (local): " . ($expected_finish_local ? "\"$expected_finish_local\" ({$expected_finish_timezone})" : "Not specified") . "
- Possible Outcomes: " . implode(", ", $outcomes) . "
- User Description: \"$description\"

Task:
1. Gather/verify facts for the event searching the internet
2. Validate and correct times if needed
3. Check clarity, resolvability, verifiability
4. Create improved description optimized for easy settlement

Respond ONLY with valid JSON:
{
  \"is_valid\": boolean,
  \"reasoning\": \"short explanation – always reference local time and resolvability\",
  \"improved_description\": \"neutral, precise, Polymarket-style market description\",
  \"suggested_start_time\": \"YYYY-MM-DDTHH:mm (local time string in the user's timezone) or null\",
  \"suggested_start_timezone\": \"IANA timezone name matching user's input (e.g. Europe/Paris, America/Chicago, Asia/Tokyo) or null\",
  \"suggested_finish_time\": \"YYYY-MM-DDTHH:mm (local time string) or null\",
  \"suggested_finish_timezone\": \"same IANA timezone as user input or null\",
  \"timezone_note\": \"string or null\"
}

Be practical for real-world prediction markets: prioritize strong multi-source consensus over perfect official-site coverage. Strict on ambiguity/resolution clarity, flexible on schedule verification when sources align.";

$payload = [
    "model" => "grok-4-1-fast-reasoning",
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
    debug_log("Grok API call failed - HTTP $httpCode");
    http_response_code(502);
    echo json_encode(["error" => "Grok API error"]);
    exit;
}

$data = json_decode($response, true);

if (!isset($data['choices'][0]['message']['content'])) {
    debug_log("No content in Grok response - full: " . json_encode($data));
    http_response_code(502);
    echo json_encode(["error" => "Invalid Grok response structure"]);
    exit;
}

$content = trim($data['choices'][0]['message']['content'] ?? '');

// ─── CRITICAL DEBUGGING ───
debug_log("Raw Grok output (first 1500 chars): " . substr($content, 0, 1500));

try {
    $result = json_decode($content, true);

    if (json_last_error() !== JSON_ERROR_NONE) {
        debug_log("JSON decode FAILED: " . json_last_error_msg() . " | Raw: " . substr($content, 0, 1000));
        throw new Exception("Invalid JSON from Grok");
    }

    if (!is_array($result) || !isset($result['is_valid'])) {
        debug_log("Missing required fields in response");
        throw new Exception("Missing required fields");
    }

    // Now log the successful parsed result
    debug_log("Grok full parsed response: " . json_encode($result, JSON_PRETTY_PRINT));

    $result['improved_description'] ??= $description;
    $result['suggested_start_time'] ??= null;
    $result['suggested_finish_time'] ??= null;
    $result['timezone_note'] ??= null;

    echo json_encode($result);
} catch (Exception $e) {
    debug_log("Grok parse error: " . $e->getMessage());
    http_response_code(502);
    echo json_encode(["error" => "Invalid Grok format", "details" => $e->getMessage()]);
    exit;
}