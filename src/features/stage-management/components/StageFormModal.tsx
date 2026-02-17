'use client';
import { useState } from 'react';
import type { Stage } from '../types/stage.types';
import { createStage, updateStage } from '../actions/stage-actions';

const COLORS = ['yellow', 'orange', 'blue', 'purple', 'green', 'grey'];
const COLOR_PREVIEW: Record<string, string> = {
  yellow: 'bg-yellow-400',
  orange: 'bg-orange-400',
  blue:   'bg-blue-500',
  purple: 'bg-purple-400',
  green:  'bg-green-400',
  grey:   'bg-gray-400',
};

export function StageFormModal({ stage, onClose, onSaved }:
  { stage?: Stage; onClose: () => void; onSaved: (s: Stage) => void }) {
  const [name, setName] = useState(stage?.name ?? '');
  const [color, setColor] = useState(stage?.color_code ?? 'blue');
  const [desc, setDesc] = useState(stage?.description ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return setError('Stage name is required');
    if (name.length > 50) return setError('Name must be max 50 characters');
    setLoading(true); setError('');
    try {
      if (stage) {
        await updateStage({ id: stage.id, name, color_code: color, description: desc });
        onSaved({ ...stage, name, color_code: color, description: desc });
      } else {
        await createStage({ name, color_code: color, description: desc });
        onSaved({ id: Date.now().toString(), name, color_code: color,
          description: desc, display_order: 99, is_default: false,
          is_active: true, created_at: '', updated_at: '' });
      }
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
          {COLORS.map(c => (
            <button key={c} onClick={() => setColor(c)} title={c}
              className={`w-9 h-9 rounded-full border-4 ${COLOR_PREVIEW[c]} ${
                color === c ? 'border-blue-600 scale-110' : 'border-transparent'
              } transition-all`} />
          ))}
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