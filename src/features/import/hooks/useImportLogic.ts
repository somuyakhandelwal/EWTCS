import * as React from 'react'
import { parseCSV } from '../lib/csv-parser'
import { importHistoricalDataAction } from '../actions/import-actions'
import type { ImportResult } from '../types/import.types'

export function useImportLogic() {
    const [isUploading, setIsUploading] = React.useState(false)
    const [file, setFile] = React.useState<File | null>(null)
    const [result, setResult] = React.useState<ImportResult | null>(null)
    const [error, setError] = React.useState<string | null>(null)
    const [progress, setProgress] = React.useState(0)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0])
            setResult(null)
            setError(null)
        }
    }

    const handleImport = async () => {
        if (!file) return
        setIsUploading(true)
        setError(null)
        setResult(null)
        setProgress(0)

        try {
            const text = await file.text()
            const rows = parseCSV(text)
            if (rows.length === 0) throw new Error('CSV file is empty or malformed')

            const CHUNK_SIZE = 50
            const totalRows = rows.length
            const combinedResult: ImportResult = { successCount: 0, failureCount: 0, errors: [] }

            for (let i = 0; i < totalRows; i += CHUNK_SIZE) {
                const chunk = rows.slice(i, i + CHUNK_SIZE)
                const response = await importHistoricalDataAction(chunk)
                if (response.success && response.result) {
                    combinedResult.successCount += response.result.successCount
                    combinedResult.failureCount += response.result.failureCount
                    combinedResult.errors.push(...response.result.errors)
                    setProgress(Math.min(Math.round(((i + chunk.length) / totalRows) * 100), 100))
                    setResult({ ...combinedResult })
                } else {
                    throw new Error(response.error || 'Import failed mid-process')
                }
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred')
        } finally {
            setIsUploading(false)
        }
    }

    return { isUploading, file, result, error, progress, handleFileChange, handleImport, setFile, setResult, setError }
}
