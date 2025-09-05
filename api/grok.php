<?php
// api/grok.php
// Handles calls to the xAI Grok API for resolving contract twists and event validation.

// Prevent direct access
if (!defined('SECURE_ACCESS')) {
    http_response_code(403);
    exit('Direct access forbidden');
}

define('SECURE_ACCESS', true);
require_once dirname(__DIR__) . '/config/config.php';

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
        "Content-Type": "application/json"
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
            $winner = $grokResponse['winner'];
            $reasoning = $grokResponse['reasoning'];

            // Determine payout address
            $payoutAddress = $winner === $contract['email'] ? $contract['WalletAddress'] : 
                            ($winner === $contract['accepterEmail'] ? $contract['accepterWalletAddress'] : null);
            if ($payoutAddress) {
                $amount = $contract['stake'] + ($contract['accepter_stake'] ?? 0); // Total payout
                $network = defined('NETWORK') ? NETWORK : 'testnet';
                $privateKey = ORACLE_KEYPAIRS[$network]['private_key'];
                $signedTx = signMultisigPayout($contract['multisig_address'], $payoutAddress, $amount, $privateKey);
                if (isset($signedTx['error'])) {
                    return ["error" => $signedTx['error']];
                }
                return [
                    "winner" => $winner,
                    "reasoning" => $reasoning,
                    "signed_transaction" => $signedTx
                ];
            }
            return [
                "winner" => $winner,
                "reasoning" => $reasoning
            ];
        } catch (Exception $e) {
            error_log("Grok API response parsing failed: " . $e->getMessage());
            return ["error" => "Invalid Grok API response format"];
        }
    }
    error_log("Grok API no valid response: " . json_encode($result));
    return ["error" => "No valid response from Grok API"];
}

// Function to validate events with Grok
function validateEventWithGrok($eventData) {
    $prompt = "You are an AI validator for betting events. Validate the following event for clarity, verifiability, and judgability: "
             . "Title: '{$eventData['title']}'. "
             . "Category: '{$eventData['category']}'. "
             . "Event Date: '{$eventData['event_date']}'. "
             . "Possible Outcomes: '" . implode(", ", json_decode($eventData['possible_outcomes'], true)) . "'. "
             . "Determine if the event is valid (clear, verifiable, and objectively judgable by the event date). "
             . "Return the result in JSON format: {\"is_valid\": boolean, \"reasoning\": \"explanation\"}.";

    $data = [
        "model" => "grok-beta",
        "messages" => [
            ["role" => "user", "content" => $prompt]
        ],
        "max_tokens" => 200,
        "temperature" => 0.5
    ];

    $ch = curl_init(XAI_API_URL);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        "Authorization: Bearer " . XAI_API_KEY,
        "Content-Type": "application/json"
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($httpCode !== 200 || !$response) {
        error_log("Grok API call failed for event validation: HTTP $httpCode, Response: " . ($response ?: "No response"));
        return ["error" => "Failed to call Grok API"];
    }

    $result = json_decode($response, true);
    if (isset($result['choices'][0]['message']['content'])) {
        try {
            $grokResponse = json_decode($result['choices'][0]['message']['content'], true);
            if (!isset($grokResponse['is_valid']) || !isset($grokResponse['reasoning'])) {
                error_log("Grok API response missing required fields: " . json_encode($grokResponse));
                return ["error" => "Invalid Grok API response format"];
            }
            return [
                "is_valid" => $grokResponse['is_valid'],
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

// Function to sign multisig payout using Dash node
function signMultisigPayout($multisigAddress, $destinationAddress, $amount, $privateKey) {
    try {
        // Fetch UTXO for multisig_address
        $utxoJson = shell_exec("dash-cli -testnet listunspent 0 9999 '[\"$multisigAddress\"]'");
        $utxos = json_decode($utxoJson, true);
        if (empty($utxos)) {
            error_log("No UTXOs found for multisig address: $multisigAddress");
            return ["error" => "No funds available in multisig address"];
        }
        $utxo = $utxos[0]; // Use first UTXO (simplified for testing)
        $txid = $utxo['txid'];
        $vout = $utxo['vout'];
        $amountIn = $utxo['amount'] * 1e8; // Convert DASH to duffs

        // Adjust amount for fees (simplified, use actual fee calculation)
        $amountOut = $amount * 1e8; // Convert to duffs
        if ($amountOut > $amountIn) {
            error_log("Insufficient funds in multisig address: $multisigAddress, required: $amountOut, available: $amountIn");
            return ["error" => "Insufficient funds in multisig address"];
        }

        // Create raw transaction
        $txHex = shell_exec("dash-cli -testnet createrawtransaction '[{\"txid\":\"$txid\",\"vout\":$vout}]' '[{\"$destinationAddress\":$amountOut}]'");
        if (!$txHex) {
            error_log("Failed to create raw transaction for multisig address: $multisigAddress");
            return ["error" => "Failed to create transaction"];
        }

        // Sign with oracle private key
        $signedTx = shell_exec("dash-cli -testnet signrawtransactionwithkey " . escapeshellarg(trim($txHex)) . " '[\"$privateKey\"]' '[{\"txid\":\"$txid\",\"vout\":$vout,\"scriptPubKey\":\"{$utxo['scriptPubKey']}\",\"amount\":$amountIn}]'");
        $result = json_decode($signedTx, true);
        if ($result['complete']) {
            return $result['hex'];
        }
        error_log("Multisig signing failed: " . json_encode($result));
        return ["error" => "Failed to sign multisig transaction"];
    } catch (Exception $e) {
        error_log("Multisig signing failed: " . $e->getMessage());
        return ["error" => "Failed to sign multisig transaction"];
    }
}
?>