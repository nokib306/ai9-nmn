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

export const getGeoDataFromIp = async (ip: string): Promise<{ timezone: string; language: string; } | null> => {
    if (!API_KEY) {
        console.error("API Key not configured.");
        return null;
    }
    const prompt = `Based on the IP address "${ip}", provide the most likely geographic data in a JSON object. The object must have these exact keys: "timezone" (e.g., "America/New_York") and "language" (e.g., "en-US"). Return only the raw JSON object.`;
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        timezone: { type: Type.STRING },
                        language: { type: Type.STRING },
                    }
                }
            }
        });
        let jsonStr = response.text.trim();
        jsonStr = jsonStr.replace(/^```json\s*|```$/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Error fetching geo data from IP:", error);
        return null;
    }
};

export const generateFullFingerprint = async (profileName: string): Promise<Partial<BrowserProfile> | null> => {
    if (!API_KEY) {
        console.error("API Key not configured.");
        return null;
    }
    const prompt = `Generate a complete and consistent browser fingerprint for a modern, high-end mobile device. The device name should be based on the profile name "${profileName}". The output must be a single JSON object with these exact keys: "userAgent" (string), "screenResolution" (string, e.g., "390x844"), "cpuCores" (number, 10), "memory" (number, 8), "webGLVendor" (string, "Google Inc. (Apple)"), "webGLRenderer" (string, "Apple GPU"), "macAddress" (string), "deviceName" (string, based on profileName). Return only the raw JSON object.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        userAgent: { type: Type.STRING },
                        screenResolution: { type: Type.STRING },
                        cpuCores: { type: Type.INTEGER },
                        memory: { type: Type.INTEGER },
                        webGLVendor: { type: Type.STRING },
                        webGLRenderer: { type: Type.STRING },
                        macAddress: { type: Type.STRING },
                        deviceName: { type: Type.STRING },
                    }
                }
            }
        });
        let jsonStr = response.text.trim();
        jsonStr = jsonStr.replace(/^```json\s*|```$/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Error generating full fingerprint:", error);
        return null;
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
        name: 'search_web',
        description: 'Searches the web to answer questions about current events or topics that require up-to-date information.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                query: { type: Type.STRING, description: 'The search query to find information about.' },
            },
            required: ['query'],
        },
    },
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
        name: 'launch_and_navigate_profile',
        description: 'Launches a profile and navigates it to a specific URL in one step.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                profile_name: { type: Type.STRING, description: 'The name of the profile to launch.' },
                url: { type: Type.STRING, description: 'The URL to navigate to after launching (e.g., "whoer.com").' },
            },
            required: ['profile_name', 'url'],
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
        description: 'Navigates a *running* browser profile to a specific URL.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                profile_name: { type: Type.STRING, description: 'The name of the *running* profile to navigate.' },
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
        description: 'Creates a new browser profile with a given name, optionally with a proxy.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                profile_name: { type: Type.STRING, description: 'The desired name for the new profile.' },
                proxy: { type: Type.STRING, description: 'The proxy to assign to the profile (e.g., "ip:port:user:pass").' }
            },
            required: ['profile_name'],
        },
    }
];

export const searchWeb = async (query: string): Promise<string> => {
    if (!API_KEY) {
        return "API Key not configured.";
    }
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: [{ parts: [{ text: query }] }],
            config: {
                tools: [{ googleSearch: {} }],
            },
        });

        const answer = response.text;
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        const sources: string[] = Array.from(new Set(
             groundingChunks
            .map((chunk: any) => chunk.web)
            .filter(Boolean)
            .map((web: any) => `[${web.title}](${web.uri})`)
        ));
        
        if (sources.length > 0) {
            return `${answer}\n\nSources:\n${sources.join('\n')}`;
        }
        return answer;
    } catch (error) {
        console.error("Error with Google Search grounding:", error);
        return "Sorry, I couldn't search the web right now.";
    }
};


export const getAiAgentResponse = async (
    userInput: string,
    profiles: BrowserProfile[]
): Promise<{ text: string, functionCall?: FunctionCall }> => {
    if (!API_KEY) {
        return { text: "API Key not configured." };
    }

    const profileContext = profiles.length > 0
        ? profiles.map(p => `- "${p.name}" (Status: ${p.status})`).join('\n')
        : "No profiles have been created yet.";
        
    const systemInstruction = `You are Aura, a helpful and slightly conversational AI agent that controls a browser management application.
Your primary goal is to assist the user by executing commands using the provided tools.

**Your Capabilities:**
- **Search the Web:** You can answer questions on any topic by searching the web. This is for general knowledge, current events, etc.
- **Create Profile:** You can create new profiles. You can also assign a proxy during creation.
- **Launch & Navigate:** You can launch a profile and navigate it to a URL in a single command.
- **Launch Only:** You can launch a profile without navigating.
- **Navigate Only:** You can navigate an already running profile to a new URL.
- **Close Profile:** You can close a running profile.
- **List Profiles:** You can list all existing profiles and their status.

**Important Rules:**
1.  **Be Conversational First:** Before executing a tool, provide a short, friendly confirmation. For example, "Okay, launching the 'Work' profile for you." or "Sure, I'll look that up for you."
2.  **Use the Right Tool:** Use 'search_web' for questions. Use profile tools for managing profiles. Prefer 'launch_and_navigate_profile' if the user wants to launch a profile and go to a site.
3.  **Current Profile State:** Here is the current list of profiles and their status. Use this to inform your decisions.
${profileContext}

Only use the functions provided to you. If the user asks something you cannot do, respond conversationally and explain your limitations.`;

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