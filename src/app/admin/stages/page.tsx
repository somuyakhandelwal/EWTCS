import { getStages } from '@/features/stage-management/actions/stage-actions';
import { StageList } from '@/features/stage-management/components/StageList';

// Force dynamic rendering - don't pre-render during build
// This prevents build-time errors when database connection requires specific env config
export const dynamic = 'force-dynamic';

export default async function StagesPage() {
  const stages = await getStages();
  return (
    <div className='p-6 max-w-2xl mx-auto'>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold'>Workflow Stage Configuration</h1>
        <p className='text-gray-500 text-sm mt-1'>
          Default stages cannot be deleted. You can add, edit, delete and reorder custom stages.
        </p>
      </div>
      <StageList initialStages={stages} />
    </div>
  );
}