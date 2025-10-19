import { GoogleGenAI, Type, FunctionDeclaration, FunctionCall } from "@google/genai";
import { BrowserProfile, ProfileStatus } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  console.warn("API_KEY environment variable not set. AI features will not work.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

const generateContentWithRetry = async (prompt: string) => {
    if (!API_KEY) {
        return "API Key not configured.";
    }
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                temperature: 0.7,
                topP: 1,
                topK: 1,
            }
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return "Error generating content.";
    }
};

export const generateUserAgent = async (): Promise<string> => {
    const prompt = `Generate a single, realistic, and valid user agent string for a recent model of an Apple iPhone running a recent version of iOS. Only return the user agent string itself, with no extra text or explanation. Example: Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1`;
    return generateContentWithRetry(prompt);
};

export const generateMacAddress = async (): Promise<string> => {
    const prompt = `Generate a single, valid MAC address in the format XX:XX:XX:XX:XX:XX. Only return the MAC address itself, with no extra text or explanation.`;
    return generateContentWithRetry(prompt);
};

export const parseCookies = async (cookieString: string): Promise<string> => {
    if (!cookieString.trim()) {
        return "[]";
    }
    const prompt = `Parse the following raw cookie string into a JSON array of objects. Each object should have 'name', 'value', 'domain', 'path', 'expires', and 'secure' keys. If a value is missing, omit the key or set it to a sensible default (e.g., secure: false). The input string is: \n\n${cookieString}\n\nReturn only the valid JSON array.`;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            value: { type: Type.STRING },
                            domain: { type: Type.STRING },
                            path: { type: Type.STRING },
                            expires: { type: Type.STRING },
                            secure: { type: Type.BOOLEAN },
                        }
                    }
                }
            }
        });
        
        let jsonStr = response.text.trim();
        jsonStr = jsonStr.replace(/^```json\s*|```$/g, '').trim();
        const parsedJson = JSON.parse(jsonStr);
        return JSON.stringify(parsedJson, null, 2);

    } catch (error) {
        console.error("Error parsing cookies with Gemini:", error);
        return "Error: Could not parse cookies.";
    }
};

// --- AI Agent Service ---

const tools: FunctionDeclaration[] = [
    {
        name: 'launch_profile',
        description: 'Launches a browser window for a given profile name.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                profile_name: { type: Type.STRING, description: 'The name of the profile to launch.' },
            },
            required: ['profile_name'],
        },
    },
    {
        name: 'close_profile',
        description: 'Closes a running browser window for a given profile name.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                profile_name: { type: Type.STRING, description: 'The name of the running profile to close.' },
            },
            required: ['profile_name'],
        },
    },
    {
        name: 'navigate_url',
        description: 'Navigates a running browser profile to a specific URL.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                profile_name: { type: Type.STRING, description: 'The name of the running profile to navigate.' },
                url: { type: Type.STRING, description: 'The full URL to navigate to (e.g., "google.com").' },
            },
            required: ['profile_name', 'url'],
        },
    },
     {
        name: 'list_profiles',
        description: 'Lists all available browser profiles and their running status.',
        parameters: { type: Type.OBJECT, properties: {} },
    },
     {
        name: 'create_profile',
        description: 'Creates a new browser profile with a given name.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                profile_name: { type: Type.STRING, description: 'The desired name for the new profile.' },
            },
            required: ['profile_name'],
        },
    }
];


export const getAiAgentResponse = async (
    userInput: string,
    profiles: BrowserProfile[]
): Promise<{ text: string, functionCall?: FunctionCall }> => {
    if (!API_KEY) {
        return { text: "API Key not configured." };
    }

    const profileContext = profiles.map(p => `- "${p.name}" (Status: ${p.status})`).join('\n');
    const systemInstruction = `You are Aura, a helpful AI agent that controls a browser management application.
The user will give you commands to manage their browser profiles.
You can launch, close, navigate, list, and create profiles.
When a user asks to navigate, infer the full URL (e.g., 'google' becomes 'https://google.com').
Here is the current list of profiles and their status:
${profileContext}

Only use the functions provided to you. If the user asks something you cannot do, respond conversationally.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text: userInput }] }],
            config: {
                systemInstruction,
                tools: [{ functionDeclarations: tools }],
            },
        });
        
        return {
            text: response.text,
            functionCall: response.functionCalls?.[0],
        };

    } catch (error) {
        console.error("Error calling Gemini for AI Agent:", error);
        return { text: "Sorry, I encountered an error. Please try again." };
    }
};