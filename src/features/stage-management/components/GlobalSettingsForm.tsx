'use client';
import { useState } from 'react';
import { updateSystemSetting } from '@/shared/actions/settings-actions';

interface GlobalSettingsFormProps {
    initialDefaultThreshold: number;
}

export function GlobalSettingsForm({ initialDefaultThreshold }: GlobalSettingsFormProps) {
    const [hours, setHours] = useState(Math.floor(initialDefaultThreshold / 60));
    const [minutes, setMinutes] = useState(initialDefaultThreshold % 60);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSuccess(false);
        try {
            const totalMinutes = (hours * 60) + minutes;
            await updateSystemSetting('default_delay_threshold_minutes', totalMinutes.toString());
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (_err) {
            alert('Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 shadow-lg mb-8">
            <h2 className="text-xl font-bold text-zinc-100 mb-2">Global Settings</h2>
            <p className="text-sm text-zinc-400 mb-6">
                Configure system-wide defaults for all hospital stages.
            </p>

            <form onSubmit={handleSave} className="space-y-6 max-w-sm">
                <div>
                    <label className="block text-sm font-semibold text-zinc-300 mb-3">
                        Default Delay Threshold
                    </label>
                    <div className="flex gap-4">
                        <div className="flex-1">
                            <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">Hours</label>
                            <input
                                type="number"
                                min={0}
                                max={24}
                                value={hours}
                                onChange={e => setHours(Math.max(0, Number(e.target.value)))}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-[10px] text-zinc-500 uppercase font-bold mb-1">Minutes</label>
                            <input
                                type="number"
                                min={0}
                                max={59}
                                value={minutes}
                                onChange={e => setMinutes(Math.max(0, Number(e.target.value)))}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    <p className="mt-2 text-[10px] text-zinc-500 italic">
                        Used as fallback for any stage that doesn&apos;t have a specific override.
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : 'Update Defaults'}
                    </button>
                    {success && (
                        <span className="text-emerald-400 text-sm font-medium animate-pulse">
                            ✓ Saved successfully
                        </span>
                    )}
                </div>
            </form>
        </div>
    );
}
