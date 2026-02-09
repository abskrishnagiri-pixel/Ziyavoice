import React from 'react';
import { PlayIcon, StopIcon, CheckIcon } from '@heroicons/react/24/outline';

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

interface VoiceCardProps {
    voice: VoiceDTO;
    isSelected: boolean;
    onSelect: (voice: VoiceDTO) => void;
    onPreview: (voice: VoiceDTO) => void;
    isPlayingPreview: boolean;
}

const VoiceCard: React.FC<VoiceCardProps> = ({
    voice,
    isSelected,
    onSelect,
    onPreview,
    isPlayingPreview
}) => {
    const providerColors = {
        elevenlabs: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        sarvam: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
    };

    return (
        <div
            className={`
        relative p-4 rounded-lg border-2 transition-all cursor-pointer
        ${isSelected
                    ? 'border-primary bg-primary/5 dark:bg-primary/10'
                    : 'border-slate-200 dark:border-slate-700 hover:border-primary/50 bg-white dark:bg-darkbg-light'
                }
      `}
            role="button"
            tabIndex={0}
            aria-label={`Select voice ${voice.display_name} from ${voice.provider}`}
            onClick={() => onSelect(voice)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelect(voice);
                }
            }}
        >
            {/* Selected indicator */}
            {isSelected && (
                <div className="absolute top-2 right-2">
                    <CheckIcon className="w-5 h-5 text-primary" />
                </div>
            )}

            <div className="space-y-3">
                {/* Voice name */}
                <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 pr-6">
                    {voice.display_name}
                </h4>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${providerColors[voice.provider]}`}>
                        {voice.provider === 'elevenlabs' ? 'ElevenLabs' : 'Sarvam'}
                    </span>

                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                        {voice.language_code}
                    </span>

                    {voice.gender && (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-300">
                            {voice.gender}
                        </span>
                    )}
                </div>

                {/* Preview button */}
                {voice.is_preview_available && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onPreview(voice);
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-md bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm font-medium text-slate-700 dark:text-slate-300"
                        aria-label={isPlayingPreview ? 'Stop preview' : 'Play preview'}
                    >
                        {isPlayingPreview ? (
                            <>
                                <StopIcon className="w-4 h-4" />
                                <span>Stop</span>
                            </>
                        ) : (
                            <>
                                <PlayIcon className="w-4 h-4" />
                                <span>Preview</span>
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

export default VoiceCard;
