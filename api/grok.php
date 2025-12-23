<?php
// api/grok.php
// Dedicated endpoint for Grok event validation — called from CreateEvent.jsx

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: https://settleindash.com');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed"]);
    exit;
}

// Read JSON input
$input = json_decode(file_get_contents('php://input'), true);
if (!$input || !isset($input['title'], $input['category'], $input['event_date'], $input['possible_outcomes'], $input['description'])) {
    http_response_code(400);
    echo json_encode(["error" => "Missing required fields"]);
    exit;
}

// Load your config (contains XAI_API_KEY)
require_once __DIR__ . '/../config/config.php';

$title = trim($input['title']);
$category = trim($input['category']);
$eventDate = trim($input['event_date']);
$outcomes = $input['possible_outcomes'];
$description = trim($input['description']);

// Ensure outcomes is array
if (!is_array($outcomes)) {
    $decoded = json_decode($outcomes, true);
    $outcomes = is_array($decoded) ? $decoded : [];
}

if (count($outcomes) < 2) {
    echo json_encode([
        "is_valid" => false,
        "reasoning" => "At least 2 possible outcomes are required.",
        "improved_description" => $description,
        "timezone_note" => null
    ]);
    exit;
}

// Build prompt
$prompt = "You are an expert validator for prediction market events on SettleInDash.

Event details:
- Title: \"$title\"
- Category: \"$category\"
- Date & Time: \"$eventDate\" (assume UTC unless specified)
- Possible Outcomes: " . implode(", ", array_map('trim', $outcomes)) . "
- User Description: \"$description\"

Your task:
1. Is this event clear, objectively resolvable, and verifiable using public sources by the given date?
2. Are there any ambiguities (especially time zone, location, or judgment criteria)?
3. Provide a clear, improved description.

Respond ONLY with valid JSON in this exact format (no extra text):

{
  \"is_valid\": true or false,
  \"reasoning\": \"short explanation\",
  \"improved_description\": \"clear and precise description\",
  \"timezone_note\": \"clarification about time zone/location or null if clear\"
}

Be strict: reject events that are subjective, ambiguous, or not publicly verifiable.";

$payload = [
    "model" => "grok-beta",
    "messages" => [
        ["role" => "user", "content" => $prompt]
    ],
    "max_tokens" => 500,
    "temperature" => 0.3
];

$ch = curl_init("https://api.x.ai/v1/chat/completions");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    "Content-Type: application/json",
    "Authorization: Bearer " . XAI_API_KEY
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
curl_setopt($ch, CURLOPT_TIMEOUT, 30);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode !== 200 || !$response) {
    error_log("Grok API failed: HTTP $httpCode | Response: " . substr($response, 0, 500));
    echo json_encode(["error" => "Failed to contact Grok validator"]);
    exit;
}

$data = json_decode($response, true);

$content = trim($data['choices'][0]['message']['content'] ?? '');

if (!$content) {
    echo json_encode(["error" => "Empty response from Grok"]);
    exit;
}

try {
    $result = json_decode($content, true);

    if (!is_array($result) || !isset($result['is_valid'], $result['reasoning'], $result['improved_description'])) {
        throw new Exception("Invalid format");
    }

    // Ensure timezone_note exists
    $result['timezone_note'] = $result['timezone_note'] ?? null;

    echo json_encode($result);
} catch (Exception $e) {
    error_log("Grok response parse error: " . $e->getMessage() . " | Raw: " . $content);
    echo json_encode(["error" => "Invalid response from Grok validator"]);
}
?>