import {Session} from '@supabase/supabase-js'

export async function apiRequest<T>(session:Session,path:string,init:RequestInit={}):Promise<T>{
 const response=await fetch(`/api${path}`,{...init,headers:{'content-type':'application/json',authorization:`Bearer ${session.access_token}`,...init.headers}})
 const payload=await response.json().catch(()=>({})) as {error?:string}
 if(!response.ok)throw new Error(payload.error||`Folion API request failed (${response.status})`)
 return payload as T
}
