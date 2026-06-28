import {ArrowLeft,Check,Globe2,Pencil,Users,X} from 'lucide-react'
import {useEffect,useState} from 'react'
import {useNavigate,useParams} from 'react-router-dom'
import {useStore} from '../store'
import {Badge,Button,EmptyState} from '../components/ui'
import {Project,Story} from '../types'
import {ProjectFacts,ProjectHero,StorySection} from '../components/ProjectDetailSections'
import ProjectGallery from '../components/ProjectGallery'

export default function ProjectDetail(){
  const {id}=useParams()
  const navigate=useNavigate()
  const {projects,updateProject}=useStore()
  const project=projects.find(item=>item.id===id)
  const [editing,setEditing]=useState(false)
  const [draft,setDraft]=useState<Project|undefined>(project)
  useEffect(()=>setDraft(project),[project])
  if(!project||!draft)return <EmptyState title="Project not found" body="This project may have moved or been archived."/>
  const change=(key:keyof Project,value:unknown)=>setDraft(current=>current?{...current,[key]:value}:current)
  const save=()=>{updateProject(draft);setEditing(false)}
  const cancel=()=>{setDraft(project);setEditing(false)}
  return <div>
    <div className="detail-toolbar"><button onClick={()=>navigate(-1)} className="detail-back"><ArrowLeft size={16}/> Back to projects</button><div className="flex gap-2">{editing?<><Button variant="ghost" onClick={cancel}><X size={16}/> Cancel</Button><Button onClick={save}><Check size={16}/> Save changes</Button></>:<Button variant="light" onClick={()=>setEditing(true)}><Pencil size={16}/> Edit project</Button>}</div></div>
    {editing&&<div className="edit-notice"><Pencil size={15}/><span>You’re editing the practice record. Changes stay in local state for this prototype.</span></div>}
    <ProjectHero project={draft} editing={editing} onNameChange={value=>change('projectName',value)}/>
    <ProjectGallery project={draft}/>
    <div className="project-detail-layout"><div><StorySection story={draft.story} editing={editing} onChange={(key: keyof Story,value)=>change('story',{...draft.story,[key]:value})}/><section className="project-team"><p className="eyebrow flex gap-2 items-center"><Users size={14}/> Project team</p><div className="team-grid">{draft.team.map(member=><article key={member.personId}><div className="team-avatar">{member.name.split(' ').map(part=>part[0]).join('')}</div><div><strong>{member.name}</strong><span>{member.projectRole}</span></div></article>)}</div></section></div><div><ProjectFacts project={draft} editing={editing} onChange={(key,value)=>change(key,value)}/>{editing&&<div className="visibility-editor"><div className="flex gap-2 items-center text-sm font-medium"><Globe2 size={16}/> Visibility</div><p>Choose whether this work appears publicly in Magazine and the practice profile.</p><div className="grid grid-cols-2 gap-2 mt-4"><button onClick={()=>change('visibility','public')} className={`chip ${draft.visibility==='public'?'active':''}`}>Public</button><button onClick={()=>change('visibility','private')} className={`chip ${draft.visibility==='private'?'active':''}`}>Private</button></div></div>}<div className="mt-7"><p className="eyebrow">Services</p><div className="flex flex-wrap gap-2 mt-3">{draft.services.map(service=><Badge key={service}>{service}</Badge>)}</div></div><div className="mt-7"><p className="eyebrow">Tags</p><div className="flex flex-wrap gap-2 mt-3">{draft.tags.map(tag=><Badge key={tag}>{tag}</Badge>)}</div></div></div></div>
  </div>
}
