export enum ProfileStatus {
    Running = 'Running',
    Stopped = 'Stopped',
    Error = 'Error',
}

export interface BrowserProfile {
    id: string;
    name: string;
    proxy: string;
    userAgent: string;
    screenResolution: string;
    timezone: string;
    webRTC: 'Public' | 'Disabled';
    macAddress: string;
    cookies: string;
    status: ProfileStatus;
}

export enum MessageAuthor {
    User = 'user',
    AI = 'ai',
    System = 'system',
}

export interface ChatMessage {
    author: MessageAuthor;
    text: string;
    isLoading?: boolean;
}