const { v4: uuidv4 } = require("uuid");

class AgentService {
    constructor(pool) {
        this.pool = pool;
    }

    // Get all agents
    async getAgents(userId) {
        try {
            const [rows] = await this.pool.execute(
                `SELECT * FROM agents WHERE user_id = ? ORDER BY created_at DESC`,
                [userId]
            );

            return rows.map(agent => ({
                id: agent.id,
                user_id: agent.user_id,
                name: agent.name,
                identity: agent.identity,
                createdDate: agent.created_at,
                status: agent.status,
                model: agent.model,
                voiceId: agent.voice_id,
                language: agent.language,
                settings: agent.settings ? this.parseJsonSafely(agent.settings) : this.getDefaultSettings(),
                updatedDate: agent.updated_at
            }));
        } catch (err) {
            console.error("Error fetching agents:", err);
            throw new Error("Failed to fetch agents");
        }
    }

    // Get a single agent
    async getAgentById(userId, id) {
        try {
            const [rows] = await this.pool.execute(
                `SELECT * FROM agents WHERE user_id = ? AND id = ?`,
                [userId, id]
            );

            if (rows.length === 0) return null;

            const agent = rows[0];

            return {
                id: agent.id,
                user_id: agent.user_id,
                name: agent.name,
                identity: agent.identity,
                createdDate: agent.created_at,
                status: agent.status,
                model: agent.model,
                voiceId: agent.voice_id,
                language: agent.language,
                settings: agent.settings ? this.parseJsonSafely(agent.settings) : this.getDefaultSettings(),
                updatedDate: agent.updated_at
            };
        } catch (err) {
            console.error("Error fetching agent:", err);
            throw new Error("Failed to fetch agent");
        }
    }

    // Create agent
    async createAgent(userId, data) {
        try {
            const id = uuidv4();
            const createdAt = new Date().toISOString().slice(0, 19).replace("T", " ");

            const settingsJson = data.settings
                ? JSON.stringify(data.settings)
                : JSON.stringify(this.getDefaultSettings());

            await this.pool.execute(
                `
                INSERT INTO agents (id, user_id, name, identity, status, model, voice_id, language, settings, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    id,
                    userId,
                    data.name,
                    data.identity,
                    data.status,
                    data.model,
                    data.voiceId,
                    data.language,
                    settingsJson,
                    createdAt
                ]
            );

            return {
                id,
                name: data.name,
                identity: data.identity,
                createdDate: createdAt,
                status: data.status,
                model: data.model,
                voiceId: data.voiceId,
                language: data.language,
                settings: this.parseJsonSafely(settingsJson),
                updatedDate: createdAt
            };
        } catch (err) {
            console.error("Error creating agent:", err);
            throw new Error("Failed to create agent: " + err.message);
        }
    }

    // Update agent
    async updateAgent(userId, id, updateData) {
        try {
            const existing = await this.getAgentById(userId, id);
            if (!existing) throw new Error("Agent not found");

            const fields = [];
            const values = [];

            // Whitelist of fields to ensure secure and correct updates
            const fieldMap = {
                name: "name",
                identity: "identity",
                status: "status",
                model: "model",
                voiceId: "voice_id",
                language: "language",
                settings: "settings"
            };

            for (const key in updateData) {
                // Skip fields that are not in the whitelist (e.g. createdDate, updatedDate, unknown props)
                if (!fieldMap[key]) continue;

                const dbColumn = fieldMap[key];

                if (key === "settings") {
                    fields.push(`${dbColumn} = ?`);
                    values.push(JSON.stringify(updateData[key]));
                } else {
                    fields.push(`${dbColumn} = ?`);
                    values.push(updateData[key]);
                }
            }

            // Always update using ID and UserID for safety
            values.push(id);
            values.push(userId);

            if (fields.length > 0) {
                await this.pool.execute(
                    `UPDATE agents SET ${fields.join(", ")} WHERE id = ? AND user_id = ?`,
                    values
                );
            }

            return await this.getAgentById(userId, id);
        } catch (err) {
            console.error("Error updating agent:", err);
            throw new Error("Failed to update agent: " + err.message);
        }
    }


    // Delete agent
    async deleteAgent(userId, id) {
        try {
            const existing = await this.getAgentById(userId, id);
            if (!existing) throw new Error("Agent not found");

            await this.pool.execute(
                `DELETE FROM agents WHERE id = ? AND user_id = ?`,
                [id, userId]
            );
        } catch (err) {
            console.error("Error deleting agent:", err);
            throw new Error("Failed to delete agent");
        }
    }

    parseJsonSafely(json) {
        try {
            return typeof json === "string" ? JSON.parse(json) : json;
        } catch (err) {
            return null;
        }
    }

    getDefaultSettings() {
        return {
            userStartsFirst: false,
            greetingLine: "Welcome! How can I help you?",
            responseDelay: false,
            inactivityHandling: true,
            agentCanTerminateCall: false,
            voicemailDetection: true,
            callTransfer: true,
            dtmfDial: false,
            agentTimezone: "America/New_York",
            voiceDetectionConfidenceThreshold: 0.5,
            overrideVAD: false,
            backgroundAmbientSound: "None",
            callRecording: true,
            sessionTimeoutFixedDuration: 3600,
            sessionTimeoutNoVoiceActivity: 300,
            sessionTimeoutEndMessage: "Your session has ended.",
            dataPrivacyOptOut: false,
            doNotCallDetection: true,
            prefetchDataWebhook: "",
            endOfCallWebhook: "",
            preActionPhrases: [],
            tools: []
        };
    }
}

module.exports = AgentService;
