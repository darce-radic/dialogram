'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Github } from 'lucide-react'

export function OAuthButton() {
  const handleOAuth = async () => {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
  }

  return (
    <Button
      variant="outline"
      className="w-full"
      onClick={handleOAuth}
      type="button"
    >
      <Github className="mr-2 h-4 w-4" />
      Continue with GitHub
    </Button>
  )
}
