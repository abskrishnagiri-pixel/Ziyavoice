const express = require('express');
const router = express.Router();
const VoiceSyncService = require('../services/voiceSyncService');
const { generateTTS } = require('../services/tts_controller');

/**
 * Voice API Routes
 * Handles voice listing, syncing, and preview generation
 */

// Initialize voice sync service
let voiceSyncService;

function initVoiceSync(pool) {
    voiceSyncService = new VoiceSyncService(pool);
    return router;
}

/**
 * GET /api/voices
 * Get all voices, optionally filtered by provider
 * Query params: provider (all|elevenlabs|sarvam)
 */
router.get('/', async (req, res) => {
    try {
        const provider = req.query.provider || 'all';

        if (!['all', 'elevenlabs', 'sarvam'].includes(provider)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid provider. Must be: all, elevenlabs, or sarvam'
            });
        }

        const voices = await voiceSyncService.getVoices(provider);

        res.json({
            success: true,
            voices: voices,
            count: voices.length,
            provider: provider,
            cached: true
        });

    } catch (error) {
        console.error('[VoiceAPI] Error fetching voices:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch voices',
            error: error.message
        });
    }
});

/**
 * POST /api/voices/sync
 * Trigger voice sync from providers (admin only)
 */
router.post('/sync', async (req, res) => {
    try {
        // TODO: Add admin authentication middleware
        // For now, anyone can trigger sync

        console.log('[VoiceAPI] Starting voice sync...');
        const result = await voiceSyncService.syncAllProviders();

        res.json({
            success: result.errors.length === 0,
            synced: result.synced,
            errors: result.errors,
            message: `Synced ${result.synced} voices${result.errors.length > 0 ? ` with ${result.errors.length} errors` : ''}`
        });

    } catch (error) {
        console.error('[VoiceAPI] Error syncing voices:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to sync voices',
            error: error.message
        });
    }
});

/**
 * GET /api/voices/:id
 * Get voice details by ID
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const voice = await voiceSyncService.getVoiceById(id);

        if (!voice) {
            return res.status(404).json({
                success: false,
                message: 'Voice not found'
            });
        }

        res.json({
            success: true,
            voice: voice
        });

    } catch (error) {
        console.error('[VoiceAPI] Error fetching voice:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch voice',
            error: error.message
        });
    }
});

/**
 * POST /api/voices/:id/preview
 * Generate TTS preview for a voice
 */
router.post('/:id/preview', async (req, res) => {
    try {
        const { id } = req.params;
        const { text } = req.body;

        const voice = await voiceSyncService.getVoiceById(id);

        if (!voice) {
            return res.status(404).json({
                success: false,
                message: 'Voice not found'
            });
        }

        const previewText = text || "Hello, this is a preview of the selected voice.";

        // Generate TTS using the appropriate provider
        let ttsOptions = {
            voiceId: voice.provider_voice_id,
            provider: voice.provider,
            language: voice.language_code,
            speaker: voice.provider_voice_id,
            skipTwilioConversion: true  // CRITICAL: Don't convert to µ-law for preview!
        };

        // Configure format based on provider for web browser compatibility
        if (voice.provider === 'sarvam') {
            // Sarvam: Request MP3 format for browser playback
            ttsOptions.format = 'mp3';
            ttsOptions.speaker = voice.provider_voice_id;
            ttsOptions.language = voice.language_code;
        } else {
            // ElevenLabs: Request MP3 format for browser playback
            ttsOptions.output_format = 'mp3_44100_128'; // Standard MP3 for browser
        }

        const audioBuffer = await generateTTS(previewText, ttsOptions);

        // Convert buffer to base64
        const base64Audio = audioBuffer.toString('base64');

        // Determine MIME type - both should be MP3 for browser
        const mimeType = 'audio/mpeg';
        const dataUri = `data:${mimeType};base64,${base64Audio}`;

        res.json({
            success: true,
            audioData: dataUri, // Send full Data URI for easy playback
            voice: {
                id: voice.id,
                name: voice.display_name,
                provider: voice.provider
            }
        });

    } catch (error) {
        console.error('[VoiceAPI] Error generating preview:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate voice preview',
            error: error.message
        });
    }
});

module.exports = { router, initVoiceSync };
