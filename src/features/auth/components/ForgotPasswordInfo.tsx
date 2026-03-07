'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Info } from 'lucide-react'

/**
 * US-5.5 AC: "Forgot Password" link on login page.
 * No email infrastructure exists yet — instructs users to contact admin.
 * If email is configured in a future phase, swap the body for a reset-request form.
 */
export default function ForgotPasswordInfo() {
    const [open, setOpen] = useState(false)

    return (
        <div className="w-full">
            <button
                type="button"
                onClick={() => setOpen((prev) => !prev)}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:underline"
                aria-expanded={open}
            >
                <Info className="h-3.5 w-3.5 shrink-0" />
                Forgot password?
                {open ? (
                    <ChevronUp className="h-3 w-3" />
                ) : (
                    <ChevronDown className="h-3 w-3" />
                )}
            </button>

            {open && (
                <div className="mt-2 rounded-md border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/10 p-3 text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                    <p className="font-medium mb-1">Password recovery</p>
                    <p>
                        This is an internal hospital system. Password resets must be
                        performed by an{' '}
                        <span className="font-semibold text-amber-900 dark:text-amber-200">administrator</span>.
                    </p>
                    <p className="mt-1.5 text-amber-700 dark:text-amber-400/80">
                        Contact your ward admin or IT support and ask them to issue a
                        temporary password via the User Management panel.
                    </p>
                </div>
            )}
        </div>
    )
}
