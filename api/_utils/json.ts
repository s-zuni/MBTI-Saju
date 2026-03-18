/**
 * Cleans and parses a JSON string, handling Markdown code blocks and common AI response noise.
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

        // 3. Attempt parsing. If it fails, it might be due to unescaped newlines in strings.
        try {
            return JSON.parse(cleaned);
        } catch (initialError) {
            // common issue: Gemini uses real newlines inside JSON string values.
            // This is a risky regex but often works for simple cases: 
            // Replace newlines that are NOT followed by a JSON structure character (like ", }, ])
            // Actually, let's try a safer approach: replace newlines with \n only if they are inside double quotes.
            // But that's complex. Let's try to just replace all newlines with \n and then fix THE JSON structure newlines back.
            // Alternatively, tell the AI more strictly to avoid them.
            
            // For now, let's just try to parse the raw block again without any extra stripping 
            // as sometimes the regex logic above might be too aggressive.
            const rawBlock = text.trim().substring(text.trim().indexOf('{'), text.trim().lastIndexOf('}') + 1);
            return JSON.parse(rawBlock);
        }
    } catch (error) {
        console.error("JSON Parse Failed. Raw Text:", text);
        const snippet = text.substring(0, 300) + (text.length > 300 ? "..." : "");
        throw new Error(`Failed to parse AI response as JSON. Error: ${error instanceof Error ? error.message : String(error)}. Raw response start: ${snippet}`);
    }
};
