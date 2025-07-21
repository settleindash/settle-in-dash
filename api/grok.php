<?php
// api/grok.php
// Handles calls to the xAI Grok API for resolving contract twists.

// Include configuration
require_once "../config/config.php";

// Enable error logging
ini_set('display_errors', 0);
ini_set('log_errors', 1);
ini_set('error_log', '../logs/php_errors.log');

// xAI Grok API configuration
define('XAI_API_URL', 'https://api.x.ai/v1/chat/completions');

// Function to call xAI Grok API for twist resolution
function resolveTwistWithGrok($contract, $creatorChoice, $accepterChoice, $creatorReasoning, $accepterReasoning) {
    $prompt = "You are an impartial arbitrator resolving a dispute for a betting contract. The contract question is: '{$contract['question']}'. "
            . "The creator chose: " . ($creatorChoice ?: "Not submitted") . " (Reasoning: " . ($creatorReasoning ?: "None") . "). "
            . "The accepter chose: " . ($accepterChoice ?: "Not submitted") . " (Reasoning: " . ($accepterReasoning ?: "None") . "). "
            . "Determine the winner (creator email: '{$contract['email']}', accepter email: '{$contract['accepterEmail']}', or 'tie'). "
            . "Provide a clear decision and reasoning. Return the result in JSON format: {\"winner\": \"email_or_tie\", \"reasoning\": \"explanation\"}.";

    $data = [
        "model" => "grok-beta",
        "messages" => [
            ["role" => "user", "content" => $prompt]
        ],
        "max_tokens" => 200,
        "temperature" => 0.7
    ];

    $ch = curl_init(XAI_API_URL);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: Bearer " . XAI_API_KEY,
        "Content-Type: application/json"
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200 || !$response) {
        error_log("Grok API call failed: HTTP $httpCode, Response: " . ($response ?: "No response"));
        return ["error" => "Failed to call Grok API"];
    }

    $result = json_decode($response, true);
    if (isset($result['choices'][0]['message']['content'])) {
        try {
            $grokResponse = json_decode($result['choices'][0]['message']['content'], true);
            if (!isset($grokResponse['winner']) || !isset($grokResponse['reasoning'])) {
                error_log("Grok API response missing required fields: " . json_encode($grokResponse));
                return ["error" => "Invalid Grok API response format"];
            }
            return [
                "winner" => $grokResponse['winner'],
                "reasoning" => $grokResponse['reasoning']
            ];
        } catch (Exception $e) {
            error_log("Grok API response parsing failed: " . $e->getMessage());
            return ["error" => "Invalid Grok API response format"];
        }
    }
    error_log("Grok API no valid response: " . json_encode($result));
    return ["error" => "No valid response from Grok API"];
}
?>