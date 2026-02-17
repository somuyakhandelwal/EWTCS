import { getStages } from '@/features/stage-management/actions/stage-actions';
import { StageList } from '@/features/stage-management/components/StageList';

export default async function StagesPage() {
  const stages = await getStages();
  return (
    <div className='p-6 max-w-2xl mx-auto'>
      <div className='mb-6'>
        <h1 className='text-2xl font-bold'>Workflow Stage Configuration</h1>
        <p className='text-gray-500 text-sm mt-1'>
          Default stages delete nahi ho sakte. Custom stages add, edit, delete aur reorder kar sakte ho.
        </p>
      </div>
      <StageList initialStages={stages} />
    </div>
  );
}