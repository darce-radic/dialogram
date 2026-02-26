'use client'

import { useRouter } from 'next/navigation'
import { LogOut, PlugZap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

export function SidebarFooter() {
  const router = useRouter()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/sign-in')
    router.refresh()
  }

  return (
    <div className="border-t px-3 py-3">
      <Button
        variant="ghost"
        className="mb-1 w-full justify-start text-muted-foreground"
        onClick={() => router.push('/integrations')}
      >
        <PlugZap className="mr-2 h-4 w-4" />
        Integration Quick Start
      </Button>
      <Button
        variant="ghost"
        className="w-full justify-start text-muted-foreground"
        onClick={handleSignOut}
      >
        <LogOut className="mr-2 h-4 w-4" />
        Sign out
      </Button>
    </div>
  )
}
