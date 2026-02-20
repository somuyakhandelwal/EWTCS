'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Stage } from '../types/stage.types';
import { createStage, updateStage } from '../actions/stage-actions';
import { getStageColorClasses, getSupportedStageColors } from '@/shared/utils/stage-colors';
import { isTransientError, retryAsync } from '@/shared/lib/retry';

const COLORS = getSupportedStageColors();
const AUTOSAVE_DEBOUNCE_MS = 500;
const AUTOSAVE_RETRIES = 2;
const normalizeStageColor = (value?: string) =>
  value?.toLowerCase() === 'grey' ? 'gray' : value;

export function StageFormModal({ stage, onClose, onSaved }:
  { stage?: Stage; onClose: () => void; onSaved: (s: Stage) => void }) {
  const [name, setName] = useState(stage?.name ?? '');
  const [color, setColor] = useState(normalizeStageColor(stage?.color_code) ?? 'blue');
  const [desc, setDesc] = useState(stage?.description ?? '');
  const stageThresholdMins = stage?.threshold_minutes ?? null;
  const [thresholdHours, setThresholdHours] = useState(
    stageThresholdMins ? Math.floor(stageThresholdMins / 60) : ''
  );
  const [thresholdMins, setThresholdMins] = useState(
    stageThresholdMins ? stageThresholdMins % 60 : ''
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'retrying' | 'saved' | 'failed'>('idle');
  const isInitialized = useRef(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const validateInput = useCallback(() => {
    if (!name.trim()) return 'Stage name is required';
    if (name.length > 50) return 'Name must be max 50 characters';
    const thH = Number(thresholdHours);
    const thM = Number(thresholdMins);
    const hasThreshold = thresholdHours !== '' || thresholdMins !== '';
    const totalThresholdMins = hasThreshold ? thH * 60 + thM : null;
    if (hasThreshold && (totalThresholdMins ?? 0) < 30) return 'Stage threshold must be at least 30 minutes';
    return null;
  }, [name, thresholdHours, thresholdMins]);

  const getThresholdMinutes = useCallback(() => {
    const thH = Number(thresholdHours);
    const thM = Number(thresholdMins);
    const hasThreshold = thresholdHours !== '' || thresholdMins !== '';
    return hasThreshold ? thH * 60 + thM : null;
  }, [thresholdHours, thresholdMins]);

  const saveStage = useCallback(async (fromAutosave = false) => {
    const validationError = validateInput();
    if (validationError) {
      setError(validationError);
      setSaveState('failed');
      return;
    }

    const totalThresholdMins = getThresholdMinutes();
    setLoading(true);
    setError('');

    try {
      if (stage) {
        await retryAsync(async attempt => {
          setSaveState(attempt > 1 ? 'retrying' : 'saving');
          await updateStage({ id: stage.id, name, color_code: color, description: desc,
            threshold_minutes: totalThresholdMins });
        }, { retries: AUTOSAVE_RETRIES, shouldRetry: isTransientError });

        onSaved({ ...stage, name, color_code: color, description: desc,
          threshold_minutes: totalThresholdMins });
        setSaveState('saved');
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => setSaveState('idle'), 1800);
      } else {
        await createStage({ name, color_code: color, description: desc });
        onSaved({ id: Date.now().toString(), name, color_code: color,
          description: desc, display_order: 99, is_default: false,
          is_active: true, threshold_minutes: null, created_at: '', updated_at: '' });
        setSaveState('saved');
      }
    } catch (e: unknown) {
      setSaveState('failed');
      setError(e instanceof Error ? e.message : 'Something went wrong');
      if (fromAutosave && typeof window !== 'undefined' && isTransientError(e)) {
        window.alert('Auto-save failed after retries. Please try again.');
      }
    }
    finally { setLoading(false); }
  }, [color, desc, getThresholdMinutes, name, onSaved, stage, validateInput]);

  useEffect(() => {
    if (!stage) return;
    if (!isInitialized.current) {
      isInitialized.current = true;
      return;
    }
    const timer = setTimeout(() => {
      void saveStage(true);
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [stage, name, color, desc, thresholdHours, thresholdMins, saveStage]);

  useEffect(() => () => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
  }, []);

  return (
    <div className='fixed inset-0 bg-black/60 flex items-center justify-center z-50'>
      <div className='bg-white rounded-xl p-6 w-full max-w-md shadow-2xl'>
        <h2 className='text-xl font-bold text-gray-900 mb-4'>
          {stage ? 'Edit Stage' : 'Add New Stage'}
        </h2>
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
                className={`w-9 h-9 rounded-full border-2 ${colorClasses.bg} ${colorClasses.border} ${
                  color === c ? 'ring-2 ring-blue-600 ring-offset-2 ring-offset-white scale-110' : ''
                } transition-all`}
              />
            );
          })}
        </div>
        <label className='block text-sm font-semibold text-gray-700 mb-1'>
          Description <span className='text-gray-400 font-normal'>(Optional)</span>
        </label>
        <input
          value={desc}
          onChange={e => setDesc(e.target.value)}
          className='w-full border border-gray-300 rounded-lg px-3 py-2 mb-4 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'
          placeholder='Stage description...'
        />
        {stage && (
          <>
            <label className='block text-sm font-semibold text-gray-700 mb-1'>
              Delay Threshold Override
              <span className='text-gray-400 font-normal ml-1'>(Optional — leave blank to use global)</span>
            </label>
            <div className='flex gap-2 mb-4'>
              <input
                type='number' min={0} max={24} placeholder='hrs'
                value={thresholdHours}
                onChange={e => setThresholdHours(e.target.value === '' ? '' : Math.max(0, Math.min(24, Number(e.target.value))))}
                className='w-20 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
              <input
                type='number' min={0} max={59} placeholder='min'
                value={thresholdMins}
                onChange={e => setThresholdMins(e.target.value === '' ? '' : Math.max(0, Math.min(59, Number(e.target.value))))}
                className='w-20 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'
              />
              {(thresholdHours !== '' || thresholdMins !== '') && (
                <button type='button' onClick={() => { setThresholdHours(''); setThresholdMins(''); }}
                  className='text-xs text-red-500 hover:underline px-2'>Clear</button>
              )}
            </div>
          </>
        )}
        {error && <p className='text-red-600 text-sm mb-3'>{error}</p>}
        {stage && saveState === 'saving' && <p className='text-blue-600 text-sm mb-3'>Saving changes…</p>}
        {stage && saveState === 'retrying' && <p className='text-amber-700 text-sm mb-3'>Retrying save…</p>}
        {stage && saveState === 'saved' && <p className='text-green-600 text-sm mb-3'>✓ Changes saved</p>}
        <div className='flex justify-end gap-3'>
          <button
            onClick={onClose}
            className='px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100'>
            Cancel
          </button>
          {!stage && (
            <button
              onClick={() => void saveStage(false)}
              disabled={loading}
              className='px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50'>
              {loading ? 'Saving...' : 'Save Stage'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}