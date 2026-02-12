const fetch = require('node-fetch');
const FormData = require('form-data');

class SarvamSttService {
    constructor(apiKey) {
        if (!apiKey) throw new Error("Missing Sarvam API Key");
        this.apiKey = apiKey;
    }

    /**
     * Transcribe audio buffer using Sarvam STT
     * @param {Buffer} audioBuffer - WAV or PCM audio buffer
     * @returns {Promise<string>} - Transcription text
     */
    async transcribe(audioBuffer) {
        try {
            const formData = new FormData();
            formData.append('file', audioBuffer, {
                filename: 'audio.wav',
                contentType: 'audio/wav',
            });
            formData.append('model', 'saaras:v2.5'); // Default model for STT

            const response = await fetch('https://api.sarvam.ai/speech-to-text-translate', {
                method: 'POST',
                headers: {
                    'api-subscription-key': this.apiKey,
                    ...formData.getHeaders()
                },
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Sarvam STT API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            return data.transcript || '';
        } catch (error) {
            console.error('Sarvam STT Error:', error);
            throw error;
        }
    }
}

module.exports = SarvamSttService;
