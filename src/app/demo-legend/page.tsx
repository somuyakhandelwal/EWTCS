// Demo page to showcase the BedStatusLegend component
// This is for testing and demonstration purposes only

'use client'

import { BedStatusLegend } from '@/features/bed-dashboard/components/BedStatusLegend'
import type { Stage } from '@/features/bed-dashboard/types/bed'

// Mock stages data for demonstration
const mockStages: Stage[] = [
  { id: '1', name: 'Empty', colorCode: 'gray', sortOrder: 0, description: 'Bed is available and ready for new patient' },
  { id: '2', name: 'Registration', colorCode: 'blue', sortOrder: 1, description: 'Patient registration in progress' },
  { id: '3', name: 'Triage', colorCode: 'cyan', sortOrder: 2, description: 'Initial assessment and prioritization' },
  { id: '4', name: 'Examination', colorCode: 'yellow', sortOrder: 3, description: 'Doctor examination in progress' },
  { id: '5', name: 'Lab Work', colorCode: 'orange', sortOrder: 4, description: 'Waiting for or conducting lab tests' },
  { id: '6', name: 'Treatment', colorCode: 'green', sortOrder: 5, description: 'Active treatment being administered' },
  { id: '7', name: 'Observation', colorCode: 'purple', sortOrder: 6, description: 'Patient under observation' },
  { id: '8', name: 'Discharge', colorCode: 'pink', sortOrder: 7, description: 'Discharge process in progress' },
]

export default function DemoLegendPage() {
  return (
    <div className="min-h-screen bg-black text-foreground p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
            Color Legend Demo
          </h1>
          <p className="text-zinc-400">US-4.4: Display Color Legend - Demonstration of collapsible and accessible legend</p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">Features Demonstrated:</h2>
          <ul className="list-disc list-inside text-zinc-300 space-y-2">
            <li>✅ Legend is always visible on dashboard</li>
            <li>✅ Legend shows all stage colors</li>
            <li>✅ Legend shows red = delayed</li>
            <li>✅ Legend is collapsible to save space (click the Show/Hide button)</li>
            <li>✅ Legend is accessible (screen reader compatible with ARIA attributes)</li>
          </ul>
        </div>

        <BedStatusLegend stages={mockStages} />

        <div className="mt-8 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <h3 className="text-lg font-semibold text-white mb-3">Accessibility Features:</h3>
          <ul className="text-sm text-zinc-300 space-y-2">
            <li><code className="text-blue-400">role="region"</code> - Identifies the legend as a landmark region</li>
            <li><code className="text-blue-400">aria-label</code> - Provides descriptive labels for screen readers</li>
            <li><code className="text-blue-400">aria-expanded</code> - Indicates collapse/expand state</li>
            <li><code className="text-blue-400">aria-controls</code> - Links toggle button to content</li>
            <li><code className="text-blue-400">role="list"</code> and <code className="text-blue-400">role="listitem"</code> - Semantic list structure</li>
            <li><code className="text-blue-400">aria-hidden="true"</code> - Hides decorative elements from screen readers</li>
            <li><code className="text-blue-400">focus:ring-2</code> - Visible focus indicators for keyboard navigation</li>
          </ul>
        </div>

        <div className="mt-8 p-4 bg-zinc-900/50 rounded-lg border border-zinc-800">
          <h3 className="text-lg font-semibold text-white mb-3">Persistence Feature:</h3>
          <p className="text-zinc-300">
            The collapsed/expanded state is saved to localStorage. Try collapsing the legend and refreshing the page - 
            it will remember your preference!
          </p>
        </div>
      </div>
    </div>
  )
}
