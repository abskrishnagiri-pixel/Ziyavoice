import React, { useState, useEffect, useCallback, useRef } from 'react';
import { VoiceAgent, ToolType, PreActionPhraseMode, Tool, VoiceAgentSettings, ToolHeader, ToolParameter } from '../types';
import {
    DocumentDuplicateIcon,
    EditIcon,
    ModelIcon,
    VoiceIcon,
    LanguageIcon,
    ToolsIcon,
    AVAILABLE_VOICE_PROVIDERS,
    AVAILABLE_VOICES,
    getVoiceNameById,
    AVAILABLE_MODELS,
    AVAILABLE_LANGUAGES,
    TrashIcon,
    EmbedIcon,
    CustomLlmIcon,
    SipPhoneIcon,
    KnowledgeIcon,
    WebhookIcon,
    PlayIcon,
    CheckIcon,
    MicrophoneIcon,
    getVoiceProviderById,
    AVAILABLE_LANGUAGES_BY_PROVIDER
} from '../constants';
import { PlusIcon, ArrowUpTrayIcon, DocumentTextIcon, XMarkIcon, StopIcon } from '@heroicons/react/24/outline';
import Modal from '../components/Modal';
import { GoogleGenAI, Chat, Modality, LiveServerMessage, type Blob } from '@google/genai';
import { LLMService } from '../services/llmService';
import { getApiBaseUrl } from '../utils/api';
import { DocumentService } from '../services/documentService';
import { ToolExecutionService } from '../services/toolExecutionService';
import { useAuth } from '../contexts/AuthContext';
import { encode, decode } from './audioHelpers';

interface AgentDetailPageProps {
    agent: VoiceAgent;
    onBack: () => void;
    updateAgent: (updatedAgent: VoiceAgent) => void;
    onDuplicate: (agent: VoiceAgent) => void;
    onDelete: (agentId: string) => void;
    userId?: string;
}

const SettingsCard: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => (
    <div className="bg-white dark:bg-darkbg-light rounded-lg shadow-sm">
        <div className="p-6">
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-6">{title}</h3>
            <div className="space-y-6">{children}</div>
        </div>
    </div>
);


interface SettingsToggleProps {
    label: string;
    description: string;
    checked: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    name: string;
    isBeta?: boolean;
    warning?: string;
}

const SettingsToggle: React.FC<SettingsToggleProps> = ({ label, description, checked, onChange, name, isBeta, warning }) => (
    <div className="flex items-start justify-between">
        <div>
            <label htmlFor={name} className="font-medium text-slate-700 dark:text-slate-200 flex items-center">
                {label}
                {isBeta && <span className="ml-2 text-xs font-semibold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Beta</span>}
            </label>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>
            {warning && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Warning: {warning}</p>}
        </div>
        <label className="flex items-center cursor-pointer">
            <div className="relative">
                <input type="checkbox" id={name} name={name} className="sr-only" checked={checked} onChange={onChange} />
                <div className={`block w-11 h-6 rounded-full transition ${checked ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-600'}`}></div>
                <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform ${checked ? 'translate-x-5' : ''}`}></div>
            </div>
        </label>
    </div>
);

const VoiceSelectionModal: React.FC<{
    onClose: () => void;
    onSave: (voiceId: string) => void;
    currentVoiceId: string;
    availableVoices: { [key: string]: { id: string, name: string }[] };
    loadingVoices: boolean;
    playingVoiceId: string | null;
    onPlayPreview: (voiceId: string) => void;
    onStopPreview: () => void;
}> = ({ onClose, onSave, currentVoiceId, availableVoices, loadingVoices, playingVoiceId, onPlayPreview, onStopPreview }) => {
    const [selectedProvider, setSelectedProvider] = useState(() => getVoiceProviderById(currentVoiceId));
    const [selectedVoice, setSelectedVoice] = useState(currentVoiceId);

    // Use API-fetched voices or fallback to hardcoded ones
    const voicesToDisplay = Object.keys(availableVoices).length > 0 ? availableVoices : AVAILABLE_VOICES;

    useEffect(() => {
        const voicesForProvider = voicesToDisplay[selectedProvider] || [];
        if (!voicesForProvider.some(v => v.id === selectedVoice)) {
            setSelectedVoice(voicesForProvider[0]?.id || '');
        }
    }, [selectedProvider, selectedVoice, voicesToDisplay]);

    return (
        <Modal isOpen={true} onClose={onClose} title="Select Voice">
            <div className="space-y-4">
                <div className="border-b border-slate-200 dark:border-slate-700">
                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                        {AVAILABLE_VOICE_PROVIDERS.map(provider => (
                            <button
                                key={provider.id}
                                type="button"
                                onClick={() => setSelectedProvider(provider.id)}
                                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${selectedProvider === provider.id
                                    ? 'border-primary text-primary'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
                                    }`}
                            >
                                {provider.name}
                            </button>
                        ))}
                    </nav>
                </div>
                <div>
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2 mt-4">
                        My Voices {loadingVoices && <span className="text-xs text-slate-500">(Loading...)</span>}
                    </h4>
                    {loadingVoices ? (
                        <div className="flex justify-center items-center h-32">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-md p-2">
                            {(voicesToDisplay[selectedProvider] || []).length === 0 ? (
                                <div className="text-center py-8 text-slate-500">
                                    <p>No voices found</p>
                                    <p className="text-xs mt-2">Check your ElevenLabs API key configuration</p>
                                </div>
                            ) : (
                                (voicesToDisplay[selectedProvider] || []).map(voice => (
                                    <div
                                        key={voice.id}
                                        onClick={() => setSelectedVoice(voice.id)}
                                        className={`flex items-center p-2 rounded-md cursor-pointer transition-colors ${selectedVoice === voice.id
                                            ? 'bg-emerald-100 dark:bg-emerald-900/50'
                                            : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                                            }`}
                                    >
                                        <div className="w-8 h-8 rounded-md bg-slate-200 dark:bg-slate-700 flex items-center justify-center font-bold text-slate-500 mr-3">
                                            {voice.name.charAt(0)}
                                        </div>
                                        <span className="flex-grow font-medium">{voice.name}</span>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                if (playingVoiceId === voice.id) {
                                                    onStopPreview();
                                                } else {
                                                    onPlayPreview(voice.id);
                                                }
                                            }}
                                            className="p-1 text-slate-500 hover:text-primary-dark dark:hover:text-primary-light"

                                        >
                                            {playingVoiceId === voice.id ? (
                                                <StopIcon className="w-5 h-5" />
                                            ) : (
                                                <PlayIcon className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                <button type="button" onClick={onClose} className="bg-slate-200 dark:bg-slate-600 px-4 py-2 rounded-md font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={() => {
                        console.log('Saving voice ID:', selectedVoice);
                        onSave(selectedVoice);
                    }}
                    className="bg-primary text-white px-4 py-2 rounded-md font-semibold hover:bg-primary-dark transition-colors"
                    disabled={!selectedVoice}
                >
                    Save
                </button>
            </div>
        </Modal>
    );
};



const AgentDetailPage: React.FC<AgentDetailPageProps> = ({ agent: initialAgent, onBack, updateAgent, onDuplicate, onDelete, userId }) => {
    const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
    const [agent, setAgent] = useState<VoiceAgent>(initialAgent);
    const [editedAgent, setEditedAgent] = useState<VoiceAgent>(initialAgent);
    const [isEditingPrompt, setIsEditingPrompt] = useState(false);
    const [isActionsDropdownOpen, setActionsDropdownOpen] = useState(false);

    const [isModelModalOpen, setModelModalOpen] = useState(false);
    const [isVoiceModalOpen, setVoiceModalOpen] = useState(false);
    const [isLanguageModalOpen, setLanguageModalOpen] = useState(false);

    const [isToolsModalOpen, setToolsModalOpen] = useState(false);
    const [editingTool, setEditingTool] = useState<Tool | null>(null);

    const [isKnowledgeModalOpen, setKnowledgeModalOpen] = useState(false);

    // Voice preview state
    // State for API-fetched voices
    const [availableVoices, setAvailableVoices] = useState<{ [key: string]: { id: string, name: string }[] }>({});
    const [loadingVoices, setLoadingVoices] = useState(false);
    const playingVoiceRef = useRef<string | null>(null); // Track which voice is playing without causing re-renders
    const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);

    // Call Agent State
    const [callAgentTab, setCallAgentTab] = useState<'web' | 'chat'>('web');
    const [isCallActive, setIsCallActive] = useState(false);

    // Add a useEffect to log when isCallActive changes
    useEffect(() => {
        console.log('isCallActive changed to:', isCallActive);
        // Update the debug ref to track the actual call state
        callActiveDebugRef.current = isCallActive;
    }, [isCallActive]);
    const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'agent', text: string }[]>([]);
    const [currentMessage, setCurrentMessage] = useState('');
    const [isAgentReplying, setIsAgentReplying] = useState(false);
    const [geminiChatSession, setGeminiChatSession] = useState<Chat | null>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Conversation history for voice calls
    const conversationHistoryRef = useRef<{ role: string; text: string }[]>([]);
    const greetingSentRef = useRef<boolean>(false);
    const sessionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const callActiveDebugRef = useRef<boolean>(false);
    const webSocketRef = useRef<WebSocket | null>(null);  // Add this line for WebSocket connection

    const sessionPromiseRef = useRef<Promise<any> | null>(null);
    const inputAudioContextRef = useRef<AudioContext | null>(null);
    const outputAudioContextRef = useRef<AudioContext | null>(null);
    const microphoneStreamRef = useRef<MediaStream | null>(null);
    const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
    const audioWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
    const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
    const nextStartTimeRef = useRef<number>(0);
    const knowledgeCacheRef = useRef<Map<string, string>>(new Map());
    const previewAudioRef = useRef<HTMLAudioElement | null>(null);

    // Prefetch knowledge base documents
    useEffect(() => {
        const prefetchKnowledge = async () => {
            if (editedAgent.settings.knowledgeDocIds && editedAgent.settings.knowledgeDocIds.length > 0 && userId) {
                const documentService = new DocumentService();
                for (const docId of editedAgent.settings.knowledgeDocIds) {
                    if (!knowledgeCacheRef.current.has(docId)) {
                        try {
                            const content = await documentService.getDocumentContent(docId);
                            knowledgeCacheRef.current.set(docId, content);
                            console.log(`Prefetched document: ${docId}`);
                        } catch (error) {
                            console.error(`Error prefetching doc ${docId}:`, error);
                        }
                    }
                }
            }
        };
        prefetchKnowledge();
    }, [editedAgent.settings.knowledgeDocIds, userId]);

    const initialNewToolState: Omit<Tool, 'id' | 'preActionPhrases'> & { preActionPhrases: string } = {
        name: '', description: '', type: ToolType.Webhook, webhookUrl: '', method: 'POST',
        runAfterCall: false, preActionPhrasesMode: PreActionPhraseMode.Flexible, preActionPhrases: '',
        parameters: [],
        headers: [],
    };
    const [newTool, setNewTool] = useState(initialNewToolState);
    const [newToolFunctionType, setNewToolFunctionType] = useState<'Webhook' | 'WebForm' | 'GoogleSheets'>('GoogleSheets');

    const actionsDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
    }, [chatMessages, isAgentReplying]);
    useEffect(() => {
        // For Gemini models, we don't need a persistent chat session since it's stateless
        const isGeminiModel = editedAgent.model.startsWith('gemini');

        // Only initialize a real chat session for compatible Gemini models
        if (editedAgent && editedAgent.identity && isGeminiModel) {
            if (!API_KEY) {
                setChatMessages([{ sender: 'agent' as const, text: 'The API_KEY is not configured. Chat and voice features are disabled.' }]);
                setGeminiChatSession(null);
                return;
            }

            try {
                const ai = new GoogleGenAI({ apiKey: API_KEY });
                const chat = ai.chats.create({
                    model: editedAgent.model,
                    config: { systemInstruction: editedAgent.identity },
                    history: [],
                });
                setGeminiChatSession(chat);
                setChatMessages([]); // Reset chat on agent/model change
            } catch (error) {
                console.error("Failed to initialize Gemini chat session:", error);
                setChatMessages([{ sender: 'agent' as const, text: 'Error: Could not connect to the AI model.' }]);
                setGeminiChatSession(null);
            }
        } else {
            // For other models or when identity is missing
            setGeminiChatSession(null);
            setChatMessages([]);
            // Clear conversation history
            conversationHistoryRef.current = [];
        }
    }, [editedAgent.id, editedAgent.identity, editedAgent.model, API_KEY]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (actionsDropdownRef.current && !actionsDropdownRef.current.contains(event.target as Node)) {
                setActionsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch available voices from API
    useEffect(() => {
        const fetchVoices = async () => {
            try {
                setLoadingVoices(true);

                // Use the correct API base URL
                const apiBaseUrl = getApiBaseUrl();
                // Fetch all voices from all providers
                const url = `${apiBaseUrl}/api/voices?provider=all`;

                console.log('🔍 Fetching voices from:', url);

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ Voice fetch error:', response.status, errorText);
                    throw new Error(`Failed to fetch voices: ${response.status}`);
                }

                // Check if response is JSON
                const contentType = response.headers.get('content-type');
                if (!contentType || !contentType.includes('application/json')) {
                    const textResponse = await response.text();
                    console.error('❌ Non-JSON response:', textResponse.substring(0, 200));
                    throw new Error('Server returned non-JSON response');
                }

                const data = await response.json();
                console.log('✅ Voices data received:', data);

                if (data.success && data.voices) {
                    // Transform API response to match the expected format
                    const voicesByProvider: { [key: string]: { id: string, name: string }[] } = {
                        'eleven-labs': [],
                        'sarvam': []
                    };

                    data.voices.forEach((voice: any) => {
                        // Map backend provider names to frontend IDs
                        if (voice.provider === 'elevenlabs') {
                            voicesByProvider['eleven-labs'].push({
                                id: voice.provider_voice_id,
                                name: voice.display_name
                            });
                        } else if (voice.provider === 'sarvam') {
                            voicesByProvider['sarvam'].push({
                                // Sarvam voices might need a prefix or handled as is. 
                                // Using provider_voice_id directly as that's what we likely store.
                                id: voice.provider_voice_id,
                                name: voice.display_name
                            });
                        }
                    });

                    console.log('✅ Transformed voices:', voicesByProvider);
                    setAvailableVoices(voicesByProvider);
                } else {
                    throw new Error('Invalid response format from API');
                }
            } catch (error) {
                console.error('❌ Error fetching voices:', error);
                // Don't alert on error to avoid annoying the user if backend is down, just log it
                // alert(`Failed to load voices: ${error.message}. Using default voices.`);
                // Fallback to hardcoded voices if API fails
                setAvailableVoices(AVAILABLE_VOICES);
            } finally {
                setLoadingVoices(false);
            }
        };

        fetchVoices();
    }, []);
    // Audio helper functions

    const decodeAudioData = async (
        data: Uint8Array,
        ctx: AudioContext,
        sampleRate: number,
        numChannels: number,
    ): Promise<AudioBuffer> => {
        const dataInt16 = new Int16Array(data.buffer);
        const frameCount = dataInt16.length / numChannels;
        const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

        for (let channel = 0; channel < numChannels; channel++) {
            const channelData = buffer.getChannelData(channel);
            for (let i = 0; i < frameCount; i++) {
                channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
            }
        }
        return buffer;
    };

    const createBlob = (data: Float32Array): Blob => {
        const l = data.length;
        const int16 = new Int16Array(l);
        for (let i = 0; i < l; i++) {
            int16[i] = data[i] * 32768;
        }
        return {
            data: encode(new Uint8Array(int16.buffer)),
            mimeType: 'audio/pcm;rate=16000',
        };
    };

    // Helper functions to pause and resume speech recognition
    const pauseRecognition = () => {
        try { speechRecognitionRef.current?.stop(); } catch { }
    };

    const resumeRecognition = () => {
        // Add a small delay before resuming to ensure TTS has fully ended
        setTimeout(() => {
            const isCallActuallyActive = isCallActive || callActiveDebugRef.current;
            if (isCallActuallyActive) {
                try {
                    if (speechRecognitionRef.current) {
                        speechRecognitionRef.current.start();
                        console.log('Speech recognition resumed successfully');
                    }
                } catch (error) {
                    console.error('Error resuming speech recognition:', error);
                    // If we can't resume due to invalid state, try to reinitialize
                    if (error.name === 'InvalidStateError') {
                        try {
                            if (speechRecognitionRef.current) {
                                try {
                                    speechRecognitionRef.current.stop();
                                } catch (stopError) {
                                    // Ignore stop errors
                                }
                            }
                            speechRecognitionRef.current = initializeSpeechRecognition();
                            if (speechRecognitionRef.current) {
                                speechRecognitionRef.current.start();
                                console.log('Speech recognition reinitialized and started after resume error');
                            }
                        } catch (reinitError) {
                            console.error('Failed to reinitialize speech recognition after resume error:', reinitError);
                        }
                    }
                }
            } else {
                console.log('Skipping speech recognition resume - call is no longer active');
            }
        }, 150); // Small delay to ensure TTS has fully ended
    };

    // Function to convert text to speech using Eleven Labs
    const convertTextToSpeech = async (text: string) => {
        try {
            // Get Eleven Labs API key from environment variables
            const elevenLabsApiKey = import.meta.env.VITE_ELEVEN_LABS_API_KEY;
            if (!elevenLabsApiKey) {
                throw new Error('Eleven Labs API key is not configured');
            }

            // Create Eleven Labs client
            // @ts-ignore
            const elevenLabsClient = new ElevenLabsClient({
                apiKey: elevenLabsApiKey
            });

            // Map voice IDs to Eleven Labs voice IDs
            const elevenLabsVoiceMap: { [key: string]: string } = {
                'eleven-rachel': '21m00Tcm4TlvDq8ikWAM',
                'eleven-drew': '29vD33N1CtxCmqQRPOHJ',
                'eleven-clyde': '2EiwWnXFnvU5JabPnv8n',
                'eleven-zara': 'D38z5RcWu1voky8WS1ja',
                'eleven-indian-monika': '1qEiC6qsybMkmnNdVMbK',
                'eleven-indian-sagar': 'Qc0h5B5Mqs8oaH4sFZ9X'
            };

            const elevenLabsVoiceId = elevenLabsVoiceMap[editedAgent.voiceId] || editedAgent.voiceId;

            // Convert text to speech using Eleven Labs
            // @ts-ignore
            const audioStream = await elevenLabsClient.textToSpeech.convert(
                elevenLabsVoiceId,
                {
                    text: text,
                    modelId: 'eleven_multilingual_v2',
                    voiceSettings: {
                        stability: 0.5,
                        similarityBoost: 0.5
                    }
                }
            );

            // Play the audio
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const arrayBuffer = await new Response(audioStream).arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);

            // Ensure playback happens only once by using a flag
            let playbackStarted = false;
            return new Promise<void>((resolve) => {
                source.onended = () => {
                    if (!playbackStarted) {
                        playbackStarted = true;
                        resolve();
                    }
                };
                // Additional safety to prevent multiple starts
                if (!playbackStarted) {
                    playbackStarted = true;
                    source.start();
                }
            });
        } catch (error) {
            console.error('Error converting text to speech:', error);
            throw error;
        }
    };

    // Helper function to convert Float32Array to WAV format
    const convertFloat32ToWav = async (float32Array: Float32Array, sampleRate: number): Promise<ArrayBuffer> => {
        const buffer = new ArrayBuffer(44 + float32Array.length * 2);
        const view = new DataView(buffer);

        // WAV header
        const writeString = (offset: number, string: string) => {
            for (let i = 0; i < string.length; i++) {
                view.setUint8(offset + i, string.charCodeAt(i));
            }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, 36 + float32Array.length * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true);
        view.setUint16(20, 1, true);
        view.setUint16(22, 1, true);
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, float32Array.length * 2, true);

        // Convert float32 to int16
        let offset = 44;
        for (let i = 0; i < float32Array.length; i++) {
            const s = Math.max(-1, Math.min(1, float32Array[i]));
            view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
            offset += 2;
        }

        return buffer;
    };

    // Voice preview functions
    const playVoicePreview = async (voiceId: string, text?: string) => {
        try {
            playingVoiceRef.current = voiceId;

            // Stop any currently playing preview
            if (previewAudioRef.current) {
                previewAudioRef.current.pause();
                previewAudioRef.current = null;
                setPreviewAudio(null);
            }

            // Generate preview audio
            const apiBaseUrl = getApiBaseUrl();
            const response = await fetch(`${apiBaseUrl}/api/voices/${voiceId}/preview`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text || "Hello, this is a preview of the selected voice."
                })
            });

            const result = await response.json();

            if (result.success) {
                // Create audio from base64 data
                const audioSrc = result.audioData.startsWith('data:')
                    ? result.audioData
                    : `data:audio/mpeg;base64,${result.audioData}`;
                const audio = new Audio(audioSrc);
                previewAudioRef.current = audio;
                setPreviewAudio(audio);
                audio.play();

                // Set up event listeners
                audio.onended = () => {
                    playingVoiceRef.current = null;
                    previewAudioRef.current = null;
                    setPreviewAudio(null);
                };

                audio.onerror = () => {
                    playingVoiceRef.current = null;
                    previewAudioRef.current = null;
                    setPreviewAudio(null);
                };
            } else {
                throw new Error(result.message || 'Failed to generate voice preview');
            }
        } catch (error) {
            console.error('Error playing voice preview:', error);
            alert('Failed to play voice preview: ' + (error instanceof Error ? error.message : 'Unknown error'));
            playingVoiceRef.current = null;
        }
    };

    const stopVoicePreview = () => {
        if (previewAudioRef.current) {
            previewAudioRef.current.pause();
            previewAudioRef.current = null;
            setPreviewAudio(null);
        }
        playingVoiceRef.current = null;
    };

    // Speech recognition reference
    const speechRecognitionRef = useRef<any>(null);
    // Speech recognition retry count for exponential backoff
    const speechRecognitionRetryCountRef = useRef<number>(0);
    const speechRecognitionMaxRetries = 5;

    // Function to initialize speech recognition
    // NOTE: We're removing browser-based speech recognition and will use ElevenLabs STT through backend
    const initializeSpeechRecognition = useCallback(() => {
        // For ElevenLabs STT, we don't initialize browser speech recognition
        // Instead, we'll handle audio streaming through WebSocket to backend
        console.log('Using ElevenLabs STT through backend WebSocket connection');
        return null;
    }, [editedAgent]);

    // Enhanced startCall function with BrowserVoiceHandler (all API keys handled on backend)
    const startCall = async () => {
        console.log('🎙️ Starting browser voice call...');

        console.log('Setting isCallActive to true');
        console.log('Call stack for setting isCallActive to true:', new Error().stack);
        // Set a flag to prevent immediate false setting
        callActiveDebugRef.current = true;
        setIsCallActive(true);

        // Clear any existing timeouts
        if (sessionTimeoutRef.current) {
            clearTimeout(sessionTimeoutRef.current);
            sessionTimeoutRef.current = null;
        }

        // Set up session timeout if enabled
        console.log('Setting up session timeout. Duration:', editedAgent.settings.sessionTimeoutFixedDuration);
        if (editedAgent.settings.sessionTimeoutFixedDuration > 0) {
            const timeoutMs = editedAgent.settings.sessionTimeoutFixedDuration * 1000;
            console.log('Session timeout will trigger in', editedAgent.settings.sessionTimeoutFixedDuration, 'seconds (', timeoutMs, 'ms)');
            // Make sure the timeout is reasonable (at least 1 second)
            if (timeoutMs >= 1000) {
                sessionTimeoutRef.current = setTimeout(() => {
                    console.log('Session timeout triggered');
                    const isCallActuallyActive = isCallActive || callActiveDebugRef.current;
                    if (isCallActuallyActive) {
                        alert(editedAgent.settings.sessionTimeoutEndMessage || "Your session has ended.");
                        // Don't automatically stop the call
                        // The user should explicitly click the stop button
                        // stopCall();
                    }
                }, timeoutMs);
            } else {
                console.log('Skipping session timeout setup because duration is too short:', timeoutMs, 'ms');
            }
        } else {
            console.log('No session timeout set or duration is 0');
        }

        try {
            // Set up audio processing for the live session
            console.log('Setting up audio processing for live session');

            let stream: MediaStream;
            try {
                stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                microphoneStreamRef.current = stream;
            } catch (error) {
                console.error('Failed to get microphone access:', error);
                alert('Microphone access is required for voice calls. Please enable microphone permissions and try again.');
                // Set isCallActive to false since we couldn't get microphone access
                setIsCallActive(false);
                return;
            }

            try {
                inputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
                const source = inputAudioContextRef.current.createMediaStreamSource(stream);
                // TODO: Replace ScriptProcessorNode with AudioWorkletNode for better performance
                // ScriptProcessorNode is deprecated but still widely supported
                // AudioWorkletNode would provide better performance and is the recommended approach
                scriptProcessorRef.current = inputAudioContextRef.current.createScriptProcessor(4096, 1, 1);
                source.connect(scriptProcessorRef.current);
                scriptProcessorRef.current.connect(inputAudioContextRef.current.destination);

                // DO NOT set up audio processing yet - wait for WebSocket connection
                // It will be set up after WebSocket connects
            } catch (error) {
                console.error('Failed to create audio context:', error);
                alert('Failed to initialize audio processing. Please try again.');
                // Set isCallActive to false since we couldn't initialize audio processing
                setIsCallActive(false);
                return;
            }

            // Initialize WebSocket connection to backend for Google Voice Stream processing (STT + Gemini + TTS)
            try {
                const isCallActuallyActive = isCallActive || callActiveDebugRef.current;
                console.log('Initializing WebSocket connection for Google Voice Stream processing. isCallActuallyActive:', isCallActuallyActive);

                if (isCallActuallyActive) {
                    // Ensure we have microphone access before starting
                    console.log('Starting WebSocket connection. Microphone stream available:', !!microphoneStreamRef.current);
                    if (microphoneStreamRef.current) {
                        // Add a small delay to ensure everything is ready
                        setTimeout(() => {
                            try {
                                // Check if the call is still active before starting
                                const isCallStillActive = isCallActive || callActiveDebugRef.current;
                                if (isCallStillActive) {
                                    // Establish WebSocket connection to backend using the new BrowserVoiceHandler
                                    const apiBaseUrl = getApiBaseUrl();
                                    const wsProtocol = apiBaseUrl.startsWith('https') ? 'wss:' : 'ws:';
                                    const wsHost = new URL(apiBaseUrl).host;
                                    // Pass the agent's voice ID and identity as query parameters
                                    const voiceId = editedAgent.voiceId || 'default';
                                    const agentId = editedAgent.id;
                                    const agentIdentity = encodeURIComponent(editedAgent.identity || '');
                                    const wsUrl = `${wsProtocol}//${wsHost}/browser-voice-stream?voiceId=${encodeURIComponent(voiceId)}&agentId=${agentId}&identity=${agentIdentity}&userId=${userId || ''}`;
                                    console.log('🌐 Connecting to Browser Voice Stream with voiceId:', voiceId, 'agentId:', agentId);
                                    webSocketRef.current = new WebSocket(wsUrl);

                                    webSocketRef.current.onopen = () => {
                                        console.log('WebSocket connection established successfully for voice stream');
                                        console.log('WebSocket readyState:', webSocketRef.current?.readyState);
                                        // Reset retry count on successful start
                                        speechRecognitionRetryCountRef.current = 0;

                                        // NOW set up audio processing after WebSocket is connected
                                        if (scriptProcessorRef.current) {
                                            scriptProcessorRef.current.onaudioprocess = (audioProcessingEvent) => {
                                                // Send audio data to backend via WebSocket for voice stream processing
                                                if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
                                                    const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);

                                                    // Check if there's actual audio data
                                                    let hasAudio = false;
                                                    for (let i = 0; i < inputData.length; i++) {
                                                        if (Math.abs(inputData[i]) > 0.01) {
                                                            hasAudio = true;
                                                            break;
                                                        }
                                                    }

                                                    if (hasAudio) {
                                                        // console.log('Audio detected, sending to server');
                                                    }

                                                    // Convert float32 to int16
                                                    const int16Data = new Int16Array(inputData.length);
                                                    for (let i = 0; i < inputData.length; i++) {
                                                        int16Data[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
                                                    }

                                                    // Send audio data as base64 (binary-safe encoding)
                                                    const uint8Array = new Uint8Array(int16Data.buffer);
                                                    let binary = '';
                                                    const chunkSize = 0x8000; // Process in chunks to avoid call stack size exceeded
                                                    for (let i = 0; i < uint8Array.length; i += chunkSize) {
                                                        const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
                                                        binary += String.fromCharCode.apply(null, Array.from(chunk));
                                                    }
                                                    const base64Data = btoa(binary);
                                                    webSocketRef.current.send(JSON.stringify({
                                                        event: 'audio',
                                                        data: base64Data
                                                    }));
                                                } else {
                                                    console.log('WebSocket not ready for audio. State:', webSocketRef.current?.readyState);
                                                }
                                            };
                                            console.log('Audio processing enabled after WebSocket connected');
                                        }

                                        // Set up heartbeat to keep connection alive
                                        const heartbeatInterval = setInterval(() => {
                                            if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
                                                webSocketRef.current.send(JSON.stringify({ event: 'ping' }));
                                            }
                                        }, 10000); // Send ping every 10 seconds

                                        // Store interval ID so we can clear it later
                                        (webSocketRef.current as any).heartbeatInterval = heartbeatInterval;
                                    };

                                    webSocketRef.current.onmessage = async (event) => {
                                        const data = JSON.parse(event.data);
                                        console.log('Received message from server:', data.event); // Log event only to reduce noise

                                        // Handle error messages
                                        if (data.event === 'error') {
                                            console.error('Server error:', data.message);
                                            return;
                                        }

                                        // Handle ping/pong messages
                                        if (data.event === 'ping') {
                                            if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
                                                webSocketRef.current.send(JSON.stringify({ event: 'pong' }));
                                            }
                                            return;
                                        }

                                        if (data.event === 'pong') {
                                            return;
                                        }

                                        if (data.event === 'transcript' && data.text) {
                                            // Update UI with user speech
                                            console.log('User detected:', data.text);
                                            setChatMessages(prev => [...prev, { sender: 'user', text: data.text }]);
                                            conversationHistoryRef.current.push({ role: 'user', text: data.text });
                                        }

                                        else if (data.event === 'agent-response' && data.text) {
                                            // Update UI with agent response
                                            console.log('Agent response:', data.text);
                                            setChatMessages(prev => [...prev, { sender: 'agent', text: data.text }]);
                                            conversationHistoryRef.current.push({ role: 'model', text: data.text });
                                        }

                                        else if (data.event === 'stop-audio') {
                                            // Interruption handling - stop current playback
                                            if (audioSourcesRef.current) {
                                                audioSourcesRef.current.forEach(source => {
                                                    try { source.stop(); } catch (e) { }
                                                });
                                                audioSourcesRef.current.clear();
                                            }
                                        }

                                        else if (data.event === 'audio' && data.audio) {
                                            // Play audio response from backend
                                            try {
                                                console.log('Playing agent response audio');

                                                // Use the output audio context we already have
                                                if (!outputAudioContextRef.current) {
                                                    outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
                                                }

                                                const audioContext = outputAudioContextRef.current;
                                                const binary = atob(data.audio);
                                                const array = new Uint8Array(binary.length);
                                                for (let i = 0; i < binary.length; i++) {
                                                    array[i] = binary.charCodeAt(i);
                                                }

                                                const audioBuffer = await audioContext.decodeAudioData(array.buffer);
                                                const source = audioContext.createBufferSource();
                                                source.buffer = audioBuffer;
                                                source.connect(audioContext.destination);

                                                // Store reference to stop previous audio if needed
                                                audioSourcesRef.current.forEach(prevSource => {
                                                    try {
                                                        prevSource.stop();
                                                    } catch (error) {
                                                        console.error('Error stopping previous audio:', error);
                                                    }
                                                });
                                                audioSourcesRef.current.clear();

                                                // Store this source and play it
                                                audioSourcesRef.current.add(source);
                                                source.start();
                                                console.log('Agent audio started playing');
                                            } catch (error) {
                                                console.error('Error playing audio response:', error);
                                            }
                                        }
                                    };

                                    webSocketRef.current.onerror = (error) => {
                                        console.error('WebSocket error:', error);
                                        // Try to reconnect on error
                                        setTimeout(() => {
                                            const isCallStillActive = isCallActive || callActiveDebugRef.current;
                                            if (isCallStillActive && !webSocketRef.current) {
                                                console.log('Attempting to reconnect WebSocket...');
                                                // Re-establish WebSocket connection
                                                const apiBaseUrl = getApiBaseUrl();
                                                const wsProtocol = apiBaseUrl.startsWith('https') ? 'wss:' : 'ws:';
                                                const wsHost = new URL(apiBaseUrl).host;
                                                const voiceId = editedAgent.voiceId || 'default';
                                                const agentId = editedAgent.id;
                                                const agentIdentity = encodeURIComponent(editedAgent.identity || '');
                                                const wsUrl = `${wsProtocol}//${wsHost}/browser-voice-stream?voiceId=${encodeURIComponent(voiceId)}&agentId=${agentId}&identity=${agentIdentity}&userId=${userId || ''}`;
                                                webSocketRef.current = new WebSocket(wsUrl);
                                            }
                                        }, 1000);
                                    };

                                    webSocketRef.current.onclose = (event) => {
                                        console.log('WebSocket connection closed', event);
                                        console.log('Close code:', event.code);
                                        console.log('Close reason:', event.reason);
                                        console.log('Was clean:', event.wasClean);
                                        // Clear heartbeat interval
                                        if (webSocketRef.current && (webSocketRef.current as any).heartbeatInterval) {
                                            clearInterval((webSocketRef.current as any).heartbeatInterval);
                                        }
                                        // Clear reference on close
                                        webSocketRef.current = null;
                                    };
                                } else {
                                    console.log('Skipping WebSocket connection - call no longer active');
                                }
                            } catch (startError) {
                                console.error('Error establishing WebSocket connection:', startError);
                            }
                        }, 750); // Increased delay to 750ms to ensure everything is ready
                    } else {
                        console.error('Cannot start WebSocket connection: No microphone stream available');
                    }
                } else {
                    console.log('WebSocket connection not started. Call active:', isCallActuallyActive);
                }
            } catch (error) {
                console.error('Error initializing WebSocket connection:', error);
                // Don't let connection errors kill the entire call
                console.log('WebSocket connection failed to initialize, but continuing call');
            };

            console.log('Audio processing started successfully');
        } catch (error) {
            console.error('Failed to start call:', error);
            alert('Could not start the call. Please ensure you have given microphone permissions.');
            // Only set isCallActive to false if it was true, to avoid timing issues
            const isCallActuallyActive = isCallActive || callActiveDebugRef.current;
            if (isCallActuallyActive) {
                console.log('Setting isCallActive to false in error handler');
                console.log('Call stack for setting isCallActive to false in error handler:', new Error().stack);
                setIsCallActive(false);
            }
        }
    };

    // The Web Speech API is used for real-time speech recognition instead of ElevenLabs STT
    // ElevenLabs STT is designed for file transcription, not real-time streaming

    const stopCall = useCallback(() => {
        console.log('Stopping call...');
        console.log('Setting isCallActive to false');
        console.log('Call stack for setting isCallActive to false:', new Error().stack);
        setIsCallActive(false);
        // Reset the greeting sent flag when stopping the call
        greetingSentRef.current = false;

        // Stop audio processing
        if (scriptProcessorRef.current) {
            scriptProcessorRef.current.onaudioprocess = null;
        }

        // Close WebSocket connection if active
        if (webSocketRef.current) {
            webSocketRef.current.close();
            webSocketRef.current = null;
            console.log('Closed WebSocket connection for Google Voice Stream processing');
        }

        // Reset speech recognition retry count
        speechRecognitionRetryCountRef.current = 0;

        // Clear any existing timeouts
        if (sessionTimeoutRef.current) {
            clearTimeout(sessionTimeoutRef.current);
            sessionTimeoutRef.current = null;
        }

        // Reset audio sources
        audioSourcesRef.current.clear();
        nextStartTimeRef.current = 0;

        if (outputAudioContextRef.current) {
            try {
                outputAudioContextRef.current.close();
            } catch (error) {
                console.error('Error closing output audio context:', error);
                // Continue cleanup even if there's an error
            }
        }
        outputAudioContextRef.current = null;

        // Clear conversation history when call ends
        conversationHistoryRef.current = [];
    }, []);

    // Cleanup effect for voice call resources
    useEffect(() => {
        return () => {
            // Cleanup when component unmounts
            console.log('Cleaning up voice call resources');

            // Clear any existing timeouts
            if (sessionTimeoutRef.current) {
                clearTimeout(sessionTimeoutRef.current);
                sessionTimeoutRef.current = null;
            }

            try {
                microphoneStreamRef.current?.getTracks().forEach(track => track.stop());
            } catch (error) {
                console.error('Error stopping microphone tracks:', error);
                // Continue cleanup even if there's an error
            }
            microphoneStreamRef.current = null;

            try {
                scriptProcessorRef.current?.disconnect();
            } catch (error) {
                console.error('Error disconnecting script processor:', error);
                // Continue cleanup even if there's an error
            }
            scriptProcessorRef.current = null;

            if (inputAudioContextRef.current) {
                try {
                    inputAudioContextRef.current.close();
                } catch (error) {
                    console.error('Error closing input audio context:', error);
                    // Continue cleanup even if there's an error
                }
            }
            inputAudioContextRef.current = null;

            audioSourcesRef.current.forEach(source => {
                try {
                    source.stop();
                } catch (error) {
                    console.error('Error stopping audio source:', error);
                    // Continue cleanup even if there's an error
                }
            });

            // Reset the greeting sent flag
            greetingSentRef.current = false;

            // Reset speech recognition retry count
            speechRecognitionRetryCountRef.current = 0;
        }
    }, []);

    // Initialize the call with AI greeting if userStartsFirst is false
    useEffect(() => {
        // Client-side greeting logic disabled - now handled by server-side DeepgramBrowserHandler
        console.log("Client-side greeting disabled. Server will handle greeting.");
    }, [isCallActive]);

    // Enhanced conversation processing with knowledge base integration
    const processConversationTurn = async (userInput: string) => {
        try {
            // Add user input to conversation history
            conversationHistoryRef.current.push({ role: 'user', text: userInput });

            // Check for knowledge base documents
            let knowledgeBaseContent = '';
            const hasKnowledge = editedAgent.settings.knowledgeDocIds && editedAgent.settings.knowledgeDocIds.length > 0 && userId;

            if (hasKnowledge) {
                // Play pre-action phrase immediately
                const defaultPhrases = ["Please wait, let me check the database for more details.", "Let me check my records.", "One moment, let me look that up."];
                // Use user-defined phrases if available, otherwise use defaults
                // The user specifically requested "please wait let me check the database for more details"
                let phrases = editedAgent.settings.preActionPhrases;
                if (!phrases || phrases.length === 0) {
                    phrases = defaultPhrases;
                }
                const phrase = phrases[Math.floor(Math.random() * phrases.length)];

                // Play phrase without awaiting to allow parallel processing
                // This gives immediate feedback while the LLM processes
                playVoicePreview(editedAgent.voiceId, phrase).catch(err => console.error("Error playing pre-action phrase:", err));

                try {
                    const documentService = new DocumentService();
                    const docContents = await Promise.all(
                        editedAgent.settings.knowledgeDocIds.map(async (docId) => {
                            if (knowledgeCacheRef.current.has(docId)) {
                                return knowledgeCacheRef.current.get(docId)!;
                            }
                            const content = await documentService.getDocumentContent(docId);
                            knowledgeCacheRef.current.set(docId, content);
                            return content;
                        })
                    );
                    knowledgeBaseContent = docContents.filter(content => content).join('\n\n');
                } catch (error) {
                    console.error('Error fetching knowledge base documents:', error);
                }
            }

            // Send text to LLM for response with full conversation history
            const llmService = new LLMService(import.meta.env.VITE_GEMINI_API_KEY);

            // Prepare contents for API with complete conversation history
            const contentsForApi = conversationHistoryRef.current.map(msg => ({
                role: msg.role === 'agent' ? 'model' : 'user',
                parts: [{ text: msg.text }]
            }));

            // Enhance system instruction with knowledge base content if available
            let systemInstruction = editedAgent.identity;
            if (knowledgeBaseContent) {
                systemInstruction += `\n\nKnowledge Base:\n${knowledgeBaseContent}`;
            }

            // Add tool information to system instruction if tools are configured
            if (editedAgent.settings.tools && editedAgent.settings.tools.length > 0) {
                const toolDescriptions = editedAgent.settings.tools.map(tool =>
                    `- ${tool.name}: ${tool.description} (Parameters: ${tool.parameters?.map(p => `${p.name} (${p.type})${p.required ? ' [required]' : ''}`).join(', ') || 'None'})`
                ).join('\n');

                systemInstruction += `

Available Tools:
${toolDescriptions}

When you need to collect information from the user, ask for the required parameters. When all required information is collected, respond with a JSON object in the format: {"tool": "tool_name", "data": {"param1": "value1", "param2": "value2"}}`;
            }

            // Generate response using LLM with conversation context
            const result = await llmService.generateContent({
                model: editedAgent.model,
                contents: contentsForApi,
                config: { systemInstruction }
            });

            let agentResponse = result.text;

            // Check if the response contains tool execution instructions
            try {
                const jsonResponse = JSON.parse(agentResponse);
                if (jsonResponse.tool && jsonResponse.data) {
                    // Execute the tool
                    const toolExecutionService = new ToolExecutionService();
                    const tool = editedAgent.settings.tools.find(t => t.name === jsonResponse.tool);

                    if (tool) {
                        const success = await toolExecutionService.executeTool(tool, jsonResponse.data);

                        if (success) {
                            agentResponse = `I've successfully collected that information and saved it to ${tool.name}.`;
                        } else {
                            agentResponse = `I encountered an issue while saving your information to ${tool.name}. Let's try again.`;
                        }
                    } else {
                        agentResponse = `I couldn't find the tool "${jsonResponse.tool}". Let's continue our conversation.`;
                    }
                }
            } catch (e) {
                // Not a JSON response, continue with normal response
            }

            // Add agent response to conversation history
            conversationHistoryRef.current.push({ role: 'agent', text: agentResponse });

            // Stop any pre-action phrase playing before starting response audio
            stopVoicePreview();

            // Get Eleven Labs API key from environment variables
            const elevenLabsApiKey = import.meta.env.VITE_ELEVEN_LABS_API_KEY;
            if (!elevenLabsApiKey) {
                throw new Error('Eleven Labs API key is not configured');
            }

            // Create Eleven Labs client
            // @ts-ignore
            const elevenLabsClient = new ElevenLabsClient({
                apiKey: elevenLabsApiKey
            });

            // Map voice IDs to Eleven Labs voice IDs
            const elevenLabsVoiceMap: { [key: string]: string } = {
                'eleven-rachel': '21m00Tcm4TlvDq8ikWAM',
                'eleven-drew': '29vD33N1CtxCmqQRPOHJ',
                'eleven-clyde': '2EiwWnXFnvU5JabPnv8n',
                'eleven-zara': 'D38z5RcWu1voky8WS1ja',
                'eleven-indian-monika': '1qEiC6qsybMkmnNdVMbK',
                'eleven-indian-sagar': 'Qc0h5B5Mqs8oaH4sFZ9X'
            };

            const elevenLabsVoiceId = elevenLabsVoiceMap[editedAgent.voiceId] || editedAgent.voiceId;

            // Convert response to speech using Eleven Labs
            // @ts-ignore
            const audioStream = await elevenLabsClient.textToSpeech.convert(
                elevenLabsVoiceId,
                {
                    text: agentResponse,
                    modelId: 'eleven_multilingual_v2',
                    voiceSettings: {
                        stability: 0.5,
                        similarityBoost: 0.5
                    }
                }
            );

            // Play the response with race condition protection
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const arrayBuffer = await new Response(audioStream).arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);

            // Prevent race conditions by ensuring playback happens only once
            let playbackStarted = false;
            const startPlayback = () => {
                if (!playbackStarted) {
                    playbackStarted = true;
                    pauseRecognition();
                    source.start();
                }
            };

            // Set up completion handler
            source.onended = () => {
                if (playbackStarted) {
                    resumeRecognition();
                }
            };

            // Start playback
            startPlayback();

            console.log('Conversation turn processed:', { userInput, agentResponse });
            return agentResponse;
        } catch (error) {
            console.error('Error processing conversation turn:', error);
            // Still resume recognition even if there's an error
            resumeRecognition();
            throw error;
        }
    };

    const handleSettingsChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;

        const nameParts = name.split('.');
        setEditedAgent(prev => {
            // Create a safe copy of the agent object
            const newAgent = { ...prev };

            // Ensure settings object exists
            if (!newAgent.settings) {
                newAgent.settings = {};
            }

            let currentLevel: any = newAgent;

            for (let i = 0; i < nameParts.length - 1; i++) {
                if (!currentLevel[nameParts[i]]) {
                    currentLevel[nameParts[i]] = {};
                }
                currentLevel = currentLevel[nameParts[i]];
            }

            const finalKey = nameParts[nameParts.length - 1];

            if (type === 'checkbox') {
                currentLevel[finalKey] = (e.target as HTMLInputElement).checked;
            } else if (type === 'number' || e.target.dataset.type === 'number') {
                currentLevel[finalKey] = parseFloat(value) || 0;
            } else {
                currentLevel[finalKey] = value;
            }

            // Update the agent with error handling
            try {
                updateAgent(newAgent);
            } catch (error) {
                console.error('Error updating agent settings:', error);
                // Don't prevent the UI from updating even if the backend fails
            }

            return newAgent;
        });
    }, [updateAgent]);



    const copyToClipboard = (text: string, type: string) => navigator.clipboard.writeText(text).then(() => alert(`${type} copied to clipboard!`));

    const handleSavePrompt = () => {
        setIsEditingPrompt(false);
        updateAgent(editedAgent);
    };
    const handleCancelPrompt = () => { setEditedAgent(p => ({ ...p, identity: agent.identity })); setIsEditingPrompt(false); };

    const handleSaveModel = (newModelId: string) => {
        const updatedAgent = { ...editedAgent, model: newModelId };
        setEditedAgent(updatedAgent);
        updateAgent(updatedAgent);
        setModelModalOpen(false);
    };

    const handleSaveVoice = (newVoiceId: string) => {
        console.log('=== SAVING VOICE ===');
        console.log('New Voice ID:', newVoiceId);
        console.log('Current Agent Voice ID:', editedAgent.voiceId);

        let updatedAgent = { ...editedAgent, voiceId: newVoiceId };

        // Auto-update language if the current one is not supported by the new voice provider
        const newProviderId = getVoiceProviderById(newVoiceId);
        const supportedLanguages = AVAILABLE_LANGUAGES_BY_PROVIDER[newProviderId] || AVAILABLE_LANGUAGES;
        const isCurrentLanguageSupported = supportedLanguages.some(lang => lang.id === updatedAgent.language);

        if (!isCurrentLanguageSupported) {
            updatedAgent.language = supportedLanguages[0].id;
        }

        console.log('Updated Agent Voice ID:', updatedAgent.voiceId);
        console.log('===================');

        setEditedAgent(updatedAgent);
        updateAgent(updatedAgent);
        setVoiceModalOpen(false);
    };

    const handleSaveLanguage = (newLanguageId: string) => {
        const updatedAgent = { ...editedAgent, language: newLanguageId };
        setEditedAgent(updatedAgent);
        updateAgent(updatedAgent);
        setLanguageModalOpen(false);
    };

    const handleSubmitTool = () => {
        let finalTool: Tool;

        if (newToolFunctionType === 'GoogleSheets') {
            // For Google Sheets, we create a special tool
            finalTool = {
                ...newTool,
                id: editingTool ? editingTool.id : `tool-${Date.now()}`,
                type: ToolType.GoogleSheets, // Use proper Google Sheets type
                method: 'POST', // Not used for Google Sheets
                headers: [], // Not used for Google Sheets
                preActionPhrases: newTool.preActionPhrases.split(',').map(p => p.trim()).filter(p => p)
            };
        } else {
            // For regular Webhook and WebForm
            finalTool = {
                ...newTool,
                id: editingTool ? editingTool.id : `tool-${Date.now()}`,
                type: newToolFunctionType === 'Webhook' ? ToolType.Webhook : ToolType.WebForm,
                preActionPhrases: newTool.preActionPhrases.split(',').map(p => p.trim()).filter(p => p)
            };
        }

        const updatedAgent = editingTool
            ? { ...editedAgent, settings: { ...editedAgent.settings, tools: editedAgent.settings.tools.map(t => t.id === editingTool.id ? finalTool : t) } }
            : { ...editedAgent, settings: { ...editedAgent.settings, tools: [...editedAgent.settings.tools, finalTool] } };

        setEditedAgent(updatedAgent);
        updateAgent(updatedAgent);
        setToolsModalOpen(false);
        setNewTool(initialNewToolState);
        setEditingTool(null);
    };

    const handleNewToolChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setNewTool(p => ({ ...p, [e.target.name]: e.target.value }));
    const handleEditTool = (tool: Tool) => {
        setEditingTool(tool);
        setNewTool({
            ...tool,
            preActionPhrases: tool.preActionPhrases.join(', '),
            headers: tool.headers || [],
            parameters: tool.parameters || [],
        });
        setNewToolFunctionType(
            tool.type === ToolType.WebForm ? 'WebForm' :
                tool.type === ToolType.GoogleSheets ? 'GoogleSheets' : 'Webhook'
        );
        setToolsModalOpen(true);
    };
    const handleDeleteTool = (toolId: string) => {
        if (window.confirm("Are you sure you want to delete this tool?")) {
            const updatedAgent = { ...editedAgent, settings: { ...editedAgent.settings, tools: editedAgent.settings.tools.filter(t => t.id !== toolId) } };
            setEditedAgent(updatedAgent);
            updateAgent(updatedAgent);
        }
    };

    // Tool Headers and Parameters handlers
    const handleAddHeader = () => setNewTool(prev => ({ ...prev, headers: [...(prev.headers || []), { key: '', value: '' }] }));
    const handleDeleteHeader = (index: number) => setNewTool(prev => ({ ...prev, headers: (prev.headers || []).filter((_, i) => i !== index) }));
    const handleHeaderChange = (index: number, field: keyof ToolHeader, value: string) => {
        setNewTool(prev => {
            const newHeaders = JSON.parse(JSON.stringify(prev.headers || []));
            newHeaders[index][field] = value;
            return { ...prev, headers: newHeaders };
        });
    };

    const handleAddParameter = () => setNewTool(prev => ({ ...prev, parameters: [...(prev.parameters || []), { name: '', type: 'string', required: false }] }));
    const handleDeleteParameter = (index: number) => setNewTool(prev => ({ ...prev, parameters: (prev.parameters || []).filter((_, i) => i !== index) }));
    const handleParameterChange = (index: number, field: keyof ToolParameter, value: string | boolean) => {
        setNewTool(prev => {
            const newParams = JSON.parse(JSON.stringify(prev.parameters || []));
            newParams[index][field] = value;
            return { ...prev, parameters: newParams };
        });
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        const message = currentMessage.trim();
        if (!message || isAgentReplying) return;

        const newMessages = [...chatMessages, { sender: 'user' as const, text: message }];
        setChatMessages(newMessages);
        setCurrentMessage('');
        setIsAgentReplying(true);

        if (geminiChatSession) {
            // Handle real Gemini chat session
            try {
                const stream = await geminiChatSession.sendMessageStream({ message });
                let agentResponseText = '';
                setChatMessages(prev => [...prev, { sender: 'agent' as const, text: '' }]);

                for await (const chunk of stream) {
                    agentResponseText += chunk.text;
                    setChatMessages(prev => {
                        const updatedMessages = [...prev];
                        updatedMessages[updatedMessages.length - 1].text = agentResponseText;
                        return updatedMessages;
                    });
                }

                // Check if the response contains tool execution instructions
                try {
                    const jsonResponse = JSON.parse(agentResponseText);
                    if (jsonResponse.tool && jsonResponse.data) {
                        // Execute the tool
                        const toolExecutionService = new ToolExecutionService();
                        const tool = editedAgent.settings.tools.find(t => t.name === jsonResponse.tool);

                        if (tool) {
                            const success = await toolExecutionService.executeTool(tool, jsonResponse.data);

                            const toolResponse = success
                                ? `I've successfully collected that information and saved it to ${tool.name}.`
                                : `I encountered an issue while saving your information to ${tool.name}. Let's try again.`;

                            setChatMessages(prev => {
                                const updatedMessages = [...prev];
                                updatedMessages[updatedMessages.length - 1].text = toolResponse;
                                return updatedMessages;
                            });
                        }
                    }
                } catch (e) {
                    // Not a JSON response, continue with normal response
                }
            } catch (error) {
                console.error("Gemini API call failed:", error);
                const errorMsg = 'Sorry, an error occurred while trying to respond.';
                setChatMessages(prev => {
                    const updatedMessages = [...prev];
                    if (updatedMessages[updatedMessages.length - 1]?.sender === 'agent') {
                        updatedMessages[updatedMessages.length - 1].text = errorMsg;
                    } else {
                        updatedMessages.push({ sender: 'agent' as const, text: errorMsg });
                    }
                    return updatedMessages;
                });
            } finally {
                setIsAgentReplying(false);
            }
        } else {
            // Handle simulated chat for non-Gemini models using a one-off Gemini call
            if (!API_KEY) {
                setChatMessages(prev => [...prev, { sender: 'agent' as const, text: 'Cannot simulate response. API_KEY is not configured.' }]);
                setIsAgentReplying(false);
                return;
            }
            try {
                // Prepare system instruction with tool information if tools are configured
                let systemInstruction = `You are simulating an AI agent. The user has selected the model named '${editedAgent.model}'. Your instructions are defined by the following identity:\n\n${editedAgent.identity}`;

                // Add tool information to system instruction if tools are configured
                if (editedAgent.settings.tools && editedAgent.settings.tools.length > 0) {
                    const toolDescriptions = editedAgent.settings.tools.map(tool =>
                        `- ${tool.name}: ${tool.description} (Parameters: ${tool.parameters?.map(p => `${p.name} (${p.type})${p.required ? ' [required]' : ''}`).join(', ') || 'None'})`
                    ).join('\n');

                    systemInstruction += `

Available Tools:
${toolDescriptions}

When you need to collect information from the user, ask for the required parameters. When all required information is collected, respond with a JSON object in the format: {"tool": "tool_name", "data": {"param1": "value1", "param2": "value2"}}`;
                }

                const ai = new GoogleGenAI({ apiKey: API_KEY });
                const contentsForApi = newMessages.map(msg => ({
                    role: msg.sender === 'agent' ? 'model' : 'user',
                    parts: [{ text: msg.text }]
                }));

                const stream = await ai.models.generateContentStream({
                    model: 'gemini-2.0-flash',
                    contents: contentsForApi,
                    config: {
                        systemInstruction
                    }
                });

                let agentResponseText = '';
                setChatMessages(prev => [...prev, { sender: 'agent' as const, text: '' }]);

                for await (const chunk of stream) {
                    agentResponseText += chunk.text;
                    setChatMessages(prev => {
                        const updatedMessages = [...prev];
                        updatedMessages[updatedMessages.length - 1].text = agentResponseText;
                        return updatedMessages;
                    });
                }

                // Check if the response contains tool execution instructions
                try {
                    const jsonResponse = JSON.parse(agentResponseText);
                    if (jsonResponse.tool && jsonResponse.data) {
                        // Execute the tool
                        const toolExecutionService = new ToolExecutionService();
                        const tool = editedAgent.settings.tools.find(t => t.name === jsonResponse.tool);

                        if (tool) {
                            const success = await toolExecutionService.executeTool(tool, jsonResponse.data);

                            const toolResponse = success
                                ? `I've successfully collected that information and saved it to ${tool.name}.`
                                : `I encountered an issue while saving your information to ${tool.name}. Let's try again.`;

                            setChatMessages(prev => {
                                const updatedMessages = [...prev];
                                updatedMessages[updatedMessages.length - 1].text = toolResponse;
                                return updatedMessages;
                            });
                        }
                    }
                } catch (e) {
                    // Not a JSON response, continue with normal response
                }
            } catch (error) {
                console.error("Simulated API call failed:", error);
                setChatMessages(prev => [...prev, { sender: 'agent' as const, text: 'Sorry, an error occurred during the simulation.' }]);
            } finally {
                setIsAgentReplying(false);
            }
        }
    };

    const preActionPhraseOptions = [
        { id: PreActionPhraseMode.Disable, label: 'disable', description: 'The agent will execute the action silently without saying anything.' },
        { id: PreActionPhraseMode.Flexible, label: 'flexible', description: 'The agent will generate a phrase based on the examples provided, adjusting for context and language.' },
        { id: PreActionPhraseMode.Strict, label: 'strict', description: 'The agent will say exactly one of the phrases provided, regardless of language.' }
    ];

    const ModelSelectionModal: React.FC<{
        onClose: () => void;
        onSave: (modelId: string) => void;
        currentModelId: string;
    }> = ({ onClose, onSave, currentModelId }) => {
        const [selectedModel, setSelectedModel] = useState(currentModelId);

        return (
            <Modal isOpen={true} onClose={onClose} title="Select Language Model">
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                    {AVAILABLE_MODELS.map(model => (
                        <div
                            key={model.id}
                            onClick={() => setSelectedModel(model.id)}
                            className={`p-4 border rounded-lg cursor-pointer transition-all ${selectedModel === model.id ? 'border-primary ring-2 ring-primary bg-primary/5' : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500'}`}
                        >
                            <div className="flex items-center">
                                <model.icon className="h-8 w-8 mr-4 text-slate-600 dark:text-slate-300 flex-shrink-0" />
                                <div className="flex-grow">
                                    <h4 className="font-semibold text-slate-800 dark:text-slate-100">{model.name}</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">{model.description}</p>
                                </div>
                                <div className="ml-4 flex items-center justify-center w-6 h-6">
                                    {selectedModel === model.id && (
                                        <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button onClick={onClose} className="bg-slate-200 dark:bg-slate-600 px-4 py-2 rounded-md font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave(selectedModel)}
                        className="bg-primary text-white px-4 py-2 rounded-md font-semibold hover:bg-primary-dark transition-colors"
                    >
                        Save
                    </button>
                </div>
            </Modal>
        );
    };



    const LanguageSelectionModal: React.FC<{
        onClose: () => void;
        onSave: (languageId: string) => void;
        currentLanguageId: string;
        voiceProviderId: string;
    }> = ({ onClose, onSave, currentLanguageId, voiceProviderId }) => {
        const [selectedLanguage, setSelectedLanguage] = useState(currentLanguageId);
        const languagesToShow = AVAILABLE_LANGUAGES_BY_PROVIDER[voiceProviderId] || AVAILABLE_LANGUAGES;

        useEffect(() => {
            // If the currently selected language is not supported by the provider, default to the first available one.
            if (!languagesToShow.some(lang => lang.id === selectedLanguage)) {
                setSelectedLanguage(languagesToShow[0]?.id || AVAILABLE_LANGUAGES[0].id);
            }
        }, [voiceProviderId, languagesToShow, selectedLanguage]);

        return (
            <Modal isOpen={true} onClose={onClose} title="Select Language">
                <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                    {languagesToShow.map(lang => (
                        <div
                            key={lang.id}
                            onClick={() => setSelectedLanguage(lang.id)}
                            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${selectedLanguage === lang.id ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                        >
                            <span className="font-medium">{lang.name}</span>
                            {selectedLanguage === lang.id && (
                                <CheckIcon className="h-5 w-5 text-primary" />
                            )}
                        </div>
                    ))}
                </div>
                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <button onClick={onClose} className="bg-slate-200 dark:bg-slate-600 px-4 py-2 rounded-md font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors">
                        Cancel
                    </button>
                    <button
                        onClick={() => onSave(selectedLanguage)}
                        className="bg-primary text-white px-4 py-2 rounded-md font-semibold hover:bg-primary-dark transition-colors"
                    >
                        Save
                    </button>
                </div>
            </Modal>
        )
    };

    const KnowledgeModal: React.FC<{
        isOpen: boolean;
        onClose: () => void;
        agent: VoiceAgent;
        onSave: (updatedSettings: VoiceAgentSettings) => void;
        userId: string;
    }> = ({ isOpen, onClose, agent, onSave, userId }) => {
        const [localSettings, setLocalSettings] = useState<VoiceAgentSettings>(agent.settings);
        const [availableDocs, setAvailableDocs] = useState<{ id: string; name: string; size: string; uploadedDate: string }[]>([]);
        const [loading, setLoading] = useState(false);
        const [error, setError] = useState<string | null>(null);
        const fileInputRef = useRef<HTMLInputElement>(null);

        const documentService = new DocumentService();

        useEffect(() => {
            if (isOpen && userId) {
                if (!userId || userId.trim() === '') {
                    setError('User authentication error. Please refresh the page and try again.');
                    return;
                }
                setLocalSettings(JSON.parse(JSON.stringify(agent.settings)));
                loadDocuments();
            }
        }, [agent, isOpen, userId]);

        const loadDocuments = async () => {
            try {
                setLoading(true);
                setError(null);
                const docs = await documentService.getDocuments(userId, agent.id);
                setAvailableDocs(docs.map(doc => ({
                    id: doc.id,
                    name: doc.name,
                    size: 'Unknown',
                    uploadedDate: new Date(doc.uploadedAt).toISOString().split('T')[0]
                })));
            } catch (err) {
                console.error('Error loading documents:', err);
                setError('Failed to load documents: ' + (err instanceof Error ? err.message : 'Unknown error'));
            } finally {
                setLoading(false);
            }
        };

        const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
            if (event.target.files && userId) {
                try {
                    setLoading(true);
                    setError(null);
                    const files = Array.from(event.target.files) as File[];

                    const uploadPromises = files.map(file =>
                        documentService.uploadDocument(userId, file, agent.id)
                    );

                    const uploadedDocs = await Promise.all(uploadPromises);
                    const newDocs = uploadedDocs.map(doc => ({
                        id: doc.id,
                        name: doc.name,
                        size: 'Unknown',
                        uploadedDate: new Date(doc.uploadedAt).toISOString().split('T')[0]
                    }));

                    setAvailableDocs(prev => [...prev, ...newDocs]);

                    // Auto-select uploaded documents
                    const newDocIds = newDocs.map(d => d.id);
                    setLocalSettings(prev => ({
                        ...prev,
                        knowledgeDocIds: [...(prev.knowledgeDocIds || []), ...newDocIds]
                    }));

                    event.target.value = '';
                } catch (err) {
                    console.error('Error uploading files:', err);
                    setError(`Failed to upload files: ${err instanceof Error ? err.message : 'Unknown error'}`);
                } finally {
                    setLoading(false);
                }
            }
        };

        const toggleDocSelection = (docId: string) => {
            setLocalSettings(prev => {
                const currentIds = prev.knowledgeDocIds || [];
                if (currentIds.includes(docId)) {
                    return { ...prev, knowledgeDocIds: currentIds.filter(id => id !== docId) };
                } else {
                    return { ...prev, knowledgeDocIds: [...currentIds, docId] };
                }
            });
        };

        const handleSave = () => {
            onSave(localSettings);
            onClose();
        };

        if (!isOpen) return null;

        return (
            <div className="fixed inset-0 bg-black bg-opacity-80 z-50 flex justify-center items-center p-4">
                <div className="bg-[#0F172A] text-slate-200 rounded-lg shadow-xl w-full max-w-2xl flex flex-col max-h-[85vh]">
                    <div className="p-6 border-b border-slate-700 flex justify-between items-center">
                        <div>
                            <h2 className="text-xl font-semibold">Knowledge Base</h2>
                            <p className="text-sm text-slate-400 mt-1">Upload documents for the agent to use as context.</p>
                        </div>
                        <button onClick={onClose} className="text-slate-400 hover:text-white">
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto flex-1 space-y-6">
                        {error && (
                            <div className="bg-red-900/50 border border-red-800 text-red-100 p-3 rounded-md text-sm">
                                {error}
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <h3 className="font-medium">Documents</h3>
                            <div className="flex gap-2">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    className="hidden"
                                    multiple
                                    accept=".pdf,.doc,.docx,.txt,.md,.csv"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={loading}
                                    className="bg-primary hover:bg-primary-dark text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <span className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-b-transparent border-white mr-2"></span>
                                    ) : (
                                        <ArrowUpTrayIcon className="h-4 w-4 mr-2" />
                                    )}
                                    Upload New
                                </button>
                            </div>
                        </div>

                        {loading && availableDocs.length === 0 ? (
                            <div className="space-y-3">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="h-12 bg-slate-800 rounded animate-pulse"></div>
                                ))}
                            </div>
                        ) : availableDocs.length === 0 ? (
                            <div className="text-center py-12 border-2 border-dashed border-slate-700 rounded-lg">
                                <DocumentTextIcon className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                                <p className="text-slate-400">No documents found.</p>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-primary hover:underline mt-2 text-sm"
                                >
                                    Upload your first document
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {availableDocs.map(doc => {
                                    const isSelected = (localSettings.knowledgeDocIds || []).includes(doc.id);
                                    return (
                                        <div
                                            key={doc.id}
                                            onClick={() => toggleDocSelection(doc.id)}
                                            className={`p-3 rounded-md border flex items-center justify-between cursor-pointer transition-all ${isSelected
                                                ? 'bg-primary/10 border-primary/50'
                                                : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                                <div className={`p-2 rounded-full ${isSelected ? 'bg-primary/20 text-primary' : 'bg-slate-700 text-slate-400'}`}>
                                                    <DocumentTextIcon className="h-5 w-5" />
                                                </div>
                                                <div className="truncate">
                                                    <p className={`font-medium truncate ${isSelected ? 'text-primary' : 'text-slate-200'}`}>{doc.name}</p>
                                                    <p className="text-xs text-slate-500">{doc.uploadedDate}</p>
                                                </div>
                                            </div>
                                            <div className={`h-5 w-5 rounded-full border flex items-center justify-center transition-colors ${isSelected
                                                ? 'bg-primary border-primary'
                                                : 'border-slate-500'
                                                }`}>
                                                {isSelected && <CheckIcon className="h-3.5 w-3.5 text-white" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        <div className="bg-slate-800/50 p-4 rounded-lg">
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Pre-action Phrase (Optional)
                            </label>
                            <p className="text-xs text-slate-500 mb-3">
                                The agent will say this while searching the knowledge base.
                            </p>
                            <input
                                type="text"
                                value={(localSettings.preActionPhrases || [])[0] || ''}
                                onChange={e => {
                                    const val = e.target.value;
                                    setLocalSettings(prev => ({
                                        ...prev,
                                        preActionPhrases: val ? [val] : []
                                    }));
                                }}
                                placeholder="e.g. Let me check the database for that..."
                                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all placeholder:text-slate-600"
                            />
                        </div>
                    </div>

                    <div className="p-6 border-t border-slate-700 flex justify-end gap-3 bg-slate-900/50 rounded-b-lg">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-md text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-md text-sm font-medium transition-colors shadow-lg shadow-primary/20"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderToolsModal = () => (
        <div className={`fixed inset-0 bg-black bg-opacity-80 z-50 flex justify-center items-start py-10 ${isToolsModalOpen ? '' : 'hidden'}`} onClick={() => setToolsModalOpen(false)}>
            <div className="bg-[#1A222C] text-white rounded-lg shadow-xl w-full max-w-2xl transform transition-all" onClick={e => e.stopPropagation()}>
                <div className="px-6 py-4 border-b border-gray-700">
                    <h3 className="text-xl font-semibold">{editingTool ? 'Edit Function' : 'Create Function'}</h3>
                </div>
                <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
                    {/* Function Name & Description */}
                    <div>
                        <label className="block text-sm font-medium mb-1">Function Name</label>
                        <input type="text" placeholder="Enter function name" name="name" value={newTool.name} onChange={handleNewToolChange} className="w-full bg-[#243140] border border-gray-600 rounded-md px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Description</label>
                        <textarea placeholder="Enter function description" name="description" value={newTool.description} onChange={(e) => setNewTool(p => ({ ...p, description: e.target.value }))} rows={4} className="w-full bg-[#243140] border border-gray-600 rounded-md px-3 py-2 focus:ring-emerald-500 focus:border-emerald-500"></textarea>
                    </div>

                    <div className="bg-[#243140] p-3 rounded-md">
                        <p className="text-sm text-emerald-300">Tip: Use the "Required" checkbox for parameters that the agent must collect from the user during the conversation.</p>
                    </div>

                    {/* Function Type - HIDDEN and forced to GoogleSheets */}
                    {/*
                    <div>
                        <label className="block text-sm font-medium mb-2">Select Function Type</label>
                        <div className="flex bg-[#243140] p-1 rounded-md">
                            {[{ value: 'Webhook', label: 'Webhook' }, { value: 'WebForm', label: 'Web Form' }, { value: 'GoogleSheets', label: 'Google Sheets' }].map((type) => (
                                <button
                                    key={type.value}
                                    onClick={() => setNewToolFunctionType(type.value as 'Webhook' | 'WebForm' | 'GoogleSheets')}
                                    className={`flex-1 py-1.5 rounded text-sm ${newToolFunctionType === type.value ? 'bg-emerald-600' : ''}`}
                                >
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    */}

                    <div className="space-y-3">
                        <div className="bg-[#243140] p-3 rounded-md mb-4 border border-emerald-900/50">
                            <p className="text-sm text-emerald-300 font-medium">Google Sheets Integration</p>
                            <p className="text-xs text-gray-400 mt-1">Save user data directly to your spreadsheet. The columns you define below will be auto-populated by the agent.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Google Sheets URL</label>
                            <input
                                type="text"
                                name="webhookUrl"
                                value={newTool.webhookUrl}
                                onChange={handleNewToolChange}
                                placeholder="Paste your Google Sheet link here..."
                                className="w-full bg-[#243140] border border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500"
                            />
                            <p className="text-xs text-gray-400 mt-1">Make sure the sheet is accessible (e.g., 'Anyone with the link can edit').</p>
                        </div>

                        <div className="border-t border-gray-700 pt-4 mt-4">
                            <div className="flex justify-between items-center mb-2">
                                <div>
                                    <h4 className="text-sm font-medium">Sheet Columns</h4>
                                    <p className="text-xs text-gray-400">Define the columns exactly as they appear in your sheet.</p>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="grid grid-cols-[2fr_1fr_auto_auto] gap-x-4 items-center text-xs uppercase text-gray-500 font-semibold px-1">
                                    <div>Column Name</div>
                                    <div>Type</div>
                                    <div className="text-center">Required</div>
                                    <div></div>
                                </div>

                                {(newTool.parameters || []).map((param, index) => (
                                    <div key={index} className="grid grid-cols-[2fr_1fr_auto_auto] gap-x-4 items-center">
                                        <input type="text" value={param.name} onChange={e => handleParameterChange(index, 'name', e.target.value)} placeholder="e.g. Phone Number" className="w-full bg-[#243140] border border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500" />

                                        <select value={param.type} onChange={e => handleParameterChange(index, 'type', e.target.value)} className="w-full bg-[#243140] border border-gray-600 rounded-md px-3 py-2 text-sm focus:ring-emerald-500 focus:border-emerald-500">
                                            {[
                                                { value: 'string', label: 'Text' },
                                                { value: 'number', label: 'Number' },
                                                { value: 'boolean', label: 'Yes/No' }
                                            ].map((type) => (
                                                <option key={type.value} value={type.value}>{type.label}</option>
                                            ))}
                                        </select>

                                        <div className="flex items-center justify-center">
                                            <input type="checkbox" checked={param.required} onChange={e => handleParameterChange(index, 'required', e.target.checked)} className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-emerald-600 focus:ring-emerald-500" />
                                        </div>

                                        <button type="button" onClick={() => handleDeleteParameter(index)} className="text-red-500 hover:text-red-400 p-1">
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}

                                <button type="button" onClick={handleAddParameter} className="flex items-center text-emerald-500 font-medium text-sm hover:text-emerald-400 transition-colors mt-2">
                                    <div className="w-5 h-5 rounded border border-emerald-500 flex items-center justify-center mr-2 text-xs">+</div>
                                    Add Column
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 !mt-8">
                        <div className="p-4 border border-gray-700 rounded-md flex justify-between items-center">
                            <div>
                                <label className="font-medium">Run Function After Call</label>
                                <p className="text-xs text-gray-400">Set the function to execute after the call ended.</p>
                            </div>
                            <label className="flex items-center cursor-pointer">
                                <div className="relative">
                                    <input type="checkbox" className="sr-only" checked={newTool.runAfterCall} onChange={(e) => setNewTool(p => ({ ...p, runAfterCall: e.target.checked }))} />
                                    <div className={`block w-10 h-6 rounded-full transition ${newTool.runAfterCall ? 'bg-emerald-600' : 'bg-gray-600'}`}></div>
                                    <div className={`dot absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition ${newTool.runAfterCall ? 'translate-x-full' : ''}`}></div>
                                </div>
                            </label>
                        </div>
                    </div>


                    {/* Pre-Action Phrases */}
                    <div className="space-y-3">
                        <label className="block font-medium">Pre-Action Phrases</label>
                        <p className="text-sm text-gray-400">Define the phrases your agent will say before calling the function. If left blank, the agent will autonomously come up with phrases.</p>
                        {preActionPhraseOptions.map(opt => (
                            <div key={opt.id} className="flex items-start">
                                <input type="radio" id={opt.id} name="preActionPhrasesMode" value={opt.id} checked={newTool.preActionPhrasesMode === opt.id} onChange={(e) => setNewTool(p => ({ ...p, preActionPhrasesMode: e.target.value as PreActionPhraseMode }))} className="mt-1 h-4 w-4 text-emerald-600 bg-gray-700 border-gray-600 focus:ring-emerald-500" />
                                <div className="ml-3 text-sm">
                                    <label htmlFor={opt.id} className="font-medium capitalize">{opt.label}</label>
                                    <p className="text-gray-400">{opt.description}</p>
                                </div>
                            </div>
                        ))}
                        {(newTool.preActionPhrasesMode === 'flexible' || newTool.preActionPhrasesMode === 'strict') && (
                            <input type="text" name="preActionPhrases" value={newTool.preActionPhrases} onChange={handleNewToolChange} placeholder="Enter phrases separated by commas" className="w-full bg-[#243140] border border-gray-600 rounded-md px-3 py-2 mt-2 focus:ring-emerald-500 focus:border-emerald-500" />
                        )}
                    </div>
                </div>
                <div className="px-6 py-4 bg-[#243140] flex justify-end space-x-3">
                    <button onClick={() => { setToolsModalOpen(false); setNewTool(initialNewToolState); setEditingTool(null); }} className="text-white font-semibold py-2 px-4 rounded-lg">Cancel</button>
                    <button onClick={handleSubmitTool} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg">{editingTool ? 'Update' : 'Create'}</button>
                </div>
            </div>
        </div>
    );


    // Fetch user documents for display
    const [userDocuments, setUserDocuments] = useState<{ id: string; name: string }[]>([]);

    useEffect(() => {
        const fetchDocuments = async () => {
            if (userId) {
                try {
                    const documentService = new DocumentService();
                    // @ts-ignore - Assuming getDocuments exists and returns the expected format
                    const docs = await documentService.getDocuments(userId);
                    setUserDocuments(docs);
                } catch (error) {
                    console.error('Error fetching documents:', error);
                }
            }
        };
        fetchDocuments();
    }, [userId, isKnowledgeModalOpen]); // Re-fetch when modal closes in case of new uploads

    return (
        <div className="bg-lightbg-dark dark:bg-darkbg-lighter min-h-full">
            {isModelModalOpen && (
                <ModelSelectionModal
                    onClose={() => setModelModalOpen(false)}
                    onSave={handleSaveModel}
                    currentModelId={editedAgent.model}
                />
            )}
            {isVoiceModalOpen && (
                <VoiceSelectionModal
                    onClose={() => setVoiceModalOpen(false)}
                    onSave={handleSaveVoice}
                    currentVoiceId={editedAgent.voiceId}
                    availableVoices={availableVoices}
                    loadingVoices={loadingVoices}
                    playingVoiceId={playingVoiceRef.current}
                    onPlayPreview={playVoicePreview}
                    onStopPreview={stopVoicePreview}
                />
            )}
            {isLanguageModalOpen && (
                <LanguageSelectionModal
                    onClose={() => setLanguageModalOpen(false)}
                    onSave={handleSaveLanguage}
                    currentLanguageId={editedAgent.language}
                    voiceProviderId={getVoiceProviderById(editedAgent.voiceId)}
                />
            )}
            {userId && (
                <KnowledgeModal
                    isOpen={isKnowledgeModalOpen}
                    onClose={() => setKnowledgeModalOpen(false)}
                    agent={editedAgent}
                    userId={userId}
                    onSave={async (newSettings) => {
                        try {
                            const updatedAgent = { ...editedAgent, settings: newSettings };
                            setEditedAgent(updatedAgent);
                            await updateAgent(updatedAgent);
                            setKnowledgeModalOpen(false);
                            // Refresh docs
                            const documentService = new DocumentService();
                            const docs = await documentService.getDocuments(userId);
                            setUserDocuments(docs);
                        } catch (error) {
                            console.error('Error saving knowledge settings:', error);
                        }
                    }}
                />
            )}
            {/* Header */}
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4 p-1 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-darkbg-light sticky top-0 z-10">
                <div className="flex items-center">
                    <button onClick={onBack} className="mr-2 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-darkbg"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg></button>
                    <h2 className="text-2xl font-bold">{editedAgent.name}</h2>
                    <div className="flex items-center gap-2 ml-4">
                        <span className="px-2 py-0.5 text-xs font-medium rounded-full inline-flex items-center bg-green-100 text-green-800"><span className="h-2 w-2 rounded-full mr-1.5 bg-green-500"></span>Active</span>
                        <div className="text-sm text-slate-500 flex items-center bg-slate-100 dark:bg-darkbg-light rounded-md px-2 py-1">
                            <span>ID: {editedAgent.id}</span>
                            <button onClick={() => copyToClipboard(editedAgent.id, 'ID')} className="ml-2 text-slate-400 hover:text-primary"><DocumentDuplicateIcon className="h-4 w-4" /></button>
                        </div>
                    </div>
                </div>
                <div className="relative" ref={actionsDropdownRef}>
                    <button onClick={() => setActionsDropdownOpen(p => !p)} className="bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg flex items-center">Actions <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg></button>
                    {isActionsDropdownOpen && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-darkbg-light border dark:border-slate-700 rounded-md shadow-lg z-20">
                            <ul className="py-1">
                                {[
                                    { label: 'Duplicate', icon: DocumentDuplicateIcon, action: () => onDuplicate(editedAgent) },
                                    { label: 'Delete', icon: TrashIcon, action: () => onDelete(editedAgent.id), isDestructive: true },
                                ].map((item) => (
                                    <li key={item.label}>
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); item.action(); setActionsDropdownOpen(false); }}
                                            className={`w-full text-left flex items-center gap-3 px-4 py-2 text-sm ${item.isDestructive ? 'text-red-600 dark:text-red-500' : 'text-slate-700 dark:text-slate-300'} hover:bg-slate-100 dark:hover:bg-darkbg`}
                                        >
                                            <item.icon className="h-5 w-5" />
                                            {item.label}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
            <div className="border-b border-slate-200 dark:border-slate-800 px-1 bg-white dark:bg-darkbg-light">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <a href="#" className="border-primary text-primary whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm">General</a>
                </nav>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-4 sm:p-6 lg:p-8">
                {/* Left Column */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-white dark:bg-darkbg-light rounded-lg shadow-sm">
                        {[
                            { title: 'Model', value: AVAILABLE_MODELS.find(m => m.id === editedAgent.model)?.name || editedAgent.model, icon: ModelIcon, action: () => setModelModalOpen(true) },
                            {
                                title: 'Voice',
                                value: (() => {
                                    // Try to get voice name from API-fetched voices first
                                    const allVoices = Object.values(availableVoices).flat() as { id: string, name: string }[];
                                    const apiVoice = allVoices.find(v => v.id === editedAgent.voiceId);
                                    if (apiVoice) {
                                        return apiVoice.name;
                                    }
                                    // Fallback to hardcoded voices
                                    const hardcodedName = getVoiceNameById(editedAgent.voiceId);
                                    return hardcodedName || editedAgent.voiceId;
                                })(),
                                icon: VoiceIcon,
                                action: () => setVoiceModalOpen(true)
                            },
                            { title: 'Language', value: AVAILABLE_LANGUAGES.find(l => l.id === editedAgent.language)?.name || editedAgent.language, icon: LanguageIcon, action: () => setLanguageModalOpen(true) },
                        ].map(item => (
                            <button onClick={item.action} key={item.title} className="flex items-center p-2 text-left w-full hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                                <item.icon className="h-6 w-6 mr-4 text-slate-500 dark:text-slate-400" />
                                <div>
                                    <h4 className="text-sm text-slate-500 dark:text-slate-400">{item.title}</h4>
                                    <p className="font-semibold">{item.value}</p>
                                </div>
                            </button>
                        ))}
                    </div>

                    <div className="bg-white dark:bg-darkbg-light rounded-lg shadow-sm">
                        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="text-xl font-semibold">Agent Prompt</h3>
                            {!isEditingPrompt ? (
                                <button onClick={() => setIsEditingPrompt(true)} className="flex items-center text-sm font-semibold text-primary hover:text-primary-dark"><EditIcon className="h-4 w-4 mr-1.5" /> Edit</button>
                            ) : (
                                <div className="space-x-2">
                                    <button onClick={handleCancelPrompt} className="text-sm font-semibold px-3 py-1 rounded-md hover:bg-slate-100 dark:hover:bg-darkbg">Cancel</button>
                                    <button onClick={handleSavePrompt} className="text-sm font-semibold text-white bg-primary px-3 py-1 rounded-md">Save</button>
                                </div>
                            )}
                        </div>
                        <div className="p-6">
                            {isEditingPrompt ? (
                                <textarea name="identity" value={editedAgent.identity} onChange={handleSettingsChange} className="w-full h-64 p-3 font-mono text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md focus:ring-primary focus:border-primary" />
                            ) : (
                                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600 dark:text-slate-300">{editedAgent.identity}</p>
                            )}
                        </div>
                    </div>

                    <SettingsCard title="Conversation Configuration">
                        <SettingsToggle label="User starts first" description="Agent will wait for user to start first." name="settings.userStartsFirst" checked={editedAgent.settings.userStartsFirst} onChange={handleSettingsChange} />
                        <div>
                            <label htmlFor="greetingLine" className="block text-sm font-medium text-slate-700 dark:text-slate-200">Greeting Line</label>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Set the first message the agent says to start the conversation. Leave blank to disable.</p>
                            <input type="text" id="greetingLine" name="settings.greetingLine" value={editedAgent.settings.greetingLine} onChange={handleSettingsChange} className="mt-2 w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-primary focus:border-primary sm:text-sm" />
                        </div>

                        <div className="border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">
                            <h4 className="font-medium text-slate-700 dark:text-slate-200 mb-2">Session Timeout</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Set the session to automatically end after a fixed duration or following a period of no voice activity.</p>
                            <div className="space-y-4">
                                <div>
                                    <label htmlFor="sessionTimeoutFixedDuration" className="text-sm text-slate-600 dark:text-slate-300">Fixed Duration (Seconds):</label>
                                    <input type="number" id="sessionTimeoutFixedDuration" name="settings.sessionTimeoutFixedDuration" value={editedAgent.settings.sessionTimeoutFixedDuration} onChange={handleSettingsChange} min="0" max="86400" className="mt-1 w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md" placeholder="e.g. 300 for 5 minutes" />
                                </div>
                                <div>
                                    <label htmlFor="sessionTimeoutEndMessage" className="text-sm text-slate-600 dark:text-slate-300">End-of-Session Message:</label>
                                    <input type="text" id="sessionTimeoutEndMessage" name="settings.sessionTimeoutEndMessage" value={editedAgent.settings.sessionTimeoutEndMessage} onChange={handleSettingsChange} className="mt-1 w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md" placeholder="e.g. The session has ended. Goodbye." />
                                </div>
                            </div>
                        </div>
                    </SettingsCard>

                </div>
                {/* Right Column */}
                <div className="lg:col-span-1">
                    <div className="sticky top-28 space-y-6">
                        <details className="bg-white dark:bg-darkbg-light rounded-lg shadow-sm" open>
                            <summary className="flex justify-between items-center p-4 cursor-pointer font-semibold">
                                <span className="flex items-center gap-2"><SipPhoneIcon className="h-5 w-5 text-primary" /> Call Agent</span>
                                <svg className="w-5 h-5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </summary>
                            <div className="px-4 pb-4 border-t border-slate-200 dark:border-slate-700">
                                <div className="border-b border-slate-200 dark:border-slate-700">
                                    <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                                        <button onClick={() => setCallAgentTab('web')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${callAgentTab === 'web' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                                            Web
                                        </button>
                                        <button onClick={() => setCallAgentTab('chat')} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm ${callAgentTab === 'chat' ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'}`}>
                                            Chat
                                        </button>
                                    </nav>
                                </div>
                                {callAgentTab === 'web' ? (
                                    <div className="text-center py-8">
                                        <button onClick={isCallActive ? stopCall : startCall} className={`mx-auto w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${isCallActive ? 'bg-red-500 hover:bg-red-600 shadow-lg animate-pulse' : 'bg-slate-800 dark:bg-slate-700 hover:bg-slate-900 dark:hover:bg-slate-600'}`}>
                                            <MicrophoneIcon className="h-10 w-10 text-white" />
                                        </button>
                                        <p className="mt-4 font-semibold text-slate-700 dark:text-slate-200">{isCallActive ? 'Stop' : 'Start'}</p>
                                    </div>
                                ) : (
                                    <div className="pt-4 flex flex-col h-96">
                                        <div ref={chatContainerRef} className="flex-1 space-y-3 overflow-y-auto p-2">
                                            {chatMessages.map((msg, index) => (
                                                <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                    <div className={`max-w-xs lg:max-w-md px-3 py-2 rounded-lg ${msg.sender === 'user' ? 'bg-primary text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100'}`}>
                                                        {msg.text}
                                                    </div>
                                                </div>
                                            ))}
                                            {isAgentReplying && (
                                                <div className="flex justify-start">
                                                    <div className="px-3 py-2 rounded-lg bg-slate-200 dark:bg-slate-700">
                                                        <div className="flex items-center space-x-1">
                                                            <span className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                                                            <span className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                                                            <span className="h-1.5 w-1.5 bg-slate-500 rounded-full animate-pulse"></span>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <form onSubmit={handleSendMessage} className="mt-2 flex items-center">
                                            <input type="text" value={currentMessage} onChange={(e) => setCurrentMessage(e.target.value)} placeholder="Type your message" className="flex-1 w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-l-md focus:outline-none focus:ring-primary focus:border-primary text-sm" />
                                            <button type="submit" className="px-4 py-2 bg-primary text-white rounded-r-md hover:bg-primary-dark disabled:bg-primary/50" disabled={isAgentReplying || !API_KEY}>
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                                            </button>
                                        </form>
                                    </div>
                                )}
                            </div>
                        </details>

                        <div className="bg-white dark:bg-darkbg-light rounded-lg shadow-sm p-4 space-y-3">
                            <div className="flex justify-between items-center">
                                <h3 className="font-semibold flex items-center gap-2"><KnowledgeIcon className="h-5 w-5 text-slate-500" /> Knowledge</h3>
                                <button onClick={() => setKnowledgeModalOpen(true)} className="text-sm font-semibold text-primary hover:text-primary-dark">Edit</button>
                            </div>
                            <p className="text-sm text-slate-500">Upload documents to enrich your voice agent's knowledge base. {editedAgent.settings.knowledgeDocIds?.length || 0} document(s) added.</p>

                            {/* Display user documents if any are selected */}
                            {editedAgent.settings.knowledgeDocIds && editedAgent.settings.knowledgeDocIds.length > 0 && userDocuments.length > 0 && (
                                <div className="space-y-2 max-h-40 overflow-y-auto mb-2 pr-1 custom-scrollbar">
                                    {userDocuments
                                        .filter(doc => (editedAgent.settings.knowledgeDocIds || []).includes(doc.id))
                                        .map(doc => (
                                            <div key={doc.id} className="flex items-center p-2 bg-slate-50 dark:bg-slate-800 rounded-md text-sm border border-slate-200 dark:border-slate-700">
                                                <DocumentTextIcon className="h-4 w-4 text-slate-400 mr-2 flex-shrink-0" />
                                                <span className="truncate flex-1" title={doc.name}>{doc.name}</span>
                                            </div>
                                        ))
                                    }
                                </div>
                            )}

                            <button onClick={() => setKnowledgeModalOpen(true)} className="w-full text-center py-2 px-4 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg hover:border-primary text-slate-600 dark:text-slate-300 hover:text-primary font-semibold transition">+ Add Document</button>
                        </div>

                        <div className="bg-white dark:bg-darkbg-light rounded-lg shadow-sm p-4 space-y-3">
                            <h3 className="font-semibold flex items-center gap-2"><ToolsIcon className="h-5 w-5 text-slate-500" /> Tools</h3>
                            <p className="text-sm text-slate-500">Define tools to collect user data during conversations. When a parameter is marked as required, the AI agent will compulsorily ask the user for that information. {editedAgent.settings.tools.length} tool(s) configured.</p>

                            <button onClick={() => { setEditingTool(null); setNewTool(initialNewToolState); setNewToolFunctionType('GoogleSheets'); setToolsModalOpen(true); }} className="w-full bg-primary hover:bg-primary-dark text-white font-bold py-2 px-4 rounded-lg">+ Add Custom Tool</button>
                            {editedAgent.settings.tools.length > 0 && (
                                <div className="space-y-2 pt-2">
                                    {editedAgent.settings.tools.map(tool => (
                                        <div key={tool.id} className="text-sm p-2 rounded-md border border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                            <div>
                                                <span className="font-medium">{tool.name}</span>
                                                <span className="text-xs ml-2 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded-full">
                                                    Google Sheets
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <button onClick={() => handleEditTool(tool)} className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600"><EditIcon className="h-4 w-4" /></button>
                                                <button onClick={() => handleDeleteTool(tool.id)} className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-600 text-red-500"><TrashIcon className="h-4 w-4" /></button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
            {renderToolsModal()}
        </div>
    );
};

export default AgentDetailPage;