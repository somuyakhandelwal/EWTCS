import { getRetentionConfig } from '@/features/data-retention/lib/retention-config-queries'
import { getRecentArchivalRuns } from '@/features/data-retention/lib/archival-queries'
import { DataRetentionView } from "@/features/data-retention/components/DataRetentionView"

interface Props {
    readOnly: boolean
}

export async function DataRetentionContainer({ readOnly }: Props) {
    // Parallel fetch for retention specific data
    const [config, runs] = await Promise.all([
        getRetentionConfig().catch(() => null),
        getRecentArchivalRuns(10).catch(() => []),
    ])

    if (!config) return null

    return (
        <DataRetentionView
            initialConfig={config}
            initialRuns={runs || []}
            readOnly={readOnly}
        />
    )
}
