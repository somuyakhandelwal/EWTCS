import { getStages } from '@/features/stage-management/actions/stage-actions';
import { StageList } from '@/features/stage-management/components/StageList';
import { GlobalThresholdForm } from '@/features/stage-management/components/GlobalThresholdForm';
import { RecoveryLogPanel } from '@/features/stage-management/components/RecoveryLogPanel';
import { getGlobalThresholdMinutes } from '@/shared/lib/threshold';
import Link from 'next/link';
import { Button } from '@/shared/components/ui/button';
import { Tooltip } from '@/shared/components/ui/tooltip';

// Force dynamic rendering - don't pre-render during build
// This prevents build-time errors when database connection requires specific env config
export const dynamic = 'force-dynamic';

export default async function StagesPage() {
  const [stages, globalThresholdMinutes] = await Promise.all([
    getStages(),
    getGlobalThresholdMinutes(),
  ]);
  return (
    <div className="min-h-screen bg-background text-foreground p-3 sm:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Tooltip content="Return to admin overview" side="bottom">
            <Link href="/admin">
              <Button variant="outline">← Back to Admin</Button>
            </Link>
          </Tooltip>
        </div>
        <div className="mb-6" data-help-id="admin-stages-header">
          <h1 className="text-2xl font-bold text-foreground">Workflow Stage Configuration</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Default stages cannot be deleted. You can add, edit, delete and reorder custom stages.
          </p>
        </div>
        <GlobalThresholdForm initialMinutes={globalThresholdMinutes} />
        <RecoveryLogPanel />
        <div data-help-id="admin-stages-list">
          <StageList initialStages={stages} />
        </div>
      </div>
    </div>
  );
}