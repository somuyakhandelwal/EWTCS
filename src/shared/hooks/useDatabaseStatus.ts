import { useState, useEffect } from 'react'

interface DatabaseStatus {
  isOnline: boolean
  lastOnline: Date | null
}

export function useDatabaseStatus() {
  const [status, setStatus] = useState<DatabaseStatus>({
    isOnline: true, // Assume online initially to prevent flash
    lastOnline: new Date(),
  })

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/health')
        if (response.ok) {
          setStatus({ isOnline: true, lastOnline: new Date() })
        } else {
          setStatus((prev) => ({ ...prev, isOnline: false }))
        }
      } catch {
        setStatus((prev) => ({ ...prev, isOnline: false }))
      }
    }

    checkStatus()
    const intervalId = setInterval(checkStatus, 10000)
    return () => clearInterval(intervalId)
  }, [])

  return status
}
