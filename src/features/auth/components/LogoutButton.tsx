'use client'

import { Button } from "@/shared/components/ui/button"
import { LogOut } from "lucide-react"
import { logout } from "../actions/auth-actions"

export default function LogoutButton() {
    return (
        <form action={logout}>
            <Button variant="outline" size="sm" className="text-zinc-400 hover:text-white hover:bg-zinc-800 gap-2">
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
            </Button>
        </form>
    )
}
