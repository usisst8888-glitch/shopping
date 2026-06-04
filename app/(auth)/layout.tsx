import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { getSiteConfigFull } from '@/lib/site'

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/')
  }

  const site = await getSiteConfigFull()

  return (
    <>
      <Header
        siteName={site.name}
        navItems={site.design?.nav_items}
        logoUrl={site.design?.logo_url}
        navFontSize={site.design?.nav_font_size}
        navColor={site.design?.nav_color}
        navHoverColor={site.design?.nav_hover_color}
        headerAuthConfigRaw={(site.design as unknown as { header_auth_config?: unknown } | null)?.header_auth_config}
      />
      <main>{children}</main>
      <Footer
        siteName={site.name}
        description={site.description}
        design={site.design}
      />
    </>
  )
}
