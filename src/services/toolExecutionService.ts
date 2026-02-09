import { Tool, ToolType } from '../types';
import { GoogleSheetsService } from './googleSheetsService';

export class ToolExecutionService {
  /**
   * Execute a tool based on its type
   * @param tool The tool to execute
   * @param collectedData The data collected from the user
   * @returns Promise<boolean> indicating success
   */
  async executeTool(tool: Tool, collectedData: Record<string, any>): Promise<boolean> {
    try {
      switch (tool.type) {
        case ToolType.GoogleSheets:
          return this.executeGoogleSheetsTool(tool, collectedData);
        
        case ToolType.Webhook:
          return this.executeWebhookTool(tool, collectedData);
          
        case ToolType.WebForm:
          // WebForm tools are handled in the UI, not executed server-side
          return true;
          
        default:
          console.warn(`Unsupported tool type: ${tool.type}`);
          return false;
      }
    } catch (error) {
      console.error(`Error executing tool ${tool.name}:`, error);
      return false;
    }
  }

  /**
   * Execute a Google Sheets tool
   * @param tool The Google Sheets tool to execute
   * @param collectedData The data collected from the user
   * @returns Promise<boolean> indicating success
   */
  private async executeGoogleSheetsTool(tool: Tool, collectedData: Record<string, any>): Promise<boolean> {
    try {
      // Extract spreadsheet ID from the Google Sheets URL stored in webhookUrl
      if (!tool.webhookUrl) {
        throw new Error('Google Sheets URL is missing');
      }
      
      const spreadsheetId = GoogleSheetsService.extractSpreadsheetIdFromUrl(tool.webhookUrl);
      
      // Create Google Sheets service instance
      const sheetsService = new GoogleSheetsService(spreadsheetId);
      
      // Execute the tool
      const result = await sheetsService.executeSheetsTool(tool, collectedData);
      
      return result;
    } catch (error) {
      console.error('Error executing Google Sheets tool:', error);
      return false;
    }
  }

  /**
   * Execute a webhook tool
   * @param tool The webhook tool to execute
   * @param collectedData The data collected from the user
   * @returns Promise<boolean> indicating success
   */
  private async executeWebhookTool(tool: Tool, collectedData: Record<string, any>): Promise<boolean> {
    try {
      if (!tool.webhookUrl) {
        throw new Error('Webhook URL is missing');
      }
      
      // Prepare the request
      const method = tool.method || 'POST';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((tool.headers || []).reduce((acc, header) => {
          acc[header.key] = header.value;
          return acc;
        }, {} as Record<string, string>))
      };
      
      // Execute the webhook
      const response = await fetch(tool.webhookUrl, {
        method,
        headers,
        body: method === 'POST' ? JSON.stringify(collectedData) : undefined
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error executing webhook tool:', error);
      return false;
    }
  }
}

export default ToolExecutionService;