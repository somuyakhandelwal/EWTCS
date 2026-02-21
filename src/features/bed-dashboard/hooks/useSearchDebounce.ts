import { useState, useRef, useEffect } from 'react'

export function useSearchDebounce(delay = 200) {
    const [searchInput, setSearchInput] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const searchDebounceRef = useRef<NodeJS.Timeout | null>(null)

    useEffect(() => {
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
        searchDebounceRef.current = setTimeout(() => {
            setSearchQuery(searchInput.trim())
            searchDebounceRef.current = null
        }, delay)

        return () => {
            if (searchDebounceRef.current) {
                clearTimeout(searchDebounceRef.current)
            }
        }
    }, [searchInput, delay])

    return { searchInput, setSearchInput, searchQuery }
}
