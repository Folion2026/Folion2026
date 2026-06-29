import {createClient} from '@supabase/supabase-js'

const url=import.meta.env.VITE_SUPABASE_URL as string|undefined
const publishableKey=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string|undefined

export const supabaseConfigurationError=!url||!publishableKey?'Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to connect Folion.':''
export const supabase=url&&publishableKey?createClient(url,publishableKey,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null
