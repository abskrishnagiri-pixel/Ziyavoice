import React, { useState } from 'react';
import VoiceCard from './VoiceCard';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

interface VoiceDTO {
    id: string;
    provider: 'elevenlabs' | 'sarvam';
    provider_voice_id: string;
    display_name: string;
    language_code: string;
    gender?: string | null;
    locale?: string | null;
    is_preview_available: boolean;
    meta?: Record<string, any>;
}

interface VoiceListProps {
    voices: VoiceDTO[];
    selectedVoiceId?: string;
    onSelect: (voice: VoiceDTO) => void;
    onPreview: (voice: VoiceDTO) => void;
    playingPreviewId?: string;
    loading?: boolean;
}

const VoiceList: React.FC<VoiceListProps> = ({
    voices,
    selectedVoiceId,
    onSelect,
    onPreview,
    playingPreviewId,
    loading = false
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProvider, setSelectedProvider] = useState<'all' | 'elevenlabs' | 'sarvam'>('all');
    const [selectedLanguage, setSelectedLanguage] = useState<string>('all');

    // Get unique languages
    const languages = Array.from(new Set(voices.map(v => v.language_code))).sort();

    // Filter voices
    const filteredVoices = voices.filter(voice => {
        const matchesSearch = voice.display_name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesProvider = selectedProvider === 'all' || voice.provider === selectedProvider;
        const matchesLanguage = selectedLanguage === 'all' || voice.language_code === selectedLanguage;
        return matchesSearch && matchesProvider && matchesLanguage;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Search and filters */}
            <div className="space-y-3">
                {/* Search */}
                <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search voices..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-darkbg-light text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                </div>

                {/* Provider tabs */}
                <div className="flex gap-2">
                    {(['all', 'elevenlabs', 'sarvam'] as const).map((provider) => (
                        <button
                            key={provider}
                            onClick={() => setSelectedProvider(provider)}
                            className={`
                px-4 py-2 rounded-lg font-medium transition-colors
                ${selectedProvider === provider
                                    ? 'bg-primary text-white'
                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                }
              `}
                        >
                            {provider === 'all' ? 'All' : provider === 'elevenlabs' ? 'ElevenLabs' : 'Sarvam'}
                        </button>
                    ))}
                </div>

                {/* Language filter */}
                {languages.length > 1 && (
                    <select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-darkbg-light text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                        <option value="all">All Languages</option>
                        {languages.map((lang) => (
                            <option key={lang} value={lang}>
                                {lang}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* Results count */}
            <div className="text-sm text-slate-600 dark:text-slate-400">
                Showing {filteredVoices.length} of {voices.length} voices
            </div>

            {/* Voice grid */}
            {filteredVoices.length === 0 ? (
                <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                    No voices found matching your criteria
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredVoices.map((voice) => (
                        <VoiceCard
                            key={voice.id}
                            voice={voice}
                            isSelected={selectedVoiceId === voice.id}
                            onSelect={onSelect}
                            onPreview={onPreview}
                            isPlayingPreview={playingPreviewId === voice.id}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};

export default VoiceList;
