import {ArrowUpRight,Check,Lock} from 'lucide-react'
import {useNavigate} from 'react-router-dom'
import {Project} from '../types'
import {useStore} from '../store'
import {Badge,Button} from './ui'

export default function ProjectCard({project,selectable=true}:{project:Project;selectable?:boolean}){
  const navigate=useNavigate()
  const {selected,toggleSelected}=useStore()
  const isSelected=selected.includes(project.id)
  const openProject=()=>navigate(`/projects/${project.id}`)
  return <article className={`project-card ${isSelected?'selected':''}`}>
    <button className="image-wrap" onClick={()=>selectable?toggleSelected(project.id):openProject()} aria-label={selectable?`Select ${project.projectName}`:`Open ${project.projectName}`} aria-pressed={selectable?isSelected:undefined}><img src={project.coverImage} alt={`${project.projectName}, ${project.location}`}/><span className="image-overlay"/>{project.visibility==='private'&&<span className="absolute top-4 left-4"><Badge tone="dark"><Lock size={11}/> Private</Badge></span>}{selectable&&<span className={`select-dot ${isSelected?'on':''}`}>{isSelected&&<Check size={16}/>}</span>}<span className="absolute bottom-4 left-4 text-white text-xs tracking-wide">{project.location}</span></button>
    <div className="p-5"><div className="flex justify-between gap-4"><button onClick={openProject} className="text-left"><h3 className="text-xl font-semibold leading-tight hover:underline">{project.projectName}</h3><p className="mt-1 text-sm text-black/50">{project.sector} · {project.year}</p></button><Button variant="ghost" onClick={openProject} className="!p-2 self-start" aria-label={`Open ${project.projectName}`}><ArrowUpRight size={18}/></Button></div><div className="mt-4 flex flex-wrap gap-1.5">{project.tags.slice(0,3).map(tag=><Badge key={tag}>{tag}</Badge>)}</div></div>
  </article>
}
