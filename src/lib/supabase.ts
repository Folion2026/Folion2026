import {createClient} from '@supabase/supabase-js'

const configuredUrl=(import.meta.env.VITE_SUPABASE_URL as string|undefined)?.trim()
const publishableKey=(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string|undefined)?.trim()

function projectOrigin(value:string|undefined){
 if(!value)return ''
 try{const parsed=new URL(value);return parsed.protocol==='http:'||parsed.protocol==='https:'?parsed.origin:''}catch{return ''}
}

const url=projectOrigin(configuredUrl)
export const supabaseConfigurationError=!configuredUrl||!publishableKey?'Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to connect Folion.':!url?'VITE_SUPABASE_URL must be an absolute http or https Supabase project URL.':''
export const supabase=url&&publishableKey?createClient(url,publishableKey,{auth:{flowType:'pkce',persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}):null
