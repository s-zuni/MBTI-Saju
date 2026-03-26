/**
 * Cleans and parses a JSON string, handling Markdown code blocks and common AI response noise.
 * Handles the common Gemini issue of using real newlines inside JSON string values.
 * @param text The raw string response from AI
 * @returns Parsed JSON object or throws error
 */
export const cleanAndParseJSON = (text: string): any => {
    let cleaned = text.trim();
    try {
        // 1. Remove markdown code blocks if present
        const codeBlockRegex = /```(?:json|text)?\s*([\s\S]*?)\s*```/;
        const match = cleaned.match(codeBlockRegex);
        if (match && match[1]) {
            cleaned = match[1].trim();
        }

        // 2. Extract the block starting with { and ending with }
        const startIdx = cleaned.indexOf('{');
        const endIdx = cleaned.lastIndexOf('}');
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
            cleaned = cleaned.substring(startIdx, endIdx + 1);
        }

        // 3. First attempt: direct parse
        try {
            return JSON.parse(cleaned);
        } catch (_firstError) {
            // 4. Second attempt: fix real newlines inside JSON string values.
            // Gemini often puts actual newline characters inside "..." values.
            // Strategy: replace real newlines that appear inside quoted strings with \\n
            const fixed = fixNewlinesInJsonStrings(cleaned);
            try {
                return JSON.parse(fixed);
            } catch (_secondError) {
                // 5. Third attempt: aggressive approach - replace ALL newlines with \\n, 
                // then restore structural ones
                const aggressive = cleaned
                    .replace(/\r\n/g, '\n')
                    .replace(/\r/g, '\n')
                    .split('\n')
                    .map(line => line.trim())
                    .filter(line => line.length > 0)
                    .join(' ')
                    // Clean up spaces around JSON structural characters
                    .replace(/\s*([{}\[\]:,])\s*/g, '$1')
                    // But add back spaces after : and , for readability in values
                    .replace(/:/g, ': ')
                    .replace(/,/g, ', ');
                
                try {
                    return JSON.parse(aggressive);
                } catch (_thirdError) {
                    // 6. Final attempt: manually reconstruct by joining all lines
                    const singleLine = cleaned
                        .replace(/\r\n/g, '\\n')
                        .replace(/\r/g, '\\n')
                        .replace(/\n/g, '\\n');
                    return JSON.parse(singleLine);
                }
            }
        }
    } catch (error) {
        console.error("JSON Parse Failed. Raw Text:", text);
        const snippet = text.substring(0, 500) + (text.length > 500 ? "..." : "");
        throw new Error(`Failed to parse AI response as JSON. Error: ${error instanceof Error ? error.message : String(error)}. Raw response start: ${snippet}`);
    }
};

/**
 * Fixes real newlines inside JSON string values by replacing them with \\n.
 * Works by tracking whether we're inside a quoted string or not.
 */
function fixNewlinesInJsonStrings(json: string): string {
    const result: string[] = [];
    let inString = false;
    let escaped = false;

    for (let i = 0; i < json.length; i++) {
        const char = json[i]!;

        if (escaped) {
            result.push(char);
            escaped = false;
            continue;
        }

        if (char === '\\') {
            result.push(char);
            escaped = true;
            continue;
        }

        if (char === '"') {
            inString = !inString;
            result.push(char);
            continue;
        }

        // If we're inside a string and encounter a real newline, replace it
        if (inString && (char === '\n' || char === '\r')) {
            if (char === '\r' && i + 1 < json.length && json[i + 1] === '\n') {
                i++; // skip the \n in \r\n pair
            }
            result.push('\\n');
            continue;
        }

        result.push(char);
    }

    return result.join('');
}
