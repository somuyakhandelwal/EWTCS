'use client';
import { useState, useEffect } from 'react';
import type { Stage } from '../types/stage.types';
import { createStage, updateStage, getStageDelayThreshold, setStageDelayThreshold } from '../actions/stage-actions';
import { getStageColorClasses, getSupportedStageColors } from '@/shared/utils/stage-colors';

const COLORS = getSupportedStageColors();
const normalizeStageColor = (value?: string) =>
  value?.toLowerCase() === 'grey' ? 'gray' : value;

export function StageFormModal({ stage, onClose, onSaved }:
  { stage?: Stage; onClose: () => void; onSaved: (s: Stage) => void }) {
  const [name, setName] = useState(stage?.name ?? '');
  const [color, setColor] = useState(normalizeStageColor(stage?.color_code) ?? 'blue');
  const [desc, setDesc] = useState(stage?.description ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [thresholdHours, setThresholdHours] = useState<number>(Math.floor((stage?.delay_threshold_minutes ?? 180) / 60));
  const [thresholdMinutes, setThresholdMinutes] = useState<number>((stage?.delay_threshold_minutes ?? 180) % 60);

  // Load threshold if editing
  useEffect(() => {
    if (stage?.id) {
      getStageDelayThreshold(stage.id).then(mins => {
        setThresholdHours(Math.floor(mins / 60));
        setThresholdMinutes(mins % 60);
      }).catch(() => { });
    }
  }, [stage?.id]);

  const handleSave = async () => {
    if (!name.trim()) return setError('Stage name is required');
    if (name.length > 50) return setError('Name must be max 50 characters');

    const totalMinutes = (thresholdHours * 60) + thresholdMinutes;
    if (totalMinutes < 1) return setError('Threshold must be at least 1 minute');
    if (totalMinutes > 1440) return setError('Threshold cannot exceed 24 hours (1440 min)');

    setLoading(true); setError('');
    try {
      let savedStage = stage;
      if (stage) {
        await updateStage({ id: stage.id, name, color_code: color, description: desc });
        savedStage = { ...stage, name, color_code: color, description: desc };
      } else {
        await createStage({ name, color_code: color, description: desc });
        savedStage = {
          id: Date.now().toString(), name, color_code: color,
          description: desc, display_order: 99, is_default: false,
          is_active: true, created_at: '', updated_at: ''
        };
      }
      // Save threshold
      if (savedStage?.id) {
        await setStageDelayThreshold(savedStage.id, totalMinutes);
        savedStage.delay_threshold_minutes = totalMinutes;
      }
      onSaved(savedStage!);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Something went wrong'); }
    finally { setLoading(false); }
  };

  return (
    <div className='fixed inset-0 bg-black/60 flex items-center justify-center z-50'>
      <div className='bg-white rounded-xl p-6 w-full max-w-md shadow-2xl'>

        {/* Title */}
        <h2 className='text-xl font-bold text-gray-900 mb-4'>
          {stage ? 'Edit Stage' : 'Add New Stage'}
        </h2>

        {/* Name */}
        <label className='block text-sm font-semibold text-gray-700 mb-1'>
          Stage Name <span className='text-gray-400 font-normal'>({name.length}/50)</span>
        </label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={50}
          className='w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'
          placeholder='e.g. Triage In Progress'
        />

        {/* Color */}
        <label className='block text-sm font-semibold text-gray-700 mb-2'>Color</label>
        <div className='flex gap-3 mb-4'>
          {COLORS.map(c => {
            const colorClasses = getStageColorClasses(c);
            return (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                title={c}
                aria-label={`Select ${c} stage color`}
                aria-pressed={color === c}
                className={`w-9 h-9 rounded-full border-2 ${colorClasses.bg} ${colorClasses.border} ${color === c ? 'ring-2 ring-blue-600 ring-offset-2 ring-offset-white scale-110' : ''
                  } transition-all`}
              />
            );
          })}
        </div>

        {/* Description */}
        <label className='block text-sm font-semibold text-gray-700 mb-1'>
          Description <span className='text-gray-400 font-normal'>(Optional)</span>
        </label>
        <input
          value={desc}
          onChange={e => setDesc(e.target.value)}
          className='w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'
          placeholder='Stage description...'
        />


        {/* Delay Threshold */}
        <label className='block text-sm font-semibold text-gray-700 mb-1'>
          Delay Threshold
        </label>
        <div className='flex gap-3 mb-4'>
          <div className='flex-1'>
            <label className='block text-[10px] text-gray-400 uppercase font-bold mb-1'>Hours</label>
            <input
              type='number'
              min={0}
              max={24}
              value={thresholdHours}
              onChange={e => setThresholdHours(Math.max(0, Number(e.target.value)))}
              className='w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
          </div>
          <div className='flex-1'>
            <label className='block text-[10px] text-gray-400 uppercase font-bold mb-1'>Minutes</label>
            <input
              type='number'
              min={0}
              max={59}
              value={thresholdMinutes}
              onChange={e => setThresholdMinutes(Math.max(0, Number(e.target.value)))}
              className='w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'
            />
          </div>
        </div>

        {/* Error */}
        {error && <p className='text-red-600 text-sm mb-3'>{error}</p>}

        {/* Buttons */}
        <div className='flex justify-end gap-3'>
          <button
            onClick={onClose}
            className='px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100'>
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className='px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50'>
            {loading ? 'Saving...' : 'Save Stage'}
          </button>
        </div>

      </div>
    </div>
  );
}