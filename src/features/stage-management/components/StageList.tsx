'use client';
import { useState } from 'react';
import type { Stage } from '../types/stage.types';
import { deleteStage, reorderStages } from '../actions/stage-actions';
import { StageFormModal } from './StageFormModal';
import { getStageColorClasses } from '@/shared/utils/stage-colors';

export function StageList({ initialStages }: { initialStages: Stage[] }) {
  const [stages, setStages] = useState<Stage[]>(initialStages);
  const [editing, setEditing] = useState<Stage | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const handleDelete = async (id: string) => {
    if (!confirm('Is stage ko delete karna chahte ho?')) return;
    try {
      await deleteStage(id);
      setStages(stages.filter(s => s.id !== id));
    } catch (e: unknown) { alert(e instanceof Error ? e.message : 'Something went wrong'); }
  };

  const move = async (index: number, dir: 'up' | 'down') => {
    const next = [...stages];
    const swap = dir === 'up' ? index - 1 : index + 1;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setStages(next);
    await reorderStages(next.map(s => s.id));
  };

  const formatThreshold = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  return (
    <div className='space-y-3'>
      <button
        onClick={() => setShowAdd(true)}
        className='px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700'>
        + Add New Stage
      </button>

      {stages.map((stage, i) => {
        const colorClasses = getStageColorClasses(stage.color_code);
        return (
          <div key={stage.id}
            className={`flex items-center justify-between p-4 rounded-lg border-2 ${colorClasses.bg} ${colorClasses.border}`}>

            <div className='flex items-center gap-3'>
              <span className='text-lg font-bold text-zinc-200'>{i + 1}</span>
              <span className={`font-semibold text-base ${colorClasses.text}`}>{stage.name}</span>
              <span className='ml-2 text-xs text-zinc-200 bg-blue-900/60 px-2 py-0.5 rounded-full border border-blue-700'>
                Delay: {formatThreshold(stage.delay_threshold_minutes ?? 180)}
              </span>
              {stage.is_default && (
                <span className='text-xs bg-zinc-900/60 px-2 py-0.5 rounded-full text-zinc-200 border border-zinc-700'>
                  Default
                </span>
              )}
            </div>

            <div className='flex gap-2'>
              <button
                onClick={() => move(i, 'up')}
                disabled={i === 0}
                className='px-3 py-1 bg-white border border-gray-400 rounded text-gray-700 font-bold disabled:opacity-30 hover:bg-gray-100'>
                ↑
              </button>
              <button
                onClick={() => move(i, 'down')}
                disabled={i === stages.length - 1}
                className='px-3 py-1 bg-white border border-gray-400 rounded text-gray-700 font-bold disabled:opacity-30 hover:bg-gray-100'>
                ↓
              </button>
              <button
                onClick={() => setEditing(stage)}
                className='px-3 py-1 bg-white border border-gray-400 rounded text-gray-800 font-medium text-sm hover:bg-gray-100'>
                Edit
              </button>
              {!stage.is_default && (
                <button
                  onClick={() => handleDelete(stage.id)}
                  className='px-3 py-1 bg-red-500 border border-red-600 rounded text-white font-medium text-sm hover:bg-red-600'>
                  Delete
                </button>
              )}
            </div>
          </div>
        );
      })}

      {(showAdd || editing) && (
        <StageFormModal
          stage={editing ?? undefined}
          onClose={() => { setShowAdd(false); setEditing(null); }}
          onSaved={(s) => {
            if (editing) setStages(stages.map(x => x.id === s.id ? s : x));
            else setStages([...stages, s]);
            setShowAdd(false); setEditing(null);
          }}
        />
      )}
    </div>
  );
}