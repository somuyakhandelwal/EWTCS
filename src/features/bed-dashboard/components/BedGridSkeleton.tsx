export function BedGridSkeleton() {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(8)].map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-5 h-[160px] animate-pulse">
                    <div className="flex justify-between items-start mb-4">
                        <div className="h-6 w-16 bg-muted rounded" />
                        <div className="h-5 w-24 bg-muted rounded-full" />
                    </div>
                    <div className="space-y-3">
                        <div className="h-4 w-full bg-muted rounded" />
                        <div className="h-4 w-2/3 bg-muted rounded" />
                    </div>
                    <div className="mt-4 pt-4 border-t border-border/50 flex justify-between">
                        <div className="h-3 w-20 bg-muted rounded" />
                        <div className="h-3 w-12 bg-muted rounded" />
                    </div>
                </div>
            ))}
        </div>
    )
}
