const crypto = require('crypto');
const fetch = require('node-fetch');

class WebhookService {
    constructor(mysqlPool) {
        this.pool = mysqlPool;
        this.tableName = 'conversation_extractions';
        this.initTable();
    }

    async initTable() {
        if (!this.pool) {
            console.warn('MySQL pool not provided to WebhookService, table initialization skipped.');
            return;
        }

        const createTableQuery = `
            CREATE TABLE IF NOT EXISTS ${this.tableName} (
                id INT AUTO_INCREMENT PRIMARY KEY,
                agent_id VARCHAR(36) NOT NULL,
                call_id VARCHAR(255) NOT NULL,
                campaign_id VARCHAR(36),
                extracted_data JSON,
                call_metadata JSON,
                webhook_url VARCHAR(2048),
                webhook_secret VARCHAR(255),
                delivery_status ENUM('pending', 'success', 'failed') DEFAULT 'pending',
                retry_count INT DEFAULT 0,
                error_log TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_call_id (call_id),
                INDEX idx_agent_id (agent_id)
            ) ENGINE=InnoDB;
        `;

        try {
            await this.pool.execute(createTableQuery);
            console.log(`✅ Table ${this.tableName} check/creation successful.`);
        } catch (error) {
            console.error(`❌ Failed to initialize table ${this.tableName}:`, error);
        }
    }

    /**
     * Store extracted data and attempt delivery
     * @param {Object} params
     * @param {string} params.agentId
     * @param {string} params.callId
     * @param {string} params.campaignId
     * @param {Object} params.extractedData
     * @param {Object} params.callMetadata
     * @param {Object} params.webhookConfig - { url, secret, enabled, retries }
     */
    async processExtraction(params) {
        const { agentId, callId, campaignId, extractedData, callMetadata, webhookConfig } = params;

        console.log(`📦 Processing extraction for CallID: ${callId}`);

        // 1. Store in DB
        let extractionId;
        try {
            const [result] = await this.pool.execute(
                `INSERT INTO ${this.tableName} 
                (agent_id, call_id, campaign_id, extracted_data, call_metadata, webhook_url, webhook_secret, delivery_status) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    agentId,
                    callId,
                    campaignId || null,
                    JSON.stringify(extractedData),
                    JSON.stringify(callMetadata || {}),
                    webhookConfig?.url || null,
                    webhookConfig?.secret || null,
                    'pending'
                ]
            );
            extractionId = result.insertId;
            console.log(`✅ Stored extraction ID: ${extractionId}`);
        } catch (error) {
            console.error('❌ Failed to store extraction:', error);
            // If DB storage fails, we probably can't do much, but we could try to send webhook anyway if critical?
            // Requirement says: "After insertion... If webhook_enabled... Attempt delivery".
            // So if insertion fails, we stop.
            return { success: false, error: 'Storage failed' };
        }

        // 2. Check if webhook is enabled
        if (!webhookConfig || !webhookConfig.enabled || !webhookConfig.url) {
            console.log(`ℹ️ Webhook disabled or URL missing for Agent ${agentId}. Skipping delivery.`);
            return { success: true, stored: true, delivered: false, reason: 'Webhook disabled' };
        }

        // 3. Attempt Delivery
        return await this.deliverWebhook(extractionId, params, webhookConfig);
    }

    async deliverWebhook(extractionId, params, webhookConfig) {
        const { agentId, callId, campaignId, extractedData, callMetadata } = params;
        const { url, secret, retries = 3 } = webhookConfig;

        const payload = {
            agent_id: agentId,
            campaign_id: campaignId,
            call_id: callId,
            timestamp: new Date().toISOString(),
            extracted_data: extractedData,
            call_metadata: callMetadata
        };

        const maxRetries = retries || 3;
        let attempt = 0;
        let success = false;
        let lastError = null;

        while (attempt < maxRetries && !success) {
            attempt++;
            try {
                console.log(`🚀 Webhook Delivery Attempt ${attempt}/${maxRetries} to ${url}`);

                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout

                const headers = {
                    'Content-Type': 'application/json'
                };

                // Generate Signature
                if (secret) {
                    const signature = crypto
                        .createHmac('sha256', secret)
                        .update(JSON.stringify(payload))
                        .digest('hex');
                    headers['X-Ziya-Signature'] = `sha256=${signature}`;
                }

                const response = await fetch(url, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify(payload),
                    signal: controller.signal
                });

                clearTimeout(timeout);

                if (response.ok) {
                    success = true;
                    console.log(`✅ Webhook delivered successfully.`);
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

            } catch (error) {
                lastError = error.message;
                console.warn(`⚠️ Webhook delivery failed (Attempt ${attempt}):`, error.message);

                // Update retry count in DB
                await this.updateStatus(extractionId, 'pending', attempt, lastError);

                if (attempt < maxRetries) {
                    // Exponential backoff: 3000ms, 6000ms, 12000ms...
                    const waitTime = 1000 * Math.pow(2, attempt); // 2s, 4s, 8s...
                    await new Promise(r => setTimeout(r, waitTime));
                }
            }
        }

        const finalStatus = success ? 'success' : 'failed';
        await this.updateStatus(extractionId, finalStatus, attempt, lastError);

        return { success, attempts: attempt, error: lastError };
    }

    async updateStatus(id, status, retryCount, errorLog = null) {
        try {
            await this.pool.execute(
                `UPDATE ${this.tableName} SET delivery_status = ?, retry_count = ?, error_log = ? WHERE id = ?`,
                [status, retryCount, errorLog, id]
            );
        } catch (error) {
            console.error('❌ Failed to update webhook status:', error);
        }
    }
}

module.exports = WebhookService;
