'use client'

import * as React from 'react'
import { Upload, AlertCircle, FileUp, Loader2, X } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { useImportLogic } from '../hooks/useImportLogic'
import { ImportResultDisplay } from './ImportResultDisplay'

export function ImportDialog() {
    const [isOpen, setIsOpen] = React.useState(false)
    const { isUploading, file, result, error, progress, handleFileChange, handleImport } = useImportLogic()

    if (!isOpen) {
        return (
            <Button variant="outline" onClick={() => setIsOpen(true)} className="flex items-center gap-2 border-border hover:bg-muted text-card-foreground">
                <FileUp className="h-4 w-4" />
                Import History
            </Button>
        )
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-[600px] flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-border flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-foreground">Import Historical Data</h2>
                        <p className="text-sm text-muted-foreground mt-1">Required: bed_number, admitted_at, discharged_at, discharged_by_username</p>
                    </div>
                    <button onClick={() => setIsOpen(false)} disabled={isUploading} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto">
                    <div className="flex flex-col items-center border-2 border-dashed border-border rounded-lg p-12 hover:border-border bg-background">
                        <input type="file" accept=".csv" className="hidden" id="csv-upload" onChange={handleFileChange} disabled={isUploading} />
                        <label htmlFor="csv-upload" className="flex flex-col items-center gap-2 cursor-pointer">
                            <Upload className="h-10 w-10 text-muted-foreground" />
                            <span className="text-sm font-medium text-card-foreground">{file ? file.name : "Select or drag CSV"}</span>
                            <span className="text-xs text-muted-foreground">Max: 10MB</span>
                        </label>
                    </div>

                    {isUploading && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-muted-foreground"><span>Processing...</span><span>{progress}%</span></div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                            </div>
                        </div>
                    )}

                    {error && (
                        <div className="p-4 bg-red-900/20 border border-red-900/50 rounded-md flex gap-3 text-red-400">
                            <AlertCircle className="h-5 w-5 shrink-0" />
                            <div className="text-sm"><h4 className="font-bold">Error</h4><p>{error}</p></div>
                        </div>
                    )}

                    {result && <ImportResultDisplay result={result} />}
                </div>

                <div className="p-6 border-t border-border flex justify-end gap-3">
                    <Button variant="ghost" onClick={() => setIsOpen(false)} disabled={isUploading} className="text-muted-foreground hover:bg-muted">Cancel</Button>
                    <Button onClick={handleImport} disabled={!file || isUploading} className="bg-emerald-600 hover:bg-emerald-700 text-foreground flex items-center gap-2">
                        {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
                        {isUploading ? "Importing" : "Start Import"}
                    </Button>
                </div>
            </div>
        </div>
    )
}
