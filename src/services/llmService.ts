import { GoogleGenAI } from '@google/genai';

// Unified LLM service that supports Gemini models
export class LLMService {
  private geminiClient: GoogleGenAI | null = null;

  constructor(geminiApiKey?: string) {
    if (geminiApiKey) {
      this.geminiClient = new GoogleGenAI({ apiKey: geminiApiKey });
    }
  }

  isGeminiModel(modelId: string): boolean {
    return modelId.startsWith('gemini-');
  }

  async generateContent(request: {
    model: string;
    contents: Array<{ role: string; parts: Array<{ text: string }> }>;
    config?: { systemInstruction?: string };
  }): Promise<{ text: string }> {
    if (this.isGeminiModel(request.model) && this.geminiClient) {
      // Use existing Gemini implementation
      return this.geminiClient.models.generateContent({
        model: request.model,
        contents: request.contents,
        config: request.config,
      });
    } else {
      throw new Error(`Unsupported model: ${request.model}`);
    }
  }

  async generateContentStream(request: {
    model: string;
    contents: Array<{ role: string; parts: Array<{ text: string }> }>;
    config?: { systemInstruction?: string };
  }): Promise<AsyncIterable<{ text: string }>> {
    if (this.isGeminiModel(request.model) && this.geminiClient) {
      // Use existing Gemini implementation
      return this.geminiClient.models.generateContentStream({
        model: request.model,
        contents: request.contents,
        config: request.config,
      });
    } else {
      throw new Error(`Unsupported model: ${request.model}`);
    }
  }
}

export default LLMService;
