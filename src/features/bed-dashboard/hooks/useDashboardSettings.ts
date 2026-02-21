'use client'

import { useState, useEffect, useCallback } from 'react'

const SETTINGS_KEY = 'ewtcs-dashboard-settings'

interface DashboardSettings {
    confirmCriticalStages: boolean
    animationEnabled: boolean
}

const DEFAULT_SETTINGS: DashboardSettings = {
    confirmCriticalStages: true,
    animationEnabled: true,
}

export function useDashboardSettings() {
    const [settings, setSettings] = useState<DashboardSettings>(DEFAULT_SETTINGS)
    const [isLoaded, setIsLoaded] = useState(false)

    useEffect(() => {
        try {
            const stored = localStorage.getItem(SETTINGS_KEY)
            if (stored) {
                setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) })
            }
        } catch (e) {
            console.error('Failed to load dashboard settings', e)
        } finally {
            setIsLoaded(true)
        }
    }, [])

    const updateSettings = useCallback((newSettings: Partial<DashboardSettings>) => {
        setSettings(prev => {
            const next = { ...prev, ...newSettings }
            localStorage.setItem(SETTINGS_KEY, JSON.stringify(next))
            return next
        })
    }, [])

    const toggleConfirmation = useCallback(() => {
        updateSettings({ confirmCriticalStages: !settings.confirmCriticalStages })
    }, [settings.confirmCriticalStages, updateSettings])

    const toggleAnimations = useCallback(() => {
        updateSettings({ animationEnabled: !settings.animationEnabled })
    }, [settings.animationEnabled, updateSettings])

    return {
        settings,
        isLoaded,
        updateSettings,
        toggleConfirmation,
        toggleAnimations,
    }
}
