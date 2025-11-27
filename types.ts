
export interface Attachment {
  type: 'image' | 'file';
  mimeType: string;
  url: string; // Used for preview in UI
  data: string; // Base64 string for API
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  attachments?: Attachment[];
  isStreaming?: boolean;
  timestamp: number;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

export enum ModelType {
  FLASH = 'gemini-2.5-flash',
  PRO = 'gemini-3-pro-preview'
}

export interface KBDocument {
  id: string;
  name: string;
  type: 'pdf' | 'xlsx' | 'docx' | 'md' | 'txt' | 'json';
  lastModified?: string;
  content: string; // The text content extracted from the file
  source: 'github';
  url?: string;
}
