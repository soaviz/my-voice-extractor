'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const schema = z.object({
  nickname: z
    .string()
    .min(2, '닉네임은 최소 2자 이상이어야 합니다.')
    .max(20, '20자 이내로 입력해 주세요.')
    .regex(/^[a-zA-Z0-9가-힣_]+$/, '특수문자는 언더스코어(_)만 사용 가능합니다.'),
  avatar_url: z.string().url().optional().or(z.literal('')),
})

export async function completeOnboarding(formData: FormData) {
  const raw = {
    nickname: formData.get('nickname') as string,
    avatar_url: (formData.get('avatar_url') as string) || '',
  }

  const parsed = schema.safeParse(raw)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? '입력값을 확인해 주세요.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: '로그인이 필요합니다.' }

  const { error } = await supabase
    .from('users')
    .update({
      nickname: parsed.data.nickname,
      avatar_url: parsed.data.avatar_url || null,
      onboarded_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (error) return { error: error.message }

  redirect('/home')
}
