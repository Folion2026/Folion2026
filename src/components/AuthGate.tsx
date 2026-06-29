import {FormEvent,ReactNode,useState} from 'react'
import {LockKeyhole,Mail} from 'lucide-react'
import {useAuth} from '../auth'
import FolionLogo from './FolionLogo'
import {Button} from './ui'

export default function AuthGate({children}:{children:ReactNode}){
 const {session,loading,configurationError,signIn}=useAuth();const [email,setEmail]=useState('');const [message,setMessage]=useState('');const [sending,setSending]=useState(false)
 if(loading)return <div className="auth-page"><div className="auth-card"><FolionLogo/><p>Connecting to your workspace…</p></div></div>
 if(session)return <>{children}</>
 const submit=async(event:FormEvent)=>{event.preventDefault();setSending(true);const error=await signIn(email.trim());setSending(false);setMessage(error||'Check your email for the sign-in link.')}
 return <div className="auth-page"><section className="auth-card"><FolionLogo/><div className="auth-icon"><LockKeyhole/></div><p className="eyebrow">Invite-only workspace</p><h1>Sign in to Folion.</h1><p>Use the email address that received your Folion invitation.</p>{configurationError?<div className="auth-message error">{configurationError}</div>:<form onSubmit={submit}><label>Email address<div><Mail/><input required type="email" value={email} onChange={event=>setEmail(event.target.value)} placeholder="you@practice.com"/></div></label><Button type="submit" disabled={sending}>{sending?'Sending link…':'Email me a sign-in link'}</Button></form>}{message&&<div className={`auth-message ${message.startsWith('Check')?'':'error'}`}>{message}</div>}</section></div>
}
