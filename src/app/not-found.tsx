import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <AlertTriangle className="h-20 w-20 text-yellow-500 mx-auto" />
        
        <div className="space-y-2">
          <h1 className="text-4xl font-bold text-white">404</h1>
          <h2 className="text-xl font-semibold text-zinc-300">Page Not Found</h2>
          <p className="text-zinc-400">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="default">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/login">Go to Login</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
