/**
 * Cleans and parses a JSON string, handling Markdown code blocks.
 * @param text The raw string response from AI
 * @returns Parsed JSON object or throws error
 */
export const cleanAndParseJSON = (text: string): any => {
    try {
        // Remove markdown code blocks (```json ... ```, ```text ... ```, or just ``` ... ```)
        // This regex looks for the start ``` optionally followed by some characters, retrieves the content, and ignores the end ```
        let cleaned = text.trim();

        // Match ```[language] [content] ```
        const codeBlockRegex = /```(?:json|text)?\s*([\s\S]*?)\s*```/;
        const match = cleaned.match(codeBlockRegex);

        if (match && match[1]) {
            cleaned = match[1].trim();
        }

        return JSON.parse(cleaned);
    } catch (error) {
        console.error("JSON Parse Failed. Raw Text:", text);
        throw new Error("Failed to parse AI response as JSON.");
    }
};
