'use client'

import { AlertCircle } from 'lucide-react'
import { useDatabaseStatus } from '@/shared/hooks/useDatabaseStatus'

export function DatabaseStatusBanner() {
  const { isOnline, lastOnline } = useDatabaseStatus()

  if (isOnline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top duration-300">
      <div className="bg-red-600 text-white p-6 shadow-2xl border-b-4 border-red-800">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <AlertCircle className="w-12 h-12 animate-pulse" />
            <div>
              <h1 className="text-3xl font-bold uppercase tracking-wider">System Offline</h1>
              <p className="text-xl font-medium mt-1">
                Database connection lost. Please revert to PAPER RECORDS immediately.
              </p>
            </div>
          </div>

          <div className="text-right bg-red-700/50 p-3 rounded-lg border border-red-500">
            <p className="text-sm font-semibold opacity-90">Last Successful Connection</p>
            <p className="text-lg font-mono tracking-wide">
              {lastOnline ? lastOnline.toLocaleTimeString() : 'Unknown'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
