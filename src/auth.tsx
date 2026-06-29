import {Session,User} from '@supabase/supabase-js'
import {createContext,ReactNode,useContext,useEffect,useMemo,useState} from 'react'
import {supabase,supabaseConfigurationError} from './lib/supabase'

type AuthState={session:Session|null;user:User|null;loading:boolean;configurationError:string;signIn:(email:string)=>Promise<string>;signOut:()=>Promise<void>}
const AuthContext=createContext<AuthState|null>(null)

function signInError(code:string|undefined,message:string){
 const notInvited=['signup_disabled','user_not_found','invite_not_found','email_address_not_authorized'].includes(code||'')||/signups? (?:are )?not allowed|user not found|not invited/i.test(message)
 return notInvited?'This email has not been invited to Folion.':'Folion could not send the sign-in link. Please try again.'
}

export function AuthProvider({children}:{children:ReactNode}){
 const [session,setSession]=useState<Session|null>(null);const [loading,setLoading]=useState(Boolean(supabase))
 useEffect(()=>{if(!supabase){setLoading(false);return}let active=true;supabase.auth.getSession().then(({data})=>{if(active){setSession(data.session);setLoading(false)}});const {data}=supabase.auth.onAuthStateChange((_event,next)=>{setSession(next);setLoading(false)});return()=>{active=false;data.subscription.unsubscribe()}},[])
 const signIn=async(email:string)=>{if(!supabase)return supabaseConfigurationError;const {error}=await supabase.auth.signInWithOtp({email,options:{shouldCreateUser:false,emailRedirectTo:`${window.location.origin}/home`}});return error?signInError(error.code,error.message):''}
 const signOut=async()=>{if(supabase)await supabase.auth.signOut()}
 const value=useMemo(()=>({session,user:session?.user||null,loading,configurationError:supabaseConfigurationError,signIn,signOut}),[session,loading])
 return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(){const value=useContext(AuthContext);if(!value)throw new Error('Missing AuthProvider');return value}
