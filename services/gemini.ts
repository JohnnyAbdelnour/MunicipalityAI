import { GoogleGenAI, Chat, GenerateContentResponse, Part } from "@google/genai";
import { ModelType, Attachment, KBDocument } from "../types";

// Helper to create a delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Default System Instruction
const BASE_PERSONA = `- You are a helpful and friendly 'AI Assistant' named 'Zan' who is a representative of the municipality of Zane. You always respond in first person as 'I' when talking about yourself or the municipality.
- You always provide information and answers in a clear and concise manner only based on the knowledge sources offered.
- Your task is to give one helpful answer to the user's question.
<output_format_instructions>
Always format your responses using valid markdown. 
    - Use headings, bullet points, and numbered lists where appropriate.
    - Ensure that all text is easy to read and well-structured.
    - Always enclose code snippets or quotes in appropriate markdown syntax.
    - Keep your answers small and focused, breaking down complex information into digestible parts.
    - Never break character.
    - Keep your answers small and concise and break down the large answers into small and easy-to-read paragraphs and bullet points. 
</output_format_instructions>
- the user may write in arabic, french, english and arabeezi writing languages or in a mix between all the languages so asses the given input and query accordingly.
- do not mention the knowledge source title or page
- **IMPORTANT**: The provided knowledge base documents are for your internal reasoning only. The user cannot see these files. 
- Do NOT refer to "the document", "the provided text", "the file", "the PDF", or specific filenames. Answer as if this knowledge is your own general knowledge as the Municipality representative.
- Do NOT say "attached is the form" or "refer to the attachment" or "download the file below" as you CANNOT send files to the user. You must extract the relevant info (requirements, steps, fees) and write it directly in the chat.
- **CRITICAL**: Do NOT start your response with "As a representative of...", "I am Zan...", "بصفتي ممثلًا لبلدية زان...", or similar introductions. Dive directly into the helpful answer.
- When the response is relevant to the user's query, directly addresses their intent, or appropriately moves the conversation forward—such as by asking clarifying questions or requesting additional information—it should offer a clear, complete, and contextually appropriate resolution. If further action is required, the response includes timely and relevant follow-up such as next steps, useful links, or confirmations. Throughout the exchange, the assistant remains consistent with prior context, handles any limitations gracefully, and ensures that the user's needs are met or clearly identifies what is required to proceed.`;

export class GeminiService {
  private ai: GoogleGenAI;
  private chatSession: Chat | null = null;
  private model: string;
  private currentSystemInstruction: string;

  constructor() {
    // API key is strictly from process.env.API_KEY
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    this.model = ModelType.FLASH;
    
    // Initialize with empty knowledge base - waiting for GitHub sync
    this.currentSystemInstruction = this.buildSystemInstruction("", "Pending Connection...");
  }

  private buildSystemInstruction(kbContent: string, sourceName: string): string {
    const kbSection = kbContent 
        ? `### CONNECTED KNOWLEDGE BASE (${sourceName})\nYou have read-access to the following specific documents.\nYou must ONLY use the information provided below to answer questions. If the answer is not in these files, state that the information is not currently available in the archives.\n\n${kbContent}`
        : `### NO KNOWLEDGE BASE CONNECTED\nYou do not currently have access to specific municipal documents. Please ask the user to sync the repository.`;

    // Removed explicit citation rules to comply with "do not mention knowledge source title or page"
    return `${BASE_PERSONA}\n\n${kbSection}`;
  }

  public initChat() {
    this.chatSession = this.ai.chats.create({
      model: this.model,
      config: {
        systemInstruction: this.currentSystemInstruction,
      },
    });
  }

  /**
   * Updates the knowledge base context dynamically.
   * Useful when switching from Mock Drive to Real GitHub Repo.
   */
  public updateContext(docs: KBDocument[], sourceName: string) {
    const contextString = docs.map(doc => 
        `FILE: "${doc.name}" (Type: ${doc.type})\nCONTENT:\n${doc.content}\n-------------------`
    ).join('\n');

    this.currentSystemInstruction = this.buildSystemInstruction(contextString, sourceName);
    this.reset(); // Reset session to apply new system instruction
  }

  public async sendMessageStream(
    text: string,
    attachments: Attachment[],
    onChunk: (text: string) => void
  ): Promise<string> {
    if (!this.chatSession) {
      this.initChat();
    }

    if (!this.chatSession) {
      throw new Error("Failed to initialize chat session");
    }

    try {
      // Construct the message payload
      let messageInput: string | Part[] = text;

      if (attachments && attachments.length > 0) {
        const parts: Part[] = [];
        
        // Add text part if it exists
        if (text) {
            parts.push({ text: text });
        }

        // Add attachment parts
        attachments.forEach(att => {
            parts.push({
                inlineData: {
                    mimeType: att.mimeType,
                    data: att.data
                }
            });
        });
        messageInput = parts;
      }

      const resultStream = await this.chatSession.sendMessageStream({
        message: messageInput,
      });

      let fullText = "";

      for await (const chunk of resultStream) {
        const c = chunk as GenerateContentResponse;
        const textChunk = c.text;
        if (textChunk) {
          fullText += textChunk;
          onChunk(textChunk);
        }
      }

      return fullText;
    } catch (error) {
      console.error("Error in sendMessageStream:", error);
      throw error;
    }
  }

  public reset() {
    this.chatSession = null;
    this.initChat();
  }
}

export const geminiService = new GeminiService();