import {useEffect,useMemo,useRef,useState} from 'react'
import {BookOpen,FolderKanban,Home,IdCard,Search,Sparkles,X} from 'lucide-react'
import {useNavigate} from 'react-router-dom'
import {useStore} from '../store'

const destinations=[
  {label:'Home',hint:'Project Gallery',to:'/home',icon:Home},
  {label:'Projects',hint:'Search practice memory',to:'/projects',icon:FolderKanban},
  {label:'Studio',hint:'Create a new output',to:'/studio-v2',icon:Sparkles},
  {label:'Folion ID',hint:'Practice and people',to:'/folion-id',icon:IdCard},
  {label:'Magazine',hint:'Browse public work',to:'/magazine',icon:BookOpen},
]

export default function CommandPalette({open,onClose}:{open:boolean;onClose:()=>void}){
  const [query,setQuery]=useState('')
  const inputRef=useRef<HTMLInputElement>(null)
  const navigate=useNavigate()
  const {projects,collections}=useStore()
  useEffect(()=>{if(open){setQuery('');requestAnimationFrame(()=>inputRef.current?.focus())}},[open])
  useEffect(()=>{const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')onClose()};window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape)},[onClose])
  const items=useMemo(()=>{
    const q=query.toLowerCase().trim()
    const pages=destinations.filter(item=>`${item.label} ${item.hint}`.toLowerCase().includes(q)).map(item=>({...item,type:'Page'}))
    const projectItems=projects.filter(project=>`${project.projectName} ${project.location} ${project.sector}`.toLowerCase().includes(q)).slice(0,5).map(project=>({label:project.projectName,hint:`${project.sector} · ${project.location}`,to:`/projects/${project.id}`,icon:FolderKanban,type:'Project'}))
    const collectionItems=collections.filter(collection=>collection.name.toLowerCase().includes(q)).map(collection=>({label:collection.name,hint:`${collection.projectIds.length} projects`,to:`/collections/${collection.id}`,icon:BookOpen,type:'Collection'}))
    return q?[...projectItems,...collectionItems,...pages].slice(0,8):pages
  },[query,projects,collections])
  if(!open)return null
  const go=(to:string)=>{navigate(to);onClose()}
  return <div className="command-backdrop" onMouseDown={onClose} role="presentation">
    <section className="command-palette" onMouseDown={event=>event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Navigate Folion">
      <div className="command-input"><Search size={20}/><input ref={inputRef} value={query} onChange={event=>setQuery(event.target.value)} placeholder="Go to a page, project or collection…"/><button onClick={onClose} aria-label="Close"><X size={18}/></button></div>
      <div className="p-2 max-h-[440px] overflow-auto">
        {items.length?items.map(item=><button key={`${item.type}-${item.to}`} onClick={()=>go(item.to)} className="command-result"><span className="command-icon"><item.icon size={17}/></span><span className="min-w-0 text-left"><strong>{item.label}</strong><small>{item.hint}</small></span><span className="ml-auto text-[10px] uppercase tracking-wider text-black/30">{item.type}</span></button>):<div className="p-10 text-center text-sm text-black/40">No matching memory found.</div>}
      </div>
      <footer className="command-footer"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>esc</kbd> close</span><span className="ml-auto">Searches pages and project memory</span></footer>
    </section>
  </div>
}
