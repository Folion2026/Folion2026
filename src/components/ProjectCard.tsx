import {ArrowUpRight,Check,ImageOff,Lock} from 'lucide-react'
import {useNavigate} from 'react-router-dom'
import {Project} from '../types'
import {useStore} from '../store'
import {FALLBACK_PROJECT_IMAGE,normalizeProject} from '../lib/project'
import {Badge,Button} from './ui'

export default function ProjectCard({project,selectable=true}:{project?:Project|null;selectable?:boolean}){
  const navigate=useNavigate();const {selected,toggleSelected}=useStore();const safeProject=normalizeProject(project)
  if(!safeProject)return <article className="project-card project-card-missing"><div className="image-wrap grid place-items-center bg-black/5 text-black/25"><ImageOff size={32}/></div><div className="p-5"><h3 className="text-xl font-semibold">Project unavailable</h3><p className="mt-2 text-sm text-black/45">This project record could not be loaded.</p></div></article>
  const isSelected=(selected||[]).includes(safeProject.id);const openProject=()=>navigate(`/projects/${safeProject.id}`);const tags=safeProject.tags||[]
  return <article className={`project-card ${isSelected?'selected':''}`}><button className="image-wrap" onClick={()=>selectable?toggleSelected(safeProject.id):openProject()} aria-label={selectable?`Select ${safeProject.projectName}`:`Open ${safeProject.projectName}`} aria-pressed={selectable?isSelected:undefined}><img src={safeProject.coverImage||FALLBACK_PROJECT_IMAGE} onError={event=>{event.currentTarget.src=FALLBACK_PROJECT_IMAGE}} alt={`${safeProject.projectName}, ${safeProject.location}`}/><span className="image-overlay"/>{safeProject.visibility==='private'&&<span className="absolute top-4 left-4"><Badge tone="dark"><Lock size={11}/> Private</Badge></span>}{selectable&&<span className={`select-dot ${isSelected?'on':''}`}>{isSelected&&<Check size={16}/>}</span>}<span className="absolute bottom-4 left-4 text-white text-xs tracking-wide">{safeProject.location}</span></button><div className="p-5"><div className="flex justify-between gap-4"><button onClick={openProject} className="text-left"><h3 className="text-xl font-semibold leading-tight hover:underline">{safeProject.projectName}</h3><p className="mt-1 text-sm text-black/50">{safeProject.sector} · {safeProject.year}</p></button><Button variant="ghost" onClick={openProject} className="!p-2 self-start" aria-label={`Open ${safeProject.projectName}`}><ArrowUpRight size={18}/></Button></div><div className="mt-4 flex flex-wrap gap-1.5">{tags.slice(0,3).map(tag=><Badge key={tag}>{tag}</Badge>)}</div></div></article>
}
