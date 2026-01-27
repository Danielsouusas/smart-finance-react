import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hoegguhazbiyrpzegard.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvZWdndWhhemJpeXJwemVnYXJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1MDk5MDEsImV4cCI6MjA4NTA4NTkwMX0.Csxr-t8ecO5QopNzfgPiFE6ukeLowYVFO-eDkPBe7S4'

export const supabase = createClient(supabaseUrl, supabaseKey)