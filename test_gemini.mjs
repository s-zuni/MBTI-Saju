import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = "AIzaSyCHnto6h-UThCVTRQ9f7ctM1ECrnmnwRWU"; // From User Rules
const MODELS = [
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite-preview"
];

async function testModel(modelName) {
    console.log(`Testing model: ${modelName}...`);
    const genAI = new GoogleGenerativeAI(API_KEY);
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const result = await model.generateContent("Hello, are you there? Response with 'OK' if you are.");
        const text = result.response.text();
        console.log(`[${modelName}] Success: ${text.trim()}`);
        return true;
    } catch (error) {
        console.error(`[${modelName}] Failed: ${error.message}`);
        return false;
    }
}

async function runTests() {
    for (const model of MODELS) {
        await testModel(model);
        console.log('---');
    }
}

runTests();
