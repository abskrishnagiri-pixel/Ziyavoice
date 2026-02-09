const nodeFetch = require("node-fetch");
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Get ElevenLabs API key from environment
 * @returns {string} API key
 */
function getElevenLabsApiKey() {
    return process.env.ELEVEN_LABS_API_KEY || process.env.ELEVENLABS_API_KEY;
}

/**
 * Get Sarvam API key from environment
 * @returns {string} API key
 */
function getSarvamApiKey() {
    return process.env.SARVAM_API_KEY;
}

/**
 * Main TTS generation function
 * Routes to appropriate provider based on voice ID or explicit provider
 * @param {string} text - Text to synthesize
 * @param {Object} options - TTS options
 * @param {string} options.voiceId - Voice ID or speaker name
 * @param {string} options.speaker - Speaker name (for Sarvam)
 * @param {string} options.provider - Explicit provider ('elevenlabs' or 'sarvam')
 * @param {string} options.format - Output format
 * @returns {Promise<Buffer>} - Audio buffer
 */
async function generateTTS(text, options = {}) {
    // Known Sarvam speakers (updated list from API)
    // WARNING: This is a hardcoded list. New Sarvam voices won't be auto-detected.
    // TODO: Query database or Sarvam API for voice list instead
    const sarvamSpeakers = [
        'anushka', 'abhilash', 'manisha', 'vidya', 'arya', 'karun', 'hitesh', 'aditya',
        'isha', 'ritu', 'chirag', 'harsh', 'sakshi', 'priya', 'neha', 'rahul',
        'pooja', 'rohan', 'simran', 'kavya', 'anjali', 'sneha', 'kiran', 'vikram',
        'rajesh', 'sunita', 'tara', 'anirudh', 'kriti', 'ishaan', 'ratan', 'varun',
        'manan', 'sumit', 'roopa', 'kabir', 'aayan', 'shubh', 'meera'
    ];

    // Auto-detect provider based on voice ID or speaker
    let provider = options.provider || process.env.TTS_PROVIDER;

    // If no provider specified, try to detect from voice ID/speaker
    if (!provider) {
        const voiceId = (options.voiceId || options.speaker || '').toLowerCase();
        if (sarvamSpeakers.includes(voiceId)) {
            provider = 'sarvam';
            // Set speaker if not already set
            if (!options.speaker) {
                options.speaker = voiceId;
            }
        } else if (voiceId.length > 0) {
            // If we have a voice ID but it's not in the Sarvam list, assume ElevenLabs
            provider = 'elevenlabs';
        } else {
            // No voice ID provided, default to ElevenLabs
            provider = 'elevenlabs';
            console.warn('[TTS Controller] No voice ID or provider specified, defaulting to ElevenLabs');
        }
    }

    console.log(`[TTS Controller] Selected provider: ${provider}`);

    if (provider === 'sarvam') {
        return generateSarvamTTS(text, options);
    } else {
        return generateElevenLabsTTS(text, options);
    }
}

/**
 * Generate TTS using Sarvam AI
 * @param {string} text - Text to synthesize
 * @param {Object} options - TTS options
 * @param {string} options.speaker - Sarvam speaker name
 * @returns {Promise<Buffer>} - Audio buffer
 */
async function generateSarvamTTS(text, options) {
    console.log("[TTS Controller] Routing to Sarvam TTS");

    const apiKey = getSarvamApiKey();

    if (!apiKey) {
        throw new Error("Sarvam API key not configured");
    }

    const speaker = options.speaker || options.voiceId || "meera";

    console.log(`[TTS] Using provider: Sarvam`);
    console.log(`   Speaker: ${speaker}`);

    try {
        const { generateSarvamTTS: sarvamService } = require("./tts_sarvam.js");
        const audioBuffer = await sarvamService(text, {
            speaker,
            target_language_code: options.language || "en-IN",
            model: "bulbul:v2",
            format: options.format || undefined,  // Pass format option (e.g., 'mp3' for preview)
            skipTwilioConversion: options.skipTwilioConversion || false  // Pass skip flag
        });

        console.log(`[TTS] Sarvam TTS completed: ${audioBuffer.length} bytes`);
        return audioBuffer;
    } catch (error) {
        console.error("[TTS] Error in Sarvam TTS:", error.message);
        throw error;
    }
}

/**
 * Convert 16-bit linear PCM to µ-law (G.711)
 * @param {Buffer} pcmBuffer - 16-bit PCM buffer
 * @returns {Buffer} - 8-bit µ-law buffer
 */
function pcmToMuLaw(pcmBuffer) {
    const muLawBuffer = Buffer.alloc(pcmBuffer.length / 2);
    const split = [
        -32124, -31100, -30076, -29052, -28028, -27004, -25980, -24956,
        -23932, -22908, -21884, -20860, -19836, -18812, -17788, -16764,
        -15740, -14716, -13692, -12668, -11644, -10620, -9596, -8572,
        -7548, -6524, -5500, -4476, -3452, -2428, -1404, -380, 380,
        1404, 2428, 3452, 4476, 5500, 6524, 7548, 8572, 9596, 10620,
        11644, 12668, 13692, 14716, 15740, 16764, 17788, 18812, 19836,
        20860, 21884, 22908, 23932, 24956, 25980, 27004, 28028, 29052,
        30076, 31100, 32124
    ];

    for (let i = 0; i < pcmBuffer.length; i += 2) {
        let sample = pcmBuffer.readInt16LE(i);

        // Clamp sample
        if (sample > 32767) sample = 32767;
        if (sample < -32768) sample = -32768;

        // Encode to Mu-Law (simplified logic via lookup-ish approach or standard algorithm)
        // Standard G.711 algorithm:
        const sign = (sample < 0) ? 0x80 : 0;
        if (sample < 0) sample = -sample;
        sample = sample + 132;
        if (sample > 32767) sample = 32767;

        const exponent = [7, 6, 5, 4, 3, 2, 1, 0].find(e => sample >= (1 << (e + 5))) || 0;
        const mantissa = (sample >> (exponent + 1)) & 0x0F;
        const muLawByte = ~(sign | (exponent << 4) | mantissa);

        muLawBuffer[i / 2] = muLawByte;
    }
    return muLawBuffer;
}

/**
 * Convert MP3 buffer to µ-law using ffmpeg -> PCM -> MuLaw
 * @param {Buffer} mp3Buffer - MP3 audio buffer
 * @returns {Promise<Buffer>} - µ-law audio buffer
 */
async function convertMp3ToUlaw(mp3Buffer) {
    return new Promise((resolve, reject) => {
        // Create temp files
        const tempDir = os.tmpdir();
        const inputFile = path.join(tempDir, `tts_input_${Date.now()}.mp3`);
        const outputFile = path.join(tempDir, `tts_output_${Date.now()}.pcm`);

        try {
            // Write MP3 to temp file
            fs.writeFileSync(inputFile, mp3Buffer);
            console.log(`[TTS] Wrote MP3 to temp file: ${inputFile} (${mp3Buffer.length} bytes)`);

            // Convert to Raw PCM S16LE 8kHz using ffmpeg (Robust 1st step)
            const ffmpeg = spawn('ffmpeg', [
                '-y',                          // Overwrite output file
                '-i', inputFile,               // Input MP3 file
                '-f', 's16le',                 // Output format: Signed 16-bit Little Endian PCM
                '-ar', '8000',                 // Sample rate: 8kHz
                '-ac', '1',                    // Channels: mono
                '-acodec', 'pcm_s16le',        // Codec: PCM S16LE
                outputFile                     // Output file
            ]);

            let errorOutput = '';

            ffmpeg.stderr.on('data', (data) => {
                errorOutput += data.toString();
            });

            ffmpeg.on('close', (code) => {
                try {
                    // Clean up input file
                    if (fs.existsSync(inputFile)) {
                        fs.unlinkSync(inputFile);
                    }

                    if (code !== 0) {
                        console.error(`[TTS] ffmpeg conversion failed with code ${code}`);
                        console.error(`[TTS] ffmpeg stderr: ${errorOutput}`);
                        reject(new Error(`ffmpeg conversion failed: ${errorOutput}`));
                        return;
                    }

                    // Read converted PCM file
                    if (!fs.existsSync(outputFile)) {
                        console.error(`[TTS] Output file not created: ${outputFile}`);
                        reject(new Error('ffmpeg did not create output file'));
                        return;
                    }

                    const pcmBuffer = fs.readFileSync(outputFile);

                    // Clean up output file
                    fs.unlinkSync(outputFile);

                    if (pcmBuffer.length === 0) {
                        console.error(`[TTS] ❌ ffmpeg produced empty output!`);
                        reject(new Error('ffmpeg produced empty output'));
                        return;
                    }

                    console.log(`[TTS] ✅ Converted MP3 to PCM: ${mp3Buffer.length} bytes → ${pcmBuffer.length} bytes`);

                    // Convert PCM to Mu-Law in JS (Robust 2nd step)
                    const ulawBuffer = pcmToMuLaw(pcmBuffer);

                    console.log(`[TTS] ✅ Encoded PCM to Mu-Law: ${ulawBuffer.length} bytes`);
                    console.log(`[TTS] First 20 bytes (hex): ${ulawBuffer.slice(0, 20).toString('hex')}`);

                    // Verify conversion worked (check for non-silence)
                    const uniqueBytes = new Set(ulawBuffer.slice(0, 100));
                    if (uniqueBytes.size === 1 && uniqueBytes.has(255)) {
                        console.warn(`[TTS] ⚠️ WARNING: Converted audio appears silent!`);
                    } else {
                        console.log(`[TTS] ✅ Audio conversion successful (${uniqueBytes.size} unique byte values)`);
                    }

                    resolve(ulawBuffer);
                } catch (err) {
                    console.error(`[TTS] Error in ffmpeg cleanup/encoding:`, err);
                    reject(err);
                }
            });

            ffmpeg.on('error', (err) => {
                console.error(`[TTS] ffmpeg process error:`, err);
                try {
                    if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile);
                    if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
                } catch (cleanupErr) {
                    console.error(`[TTS] Error cleaning up temp files:`, cleanupErr);
                }
                reject(err);
            });
        } catch (err) {
            console.error(`[TTS] Error setting up ffmpeg conversion:`, err);
            try {
                if (fs.existsSync(inputFile)) fs.unlinkSync(inputFile);
                if (fs.existsSync(outputFile)) fs.unlinkSync(outputFile);
            } catch (cleanupErr) {
                console.error(`[TTS] Error cleaning up temp files:`, cleanupErr);
            }
            reject(err);
        }
    });
}

/**
 * Generate TTS using ElevenLabs
 * @param {string} text - Text to synthesize
 * @param {Object} options - TTS options
 * @param {string} options.voiceId - ElevenLabs voice ID
 * @returns {Promise<Buffer>} - Audio buffer
 */
async function generateElevenLabsTTS(text, options) {
    console.log("[TTS Controller] Routing to ElevenLabs TTS");

    const apiKey = getElevenLabsApiKey();

    if (!apiKey) {
        throw new Error("ElevenLabs API key not configured");
    }

    const voiceId = options.voiceId || "21m00Tcm4TlvDq8ikWAM"; // Default voice
    const outputFormat = options.output_format || options.format || "ulaw_8000";

    console.log(`[TTS] Using provider: ElevenLabs`);
    console.log(`[TTS] Sending request...`);
    console.log(`   Text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    console.log(`   Voice ID: ${voiceId}`);
    console.log(`   Output Format: ${outputFormat}`);
    console.log(`   Model: eleven_turbo_v2_5`);

    try {
        // Construct URL with query parameter for output_format
        const url = new URL(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`);
        url.searchParams.append('output_format', outputFormat);

        const response = await nodeFetch(url.toString(), {
            method: "POST",
            headers: {
                "Accept": "audio/basic", // Use audio/basic for ulaw compatibility
                "Content-Type": "application/json",
                "xi-api-key": apiKey,
            },
            body: JSON.stringify({
                text: text,
                model_id: "eleven_turbo_v2_5",
                voice_settings: {
                    stability: 0.5,
                    similarity_boost: 0.75,
                    style: 0.0,
                    use_speaker_boost: true,
                }
                // output_format is now in the URL query string
            }),
        });

        console.log(`[TTS] ElevenLabs API response status: ${response.status} ${response.statusText}`);
        console.log(`[TTS] Response headers:`, {
            'content-type': response.headers.get('content-type'),
            'content-length': response.headers.get('content-length'),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[TTS] ElevenLabs API error: ${response.status} - ${errorText}`);
            throw new Error(`ElevenLabs API error: ${response.status} - ${response.statusText}`);
        }

        const audioBuffer = await response.buffer();
        console.log(`[TTS] Audio received: ${audioBuffer.length} bytes`);
        console.log(`[TTS] First 20 bytes (hex): ${audioBuffer.slice(0, 20).toString('hex')}`);
        console.log(`[TTS] First 20 bytes (decimal): [${Array.from(audioBuffer.slice(0, 20)).join(', ')}]`);

        // Check if audio is valid
        const uniqueBytes = new Set(audioBuffer.slice(0, 100));
        console.log(`[TTS] Unique byte values in first 100 bytes: ${uniqueBytes.size}`);

        if (uniqueBytes.size === 1) {
            console.warn(`[TTS] ⚠️ WARNING: Audio appears to be silent/corrupt (all bytes are ${Array.from(uniqueBytes)[0]})`);
        }

        if (audioBuffer.length === 0) {
            console.error(`[TTS] ❌ ERROR: Audio buffer is empty!`);
            throw new Error('ElevenLabs returned empty audio buffer');
        }

        // Check if ElevenLabs returned MP3 instead of ulaw (some voices don't support ulaw)
        const contentType = response.headers.get('content-type');
        const isMp3 = contentType && contentType.includes('audio/mpeg');
        const hasId3Header = audioBuffer.slice(0, 3).toString() === 'ID3';

        // If skipTwilioConversion is true, return MP3 as-is (for preview)
        if (options.skipTwilioConversion) {
            console.log(`[TTS] skipTwilioConversion=true, returning audio as-is (${isMp3 || hasId3Header ? 'MP3' : 'raw'} format)`);
            return audioBuffer;
        }

        if (isMp3 || hasId3Header) {
            console.warn(`[TTS] ⚠️ ElevenLabs returned MP3 instead of ulaw. Converting to ulaw_8000 for Twilio...`);
            console.log(`[TTS] Content-Type: ${contentType}`);

            // Convert MP3 to ulaw using file-based ffmpeg (more reliable)
            return await convertMp3ToUlaw(audioBuffer);
        }

        console.log(`[TTS] Audio is already in ulaw format`);
        return audioBuffer;
    } catch (error) {
        console.error("[TTS] Error in ElevenLabs TTS:", error.message);
        console.error("[TTS] Error stack:", error.stack);
        throw error;
    }
}

/**
 * Get available voices from ElevenLabs
 * @returns {Promise<Array>} - List of available voices
 */
async function getAvailableVoices() {
    const apiKey = getElevenLabsApiKey();

    if (!apiKey) {
        throw new Error("ElevenLabs API key not configured");
    }

    try {
        const response = await nodeFetch("https://api.elevenlabs.io/v1/voices", {
            headers: {
                "xi-api-key": apiKey,
            },
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch voices: ${response.statusText}`);
        }

        const data = await response.json();
        return data.voices;
    } catch (error) {
        console.error("Error fetching voices:", error.message);
        throw error;
    }
}

module.exports = {
    generateTTS,
    generateElevenLabsTTS,
    generateSarvamTTS,
    getAvailableVoices,
};
