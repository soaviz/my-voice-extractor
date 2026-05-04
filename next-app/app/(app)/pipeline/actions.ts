'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type ProjectFormat = 'film' | 'short' | 'series' | 'mv' | 'ad'

export interface CreateProjectInput {
  title: string
  format: ProjectFormat
  genre: string
  logline: string
  color: string
}

export async function createProject(input: CreateProjectInput) {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      user_id: user.id,
      title: input.title,
      status: 'draft',
      metadata: {
        format: input.format,
        genre: input.genre,
        logline: input.logline,
        color: input.color,
      },
    })
    .select('id')
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/pipeline')
  return { id: data.id }
}

export async function getProjects() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('user_id', user.id)
    .neq('status', 'archived')
    .order('updated_at', { ascending: false })

  if (error) return []
  return data
}
