'use client'
// US-6.3: Global Delay Threshold configuration form (AC-1, AC-2, AC-4, AC-5)

import { useState } from 'react'
import { setGlobalThresholdAction } from '@/shared/actions/settings-actions'

interface GlobalThresholdFormProps {
  initialMinutes: number
}

export function GlobalThresholdForm({ initialMinutes }: GlobalThresholdFormProps) {
  const [hours, setHours] = useState(Math.floor(initialMinutes / 60))
  const [minutes, setMinutes] = useState(initialMinutes % 60)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const totalMinutes = hours * 60 + minutes
  const preview =
    hours > 0 && minutes > 0
      ? `${hours}h ${minutes}min`
      : hours > 0
      ? `${hours} hour${hours !== 1 ? 's' : ''}`
      : `${minutes} minutes`

  const handleSave = async () => {
    if (totalMinutes < 30) {
      setError('Threshold must be at least 30 minutes')
      return
    }
    setLoading(true)
    setError('')
    setSaved(false)
    const res = await setGlobalThresholdAction({ hours, minutes })
    setLoading(false)
    if (res.success) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      setError(res.error ?? 'Failed to save')
    }
  }

  return (
    <div className='p-4 rounded-lg border-2 border-blue-200 bg-blue-50 mb-6'>
      <h2 className='text-lg font-bold text-gray-900 mb-1'>Global Delay Threshold</h2>
      <p className='text-sm text-gray-500 mb-4'>
        Beds exceeding this time are flagged as delayed. Individual stages can override this.
      </p>

      <div className='flex items-end gap-4 flex-wrap'>
        <div>
          <label className='block text-xs font-semibold text-gray-700 mb-1'>Hours</label>
          <input
            type='number'
            min={0}
            max={24}
            value={hours}
            onChange={e => { setHours(Math.max(0, Math.min(24, Number(e.target.value)))); setSaved(false) }}
            className='w-20 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
        </div>
        <div>
          <label className='block text-xs font-semibold text-gray-700 mb-1'>Minutes</label>
          <input
            type='number'
            min={0}
            max={59}
            value={minutes}
            onChange={e => { setMinutes(Math.max(0, Math.min(59, Number(e.target.value)))); setSaved(false) }}
            className='w-20 border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
        </div>
        <div className='flex-1 min-w-[120px]'>
          <p className='text-xs text-gray-500 mb-1'>Preview</p>
          <p className={`font-semibold ${totalMinutes < 30 ? 'text-red-600' : 'text-blue-700'}`}>
            {preview}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={loading || totalMinutes < 30}
          className='px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50'
        >
          {loading ? 'Saving…' : 'Save Threshold'}
        </button>
      </div>

      {error && <p className='text-red-600 text-sm mt-2'>{error}</p>}
      {saved && <p className='text-green-600 text-sm mt-2'>✓ Threshold updated — applies immediately</p>}
    </div>
  )
}
