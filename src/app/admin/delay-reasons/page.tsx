import Link from 'next/link'
import { Button } from '@/shared/components/ui/button'
import { Tooltip } from '@/shared/components/ui/tooltip'
import { getAllDelayReasonOptions } from '@/features/bed-dashboard/actions/delay-reason-options-actions'
import { DelayReasonOptionsManager } from '@/features/bed-dashboard/components/DelayReasonOptionsManager'

export const dynamic = 'force-dynamic'

export default async function DelayReasonsPage() {
  const options = await getAllDelayReasonOptions()

  return (
    <div className="min-h-screen bg-background text-foreground p-3 sm:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Tooltip content="Return to admin overview" side="bottom">
            <Link href="/admin">
              <Button variant="outline">← Back to Admin</Button>
            </Link>
          </Tooltip>
        </div>
        <div data-help-id="admin-delay-reasons-header">
          <h1 className="text-2xl font-bold text-foreground">Disposition Delay Reasons</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure the dropdown options nurses see when a bed is in a disposition hold.
          </p>
        </div>
        <div data-help-id="admin-delay-reasons-list">
          <DelayReasonOptionsManager initialOptions={options} />
        </div>
      </div>
    </div>
  )
}