import { createClient } from '@/lib/supabase/server'
import { EditProfileForm } from './edit-form'

export const metadata = { title: '정보 수정' }

export default async function EditProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, email, gender, phone, zipcode, address, address_detail, birthdate, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <section>
      <h2 className="mb-5 text-xl font-bold text-zinc-900">정보 수정</h2>
      <EditProfileForm
        initialName={profile?.name ?? ''}
        email={profile?.email ?? user.email ?? ''}
        initialGender={(profile?.gender as 'male' | 'female' | null) ?? null}
        initialPhone={profile?.phone ?? ''}
        initialZipcode={profile?.zipcode ?? ''}
        initialAddress={profile?.address ?? ''}
        initialAddressDetail={profile?.address_detail ?? ''}
        initialBirthdate={profile?.birthdate ?? ''}
        initialAvatarUrl={profile?.avatar_url ?? null}
      />
    </section>
  )
}
