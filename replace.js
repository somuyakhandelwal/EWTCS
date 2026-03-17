const fs = require('fs');
let content = fs.readFileSync('src/features/bed-dashboard/components/BedDashboardClient.tsx', 'utf8');

const importStatement = "import { BedDashboardHeader } from './BedDashboardHeader';\n";
if (!content.includes('BedDashboardHeader')) {
  content = content.replace("import { BedGrid } from './BedGrid'", importStatement + "import { BedGrid } from './BedGrid'");
}

const regex = /<div className="flex justify-between items-center px-6 py-4 bg-sky-600\/90 text-white min-h-\[64px\] border-b border-sky-700 shadow-sm relative z-20 shrink-0\">[\s\S]*?<\/div>[\s]*<\/div>[\s]*<\/div>/;

content = content.replace(regex, '<BedDashboardHeader summary={summary} />');

fs.writeFileSync('src/features/bed-dashboard/components/BedDashboardClient.tsx', content);
