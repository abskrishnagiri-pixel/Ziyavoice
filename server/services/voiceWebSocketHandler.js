const WebSocket = require('ws');

/**
 * Voice WebSocket Handler
 * Manages real-time voice list updates for connected clients
 */
class VoiceWebSocketHandler {
    constructor(voiceSyncService) {
        this.voiceSyncService = voiceSyncService;
        this.clients = new Set();
    }

    /**
     * Handle new WebSocket connection
     * @param {WebSocket} ws - WebSocket connection
     * @param {Request} req - HTTP request
     */
    handleConnection(ws, req) {
        console.log('[VoiceWS] New client connected');

        // Add client to set
        this.clients.add(ws);

        // Send initial voice list
        this.sendInitialVoices(ws);

        // Handle messages from client
        ws.on('message', (message) => {
            try {
                const data = JSON.parse(message.toString());
                this.handleMessage(ws, data);
            } catch (error) {
                console.error('[VoiceWS] Error parsing message:', error);
            }
        });

        // Handle client disconnect
        ws.on('close', () => {
            console.log('[VoiceWS] Client disconnected');
            this.clients.delete(ws);
        });

        // Handle errors
        ws.on('error', (error) => {
            console.error('[VoiceWS] WebSocket error:', error);
            this.clients.delete(ws);
        });
    }

    /**
     * Send initial voice list to newly connected client
     * @param {WebSocket} ws - WebSocket connection
     */
    async sendInitialVoices(ws) {
        try {
            const voices = await this.voiceSyncService.getVoices('all');

            const message = {
                type: 'voices.initialize',
                payload: {
                    voices: voices,
                    timestamp: new Date().toISOString()
                }
            };

            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify(message));
                console.log(`[VoiceWS] Sent ${voices.length} voices to client`);
            }
        } catch (error) {
            console.error('[VoiceWS] Error sending initial voices:', error);
        }
    }

    /**
     * Handle incoming message from client
     * @param {WebSocket} ws - WebSocket connection
     * @param {any} data - Parsed message data
     */
    handleMessage(ws, data) {
        switch (data.type) {
            case 'ping':
                // Respond to ping with pong
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'pong' }));
                }
                break;

            case 'refresh':
                // Client requests fresh voice list
                this.sendInitialVoices(ws);
                break;

            default:
                console.log('[VoiceWS] Unknown message type:', data.type);
        }
    }

    /**
     * Broadcast voice update to all connected clients
     * @param {string} provider - Provider that was updated
     * @param {any[]} voices - Updated voice list
     */
    broadcastVoiceUpdate(provider, voices) {
        const message = {
            type: 'voices.update',
            payload: {
                provider: provider,
                voices: voices,
                timestamp: new Date().toISOString()
            }
        };

        const messageStr = JSON.stringify(message);
        let sentCount = 0;

        this.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(messageStr);
                sentCount++;
            }
        });

        console.log(`[VoiceWS] Broadcast update to ${sentCount} clients`);
    }

    /**
     * Broadcast voice removal notification
     * @param {string} provider - Provider
     * @param {string[]} voiceIds - Removed voice IDs
     */
    broadcastVoiceRemoval(provider, voiceIds) {
        const message = {
            type: 'voices.removed',
            payload: {
                provider: provider,
                voiceIds: voiceIds,
                timestamp: new Date().toISOString()
            }
        };

        const messageStr = JSON.stringify(message);
        let sentCount = 0;

        this.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(messageStr);
                sentCount++;
            }
        });

        console.log(`[VoiceWS] Broadcast removal to ${sentCount} clients`);
    }

    /**
     * Get number of connected clients
     * @returns {number}
     */
    getClientCount() {
        return this.clients.size;
    }
}

module.exports = VoiceWebSocketHandler;
