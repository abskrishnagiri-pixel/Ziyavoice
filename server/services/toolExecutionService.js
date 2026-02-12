const { GoogleSheetsService } = require('./googleSheetsService');
const googleSheetsService = require('./googleSheetsService');

/**
 * Tool Execution Service for Voice Calls
 * Handles tool execution during and after voice calls
 */
class ToolExecutionService {
    constructor(llmService, mysqlPool) {
        this.llmService = llmService;
        this.mysqlPool = mysqlPool;
    }

    /**
     * Load tools for an agent from the database
     * @param {string} agentId - The agent ID
     * @returns {Promise<Array>} Array of tools
     */
    async loadAgentTools(agentId) {
        try {
            if (!this.mysqlPool) {
                console.warn('MySQL pool not available, cannot load tools');
                return [];
            }

            const [rows] = await this.mysqlPool.execute(
                'SELECT tools FROM agents WHERE id = ?',
                [agentId]
            );

            if (rows.length === 0 || !rows[0].tools) {
                return [];
            }

            // Parse tools from JSON
            const tools = typeof rows[0].tools === 'string'
                ? JSON.parse(rows[0].tools)
                : rows[0].tools;

            console.log(`📋 Loaded ${tools.length} tools for agent ${agentId}`);
            return Array.isArray(tools) ? tools : [];
        } catch (error) {
            console.error('Error loading agent tools:', error);
            return [];
        }
    }

    /**
     * Extract structured data from conversation using LLM
     * @param {Array} conversationHistory - The conversation history
     * @param {Object} tool - The tool with parameters to extract
     * @returns {Promise<Object>} Extracted data
     */
    async extractDataFromConversation(conversationHistory, tool) {
        try {
            // Build extraction prompt
            const parameters = tool.parameters || [];
            const parameterDescriptions = parameters.map(p =>
                `- ${p.name} (${p.type})${p.required ? ' [REQUIRED]' : ''}: Extract this value from the conversation`
            ).join('\n');

            const conversationText = conversationHistory
                .map(msg => `${msg.role}: ${msg.text}`)
                .join('\n');

            const extractionPrompt = `You are a data extraction assistant. Extract the following information from the conversation:

${parameterDescriptions}

Conversation:
${conversationText}

Return ONLY a valid JSON object with the extracted values. Use null for values not found.
Example format: {"field1": "value1", "field2": "value2"}

JSON:`;

            console.log('🔍 Extracting data with prompt:', extractionPrompt.substring(0, 200) + '...');

            // Use LLM to extract data
            const response = await this.llmService.chat(
                'gemini-2.0-flash',
                extractionPrompt,
                []
            );

            // Parse JSON response
            let extractedData = {};
            try {
                // Try to find JSON in the response
                const jsonMatch = response.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    extractedData = JSON.parse(jsonMatch[0]);
                } else {
                    console.warn('No JSON found in LLM response:', response);
                }
            } catch (parseError) {
                console.error('Error parsing LLM response as JSON:', parseError);
                console.log('Raw response:', response);
            }

            // Validate required fields
            const missingFields = parameters
                .filter(p => p.required && !extractedData[p.name])
                .map(p => p.name);

            if (missingFields.length > 0) {
                console.warn(`⚠️ Missing required fields: ${missingFields.join(', ')}`);
            }

            console.log('✅ Extracted data:', extractedData);
            return {
                success: missingFields.length === 0,
                data: extractedData,
                missingFields
            };

        } catch (error) {
            console.error('Error extracting data from conversation:', error);
            return {
                success: false,
                data: {},
                error: error.message
            };
        }
    }

    /**
     * Execute a tool with collected data
     * @param {Object} tool - The tool to execute
     * @param {Object} data - The data to send
     * @returns {Promise<boolean>} Success status
     */
    async executeTool(tool, data) {
        try {
            console.log(`🔧 Executing tool: ${tool.name}`);
            console.log(`   Type: ${tool.type}`);
            console.log(`   Data keys: ${Object.keys(data).join(', ')}`);

            switch (tool.type) {
                case 'GoogleSheets':
                    return await this.executeGoogleSheetsTool(tool, data);

                case 'Webhook':
                    return await this.executeWebhookTool(tool, data);

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
     * Execute Google Sheets tool
     * @param {Object} tool - The tool configuration
     * @param {Object} data - The data to append
     * @returns {Promise<boolean>} Success status
     */
    async executeGoogleSheetsTool(tool, data) {
        try {
            if (!tool.webhookUrl) {
                throw new Error('Google Sheets URL is missing');
            }

            // Extract spreadsheet ID from URL
            const spreadsheetId = googleSheetsService.extractSpreadsheetId(tool.webhookUrl);
            if (!spreadsheetId) {
                throw new Error('Invalid Google Sheets URL');
            }

            console.log(`📊 Appending data to Google Sheet: ${spreadsheetId}`);

            // Use the sheet name from tool name or default
            const sheetName = tool.name || 'Data Collection';

            // Append data to Google Sheets
            const result = await googleSheetsService.appendGenericRow(
                spreadsheetId,
                data,
                sheetName
            );

            if (result.success) {
                console.log('✅ Data successfully saved to Google Sheets');
                return true;
            } else {
                console.error('❌ Failed to save to Google Sheets:', result.error);
                return false;
            }

        } catch (error) {
            console.error('Error executing Google Sheets tool:', error);
            return false;
        }
    }

    /**
     * Execute Webhook tool
     * @param {Object} tool - The tool configuration
     * @param {Object} data - The data to send
     * @returns {Promise<boolean>} Success status
     */
    async executeWebhookTool(tool, data) {
        try {
            if (!tool.webhookUrl) {
                throw new Error('Webhook URL is missing');
            }

            const method = tool.method || 'POST';
            const headers = {
                'Content-Type': 'application/json',
                ...(tool.headers || []).reduce((acc, header) => {
                    acc[header.key] = header.value;
                    return acc;
                }, {})
            };

            console.log(`🌐 Calling webhook: ${tool.webhookUrl}`);

            const fetch = require('node-fetch');
            const response = await fetch(tool.webhookUrl, {
                method,
                headers,
                body: method === 'POST' ? JSON.stringify(data) : undefined
            });

            if (response.ok) {
                console.log('✅ Webhook executed successfully');
                return true;
            } else {
                console.error(`❌ Webhook failed with status: ${response.status}`);
                return false;
            }

        } catch (error) {
            console.error('Error executing webhook tool:', error);
            return false;
        }
    }

    /**
     * Process tools for a call session
     * Executes tools marked to run during the call
     * @param {Object} session - The call session
     * @param {Array} tools - The tools to process
     * @returns {Promise<void>}
     */
    async processToolsDuringCall(session, tools) {
        try {
            // Filter tools that should run during the call (not after)
            const duringCallTools = tools.filter(tool => !tool.runAfterCall);

            if (duringCallTools.length === 0) {
                return;
            }

            console.log(`🔄 Processing ${duringCallTools.length} tools during call`);

            for (const tool of duringCallTools) {
                // Extract data from conversation
                const extraction = await this.extractDataFromConversation(
                    session.context,
                    tool
                );

                if (extraction.success) {
                    // Execute the tool
                    await this.executeTool(tool, extraction.data);
                } else {
                    console.log(`⏭️ Skipping tool ${tool.name} - missing required data`);
                }
            }

        } catch (error) {
            console.error('Error processing tools during call:', error);
        }
    }

    /**
     * Process tools after a call ends
     * Executes tools marked to run after the call
     * @param {Object} session - The call session
     * @param {Array} tools - The tools to process
     * @returns {Promise<void>}
     */
    async processToolsAfterCall(session, tools) {
        try {
            // Filter tools that should run after the call
            const afterCallTools = tools.filter(tool => tool.runAfterCall);

            if (afterCallTools.length === 0) {
                return;
            }

            console.log(`🔄 Processing ${afterCallTools.length} tools after call`);

            for (const tool of afterCallTools) {
                // Extract data from conversation
                const extraction = await this.extractDataFromConversation(
                    session.context,
                    tool
                );

                if (extraction.success) {
                    // Execute the tool
                    const success = await this.executeTool(tool, extraction.data);

                    if (success) {
                        console.log(`✅ Tool ${tool.name} executed successfully after call`);
                    } else {
                        console.error(`❌ Tool ${tool.name} failed to execute after call`);
                    }
                } else {
                    console.log(`⏭️ Skipping tool ${tool.name} - missing required data:`, extraction.missingFields);
                }
            }

        } catch (error) {
            console.error('Error processing tools after call:', error);
        }
    }
}

module.exports = ToolExecutionService;
