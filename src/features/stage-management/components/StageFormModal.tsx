'use client';

import { useState } from 'react';
import type { Stage } from '../types/stage.types';
import { createStage, updateStage } from '../actions/stage-actions';

const COLORS = ['yellow', 'orange', 'blue', 'purple', 'green', 'grey'];
const COLOR_PREVIEW: Record<string, string> = {
  yellow: 'bg-yellow-300',
  orange: 'bg-orange-300',
  blue:   'bg-blue-300',
  purple: 'bg-purple-300',
  green:  'bg-green-300',
  grey:   'bg-gray-300',
};

export function StageFormModal({ stage, onClose, onSaved }: {
  stage?: Stage;
  onClose: () => void;
  onSaved: (s: Stage) => void;
}) {
  const [name, setName] = useState(stage?.name ?? '');
  const [color, setColor] = useState(stage?.color_code ?? 'blue');
  const [desc, setDesc] = useState(stage?.description ?? '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return setError('Stage name required hai');
    if (name.length > 50) return setError('Name max 50 characters ka hona chahiye');
    setLoading(true);
    setError('');
    try {
      if (stage) {
        await updateStage({ id: stage.id, name, color_code: color, description: desc });
        onSaved({ ...stage, name, color_code: color, description: desc });
      } else {
        await createStage({ name, color_code: color, description: desc });
        onSaved({
          id: Date.now().toString(),
          name,
          color_code: color,
          description: desc,
          display_order: 99,
          is_default: false,
          is_active: true,
          created_at: '',
          updated_at: '',
        });
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-bold mb-4">
          {stage ? 'Stage Edit Karo' : 'Naya Stage Add Karo'}
        </h2>

        <label className="block text-sm font-medium mb-1">
          Stage Name <span className="text-gray-400">({name.length}/50)</span>
        </label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={50}
          className="w-full border rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="e.g. Triage In Progress"
        />

        <label className="block text-sm font-medium mb-2">Color</label>
        <div className="flex gap-3 mb-4">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              title={c}
              className={`w-9 h-9 rounded-full border-4 ${COLOR_PREVIEW[c]} ${
                color === c ? 'border-blue-600 scale-110' : 'border-transparent'
              } transition-all`}
            />
          ))}
        </div>

        <label className="block text-sm font-medium mb-1">
          Description (Optional)
        </label>
        <input
          value={desc}
          onChange={e => setDesc(e.target.value)}
          className="w-full border rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder="Stage ka description..."
        />

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        <div className="flex justify-end gap-3">
          <button onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Karo'}
          </button>
        </div>
      </div>
    </div>
  );
}