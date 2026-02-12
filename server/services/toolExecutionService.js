const WebhookService = require('./webhookService');

/**
 * Tool Execution Service for Voice Calls
 * Handles tool execution during and after voice calls
 */
class ToolExecutionService {
    constructor(llmService, mysqlPool) {
        this.llmService = llmService;
        this.mysqlPool = mysqlPool;
        this.webhookService = new WebhookService(mysqlPool);
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
            // Build schema description from tool parameters
            const parameters = tool.parameters || [];
            const schemaDescription = parameters.map(p =>
                `- "${p.name}" (${p.type})${p.required ? ' [REQUIRED]' : ''}: Description or purpose of this field.`
            ).join('\n');

            const schemaExample = {};
            parameters.forEach(p => {
                schemaExample[p.name] = p.type === 'number' ? 123 : "example_value";
            });

            const schemaPrompt = `
Fields to extract:
${schemaDescription}

Expected JSON Structure:
${JSON.stringify(schemaExample, null, 2)}
`;

            console.log(`🔍 Extracting data for tool "${tool.name}" using strict JSON mode...`);

            // Use new extractJson method
            const extractedData = await this.llmService.extractJson({
                history: conversationHistory,
                schema: schemaPrompt,
                model: 'gemini-2.0-flash'
            });

            if (!extractedData) {
                console.warn('⚠️ LLM returned null for data extraction');
                return { success: false, data: {}, missingFields: [] };
            }

            // Validate required fields
            const missingFields = parameters
                .filter(p => p.required && (extractedData[p.name] === undefined || extractedData[p.name] === null))
                .map(p => p.name);

            if (missingFields.length > 0) {
                console.warn(`⚠️ Missing required fields: ${missingFields.join(', ')}`);
                // If strictly required, we might consider this a failure, but often partial data is better than none.
                // We'll return what we have but flag success based on requirements.
            }

            console.log('✅ Extracted data:', extractedData);
            return {
                success: missingFields.length === 0, // Or true if we accept partials
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
     * @param {Object} params
     * @param {Object} params.tool - The tool configuration
     * @param {Object} params.data - The data to send
     * @param {Object} params.session - The session object containing agentId, callId, etc.
     * @param {Object} params.agentSettings - The full agent settings (to get global webhook config)
     * @returns {Promise<boolean>} Success status
     */
    async executeTool(tool, data, session, agentSettings) {
        try {
            console.log(`🔧 Processing data for tool: ${tool.name}`);

            // Map the old "tool execution" to the new "Structure Extraction -> Webhook" flow

            // 1. Get Webhook Config from Agent Settings (Global)
            // If the tool has a specific webhook URL, we MIGHT use it, but requirement says "Replace Google Sheets... with Webhook-Based JSON Delivery"
            // And "Frontend Changes... Add Webhook URL input".
            // So we prefer the Global Agent Webhook.

            const webhookConfig = {
                url: agentSettings?.webhookUrl,
                secret: agentSettings?.webhookSecret,
                enabled: agentSettings?.webhookEnabled,
                retries: agentSettings?.webhookRetryAttempts || 3
            };

            // 2. Prepare metadata
            const callMetadata = {
                duration: session.usage?.twilio || 0, // Minutes
                cost: 0, // Calculated elsewhere or passed in
                voice_id: session.agentVoiceId
            };

            // 3. Delegate to WebhookService
            const result = await this.webhookService.processExtraction({
                agentId: session.agentId,
                callId: session.callId,
                campaignId: session.campaignId || null,
                extractedData: data,
                callMetadata: callMetadata,
                webhookConfig: webhookConfig
            });

            if (result.success) {
                console.log(`✅ Data stored and processed for tool ${tool.name}`);
                return true;
            } else {
                console.error(`❌ Data processing failed for tool ${tool.name}: ${result.error}`);
                return false;
            }

        } catch (error) {
            console.error(`Error executing tool ${tool.name}:`, error);
            return false;
        }
    }

    // Deprecated methods removed or stubbed
    async executeGoogleSheetsTool(tool, data) {
        console.warn('⚠️ Google Sheets tool is deprecated. Data should be handled via Global Webhook.');
        return false;
    }

    async executeWebhookTool(tool, data) {
        console.warn('⚠️ Legacy Webhook tool execution is deprecated. Data should be handled via Global Webhook.');
        return false;
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
                    // Execute the tool
                    // We need to fetch agent settings to get the webhook config.
                    // Since we don't have it passed here, we might need to fetch it or rely on session having it.
                    // The session object in MediaStreamHandler usually has basic agent info, but maybe not all settings.
                    // However, let's assume session has what we need or we fetch it.

                    // Actually, executeTool now needs session and settings.
                    // We'll update MediaStreamHandler to pass these.

                    let agentSettings = session.agentSettings;
                    if (!agentSettings && session.agentId && this.mysqlPool) {
                        try {
                            const [rows] = await this.mysqlPool.execute(
                                'SELECT settings FROM agents WHERE id = ?',
                                [session.agentId]
                            );
                            if (rows.length > 0 && rows[0].settings) {
                                agentSettings = typeof rows[0].settings === 'string' ? JSON.parse(rows[0].settings) : rows[0].settings;
                            }
                        } catch (e) {
                            console.error('Error fetching agent settings for tool execution:', e);
                        }
                    }

                    await this.executeTool(tool, extraction.data, session, agentSettings);
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
                    // Fetch settings if needed (same as above)
                    let agentSettings = session.agentSettings;
                    if (!agentSettings && session.agentId && this.mysqlPool) {
                        try {
                            const [rows] = await this.mysqlPool.execute(
                                'SELECT settings FROM agents WHERE id = ?',
                                [session.agentId]
                            );
                            if (rows.length > 0 && rows[0].settings) {
                                agentSettings = typeof rows[0].settings === 'string' ? JSON.parse(rows[0].settings) : rows[0].settings;
                            }
                        } catch (e) {
                            console.error('Error fetching agent settings for tool execution:', e);
                        }
                    }

                    // Execute the tool
                    const success = await this.executeTool(tool, extraction.data, session, agentSettings);

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
