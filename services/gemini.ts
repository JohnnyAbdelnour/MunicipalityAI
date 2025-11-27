import { GoogleGenAI, Chat, GenerateContentResponse, Part } from "@google/genai";
import { ModelType, Attachment } from "../types";
import { MUNICIPAL_DOCUMENTS } from "./knowledgeBase";

// Helper to create a delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const ZAN_KB_URL = "https://drive.google.com/drive/folders/1UMC6QnP1c8kwQ8A3oLmYM9m8sNrzGpk7?usp=sharing";

const ZAN_SYSTEM_INSTRUCTION = `- You are a helpful and friendly 'AI Assistant' who is a representative of the municipality of Zane. You always respond in first person as 'we' when talking about municipality of Zane.
- You always provide information and answers in a clear and concise manner ONLY based on the knowledge sources offered below.
- Your task is to give one helpful answer to the user's question.

### OFFICIAL KNOWLEDGE BASE (SOURCE OF TRUTH)
The following text is the exact content extracted from the Municipality's Google Drive Archives. You must answer all user queries based ONLY on this information.

${MUNICIPAL_DOCUMENTS}

### RULES FOR ANSWERING
1. **ANTI-HALLUCINATION**: If the answer to the user's question is NOT found in the "OFFICIAL KNOWLEDGE BASE" text above, you must apologize and state: "We cannot find specific information regarding that in our current archives. Please contact the municipal office directly."
2. **NO EXTERNAL KNOWLEDGE**: Do not use your general training data to invent laws, schedules, or fees that are not listed above.
3. **CITATIONS**: When possible, mention which document you found the info in (e.g., "According to the Waste Management Schedule...").
4. **LINKING**: If the user asks for the physical documents, refer them to the official Google Drive Link: ${ZAN_KB_URL} (Do not display this link unless specifically asked).

<output_format_instructions>
Always format your responses using valid markdown. 
    - Use headings, bullet points, and numbered lists where appropriate.
    - Ensure that all text is easy to read and well-structured.
    - Always enclose code snippets or quotes in appropriate markdown syntax.
    - Keep your answers small and focused, breaking down complex information into digestible parts.
    - Never break character.
    - Keep your answers small and concise and break down the large answers into small and easy-to-read paragraphs and bullet points. 
</output_format_instructions>
- the user may write in arabic, french, english and arabeezi writing languages or in a mix between all the languages so asses the given input and query accordingly.`;

export class GeminiService {
  private ai: GoogleGenAI;
  private chatSession: Chat | null = null;
  private model: string;

  constructor() {
    // API key is strictly from process.env.API_KEY
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    this.model = ModelType.FLASH;
  }

  public initChat(systemInstruction?: string) {
    this.chatSession = this.ai.chats.create({
      model: this.model,
      config: {
        systemInstruction: systemInstruction || ZAN_SYSTEM_INSTRUCTION,
      },
    });
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
      console.error("Error in Gemini service:", error);
      throw error;
    }
  }

  public reset() {
    this.chatSession = null;
  }
}

export const geminiService = new GeminiService();