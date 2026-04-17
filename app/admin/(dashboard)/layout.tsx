import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/admin/sidebar'
import { getSites } from '@/app/admin/(dashboard)/settings/actions'
import { getAdminSiteId } from '@/lib/admin-site'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // role 체크: admin만 접근 가능
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    redirect('/')
  }

  const sites = await getSites()
  const currentSiteId = await getAdminSiteId(sites)

  return (
    <div className="flex min-h-screen">
      <AdminSidebar user={user} sites={sites} currentSiteId={currentSiteId} />
      <main className="flex-1 bg-zinc-50 p-8">
        {children}
      </main>
    </div>
  )
}
