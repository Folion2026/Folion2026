import {CSSProperties,useEffect,useState} from 'react'
import {NavLink,Outlet,useLocation} from 'react-router-dom'
import {BookOpen,FolderKanban,Home,IdCard,LogOut,Menu,Plus,Search,Sparkles,X} from 'lucide-react'
import FolionLogo from './FolionLogo'
import {Button} from './ui'
import {useStore} from '../store'
import CommandPalette from './CommandPalette'
import {normalizeProjects} from '../lib/project'
import {useAuth} from '../auth'

const nav=[
  ['/home','Home',Home],
  ['/projects','Projects',FolderKanban],
  ['/studio-v2','Studio',Sparkles],
  ['/folion-id','Folion ID',IdCard],
  ['/magazine','Magazine',BookOpen],
] as const

const routeTitles:Record<string,{eyebrow:string;title:string}>={
  '/home':{eyebrow:'Practice memory',title:'Home'},
  '/projects':{eyebrow:'Practice memory',title:'Projects'},
  '/new-project':{eyebrow:'Practice memory',title:'New project'},
  '/studio-v2':{eyebrow:'Create from memory',title:'Studio'},
  '/folion-id':{eyebrow:'Practice profile',title:'Folion ID'},
}

export function Sidebar({open,onClose}:{open:boolean;onClose:()=>void}){
  const {collections,projects,people,workspace}=useStore();const {user,signOut}=useAuth()
  const safeProjects=normalizeProjects(projects)
  const activeProjects=safeProjects.filter(project=>project.status!=='Archived').length
  const practiceName=safeProjects[0]?.company||'Your practice'
  return <>
    {open&&<button className="fixed inset-0 z-[35] bg-black/30 backdrop-blur-sm lg:hidden" aria-label="Close navigation" onClick={onClose}/>} 
    <aside className={`sidebar ${open?'translate-x-0':'-translate-x-full'} lg:translate-x-0`} aria-label="Practice navigation">
      <div className="flex items-center justify-between">
        <FolionLogo/>
        <button className="icon-btn !grid lg:!hidden" aria-label="Close navigation" onClick={onClose}><X size={18}/></button>
      </div>
      <div className="mt-10">
        <p className="sidebar-label">Workspace</p>
        <nav className="mt-2 space-y-1">{nav.map(([to,label,Icon])=><NavLink key={to} to={to} onClick={onClose} className={({isActive})=>`nav-item ${isActive?'active':''}`}><Icon size={18}/><span>{label}</span></NavLink>)}</nav>
      </div>
      <div className="mt-8">
        <div className="flex items-center justify-between px-3">
          <p className="sidebar-label">Collections</p>
          <NavLink to="/projects" onClick={onClose} className="text-black/35 hover:text-ink" aria-label="View collections"><Plus size={15}/></NavLink>
        </div>
        <div className="mt-2 space-y-0.5">{collections.slice(0,3).map(collection=><NavLink key={collection.id} to={`/collections/${collection.id}`} onClick={onClose} className={({isActive})=>`collection-link ${isActive?'active':''}`}><span className="h-2 w-2 rounded-sm bg-current opacity-45"/>{collection.name}<span className="ml-auto text-[11px] opacity-40">{collection.projectIds.filter(id=>safeProjects.some(project=>project.id===id)).length}</span></NavLink>)}</div>
      </div>
      <div className="mt-auto">
        <div className="practice-switcher">
          <div className="flex items-start justify-between gap-3"><div><div className="sidebar-label !text-white/45">Current practice</div><div className="mt-2 text-sm font-medium">{practiceName}</div></div><div className="grid grid-cols-2 gap-0.5 mt-1">{[workspace?.brandKit.primaryColour,workspace?.brandKit.accentColour,workspace?.brandKit.textColour,workspace?.brandKit.backgroundColour].filter(Boolean).map((c,index)=><i key={`${c}-${index}`} className="h-1.5 w-1.5" style={{background:c}}/>)}</div></div>
          <div className="mt-4 pt-3 border-t border-white/10 text-xs text-white/50">{activeProjects} active projects · {people.length} people</div>
        </div>
        <div className="flex items-center gap-3 mt-4 px-1"><div className="avatar">{(user?.email||'F').slice(0,2).toUpperCase()}</div><div className="min-w-0 text-sm"><div className="font-medium truncate">{user?.user_metadata?.display_name||user?.email?.split('@')[0]||'Folion user'}</div><div className="text-black/45 truncate">{user?.email}</div></div><button className="ml-auto text-black/35 hover:text-ink" onClick={()=>void signOut()} aria-label="Sign out"><LogOut size={16}/></button></div>
      </div>
    </aside>
  </>
}

export function TopBar({onMenu,onSearch}:{onMenu:()=>void;onSearch:()=>void}){
  const {pathname}=useLocation()
  const meta=routeTitles[pathname]||(pathname.startsWith('/projects/')?{eyebrow:'Project memory',title:'Project detail'}:pathname.startsWith('/collections/')?{eyebrow:'Curated portfolio',title:'Collection'}:{eyebrow:'Practice memory',title:'Folion'})
  useEffect(()=>{const onKey=(event:KeyboardEvent)=>{if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){event.preventDefault();onSearch()}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey)},[onSearch])
  return <header className="topbar">
    <button onClick={onMenu} className="icon-btn !grid lg:!hidden" aria-label="Open navigation"><Menu size={19}/></button>
    <div className="min-w-0"><div className="topbar-eyebrow">{meta.eyebrow}</div><div className="font-medium truncate">{meta.title}</div></div>
    <div className="ml-auto flex items-center gap-2">
      <button onClick={onSearch} className="global-search" aria-label="Search and navigate"><Search size={17}/><span className="hidden md:inline">Search memory</span><kbd className="hidden xl:inline">⌘ K</kbd></button>
      <NavLink to="/new-project"><Button className="!px-4"><Plus size={17}/><span className="hidden sm:inline">New project</span></Button></NavLink>
    </div>
  </header>
}

export function AppShell(){
  const [open,setOpen]=useState(false)
  const [searchOpen,setSearchOpen]=useState(false)
  const {error,workspace}=useStore()
  const {pathname}=useLocation()
  useEffect(()=>setOpen(false),[pathname])
  return <div className="min-h-screen bg-paper text-ink" style={{'--brand-primary':workspace?.brandKit.primaryColour||'#18201D','--brand-accent':workspace?.brandKit.accentColour||'#D6FF5C','--brand-text':workspace?.brandKit.textColour||'#18201D','--brand-background':workspace?.brandKit.backgroundColour||'#F4F3ED'} as CSSProperties}><Sidebar open={open} onClose={()=>setOpen(false)}/><div className="lg:pl-[248px]"><TopBar onMenu={()=>setOpen(true)} onSearch={()=>setSearchOpen(true)}/>{error&&<div className="data-error" role="alert">{error}</div>}<main className="page"><Outlet/></main></div><CommandPalette open={searchOpen} onClose={()=>setSearchOpen(false)}/></div>
}
