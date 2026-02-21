'use client';
import type { Stage } from '../types/stage.types';
import { getStageColorClasses, getSupportedStageColors } from '@/shared/utils/stage-colors';
import { useStageFormLogic } from '../hooks/useStageFormLogic';

const COLORS = getSupportedStageColors();

export function StageFormModal({ stage, onClose, onSaved }:
  { stage?: Stage; onClose: () => void; onSaved: (s: Stage) => void }) {
  const {
    name, setName, color, setColor, desc, setDesc,
    thresholdHours, setThresholdHours, thresholdMins, setThresholdMins,
    error, loading, saveState, restoredNotice, saveStage,
  } = useStageFormLogic({ stage, onSaved });


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
        {restoredNotice && <p className='text-emerald-700 text-sm mb-3'>Recovered unsaved changes from previous session.</p>}
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