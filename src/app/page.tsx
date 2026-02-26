import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PublicLanding } from '@/components/marketing/public-landing'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return <PublicLanding />
  }

  const { data: membership } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .limit(1)
    .single()

  if (membership) {
    redirect(`/workspace/${membership.workspace_id}`)
  }

  redirect('/workspace/new')
}
