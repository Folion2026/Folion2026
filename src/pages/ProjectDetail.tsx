import {ArrowLeft,Check,Globe2,Pencil,Users,X} from 'lucide-react'
import {useEffect,useMemo,useState} from 'react'
import {useNavigate,useParams,useSearchParams} from 'react-router-dom'
import KnowledgeModelSections from '../components/KnowledgeModelSections'
import ProjectKnowledgeRecord from '../components/ProjectKnowledgeRecord'
import {ProjectFacts,ProjectHero,StorySection} from '../components/ProjectDetailSections'
import ProjectGallery from '../components/ProjectGallery'
import {Badge,Button,EmptyState} from '../components/ui'
import {EMPTY_STORY,normalizeProject,projectKnowledgeStatus} from '../lib/project'
import {Project,Story} from '../types'
import {useStore} from '../store'

export default function ProjectDetail(){
 const {id}=useParams();const navigate=useNavigate();const [searchParams,setSearchParams]=useSearchParams();const {projects,updateProject}=useStore()
 const rawProject=(projects||[]).find(item=>item?.id===id);const project=useMemo(()=>normalizeProject(rawProject),[rawProject]);const activeTab=searchParams.get('tab')==='knowledge'?'knowledge':'overview'
 const [editing,setEditing]=useState(false);const [draft,setDraft]=useState<Project|undefined>(project||undefined)
 useEffect(()=>setDraft(project||undefined),[project])
 if(!project||!draft)return <EmptyState title="Project not found" body="This project may have moved or been archived."/>
 const change=(key:keyof Project,value:unknown)=>setDraft(current=>current?{...current,[key]:value}:current)
 const save=()=>{updateProject(draft);setEditing(false)};const cancel=()=>{setDraft(project);setEditing(false)}
 const changeTab=(tab:'overview'|'knowledge')=>{setEditing(false);setSearchParams(tab==='knowledge'?{tab:'knowledge'}:{})}
 return <div>
  <div className="detail-toolbar"><button onClick={()=>navigate(-1)} className="detail-back"><ArrowLeft size={16}/> Back to projects</button>{activeTab==='overview'&&<div className="flex gap-2">{editing?<><Button variant="ghost" onClick={cancel}><X size={16}/> Cancel</Button><Button onClick={save}><Check size={16}/> Save changes</Button></>:<Button variant="light" onClick={()=>setEditing(true)}><Pencil size={16}/> Edit project</Button>}</div>}</div>
  {editing&&<div className="edit-notice"><Pencil size={15}/><span>You’re editing the practice record. Changes stay in local state for this prototype.</span></div>}
  <ProjectHero project={draft} editing={editing} onNameChange={value=>change('projectName',value)}/>
  <nav className="detail-tabs" aria-label="Project detail sections"><button className={activeTab==='overview'?'active':''} onClick={()=>changeTab('overview')}>Overview</button><button className={activeTab==='knowledge'?'active':''} onClick={()=>changeTab('knowledge')}>Knowledge <span>{projectKnowledgeStatus(project)}</span></button></nav>
  {activeTab==='knowledge'?<ProjectKnowledgeRecord project={project} onUpdate={updateProject}/>:<>
   <div className="project-detail-layout"><div>
    {editing?<StorySection story={draft.story||EMPTY_STORY} editing onChange={(key: keyof Story,value)=>change('story',{...(draft.story||EMPTY_STORY),[key]:value})}/>:<KnowledgeModelSections project={draft}/>}
    {Boolean(draft.team?.length)&&<section className="project-team"><p className="eyebrow flex gap-2 items-center"><Users size={14}/> Project team</p><div className="team-grid">{(draft.team||[]).map(member=><article key={member.personId||member.name}><div className="team-avatar">{(member.name||'?').split(' ').map(part=>part[0]).join('')}</div><div><strong>{member.name||'Unknown team member'}</strong><span>{member.projectRole||'Role not recorded'}</span></div></article>)}</div></section>}
   </div><aside className="project-detail-sidebar">
    <ProjectFacts project={draft} editing={editing} onChange={(key,value)=>change(key,value)}/>
    {editing&&<div className="visibility-editor"><div className="flex gap-2 items-center text-sm font-medium"><Globe2 size={16}/> Publication status</div><p>Publishing is separate from confidentiality and only exposes projects permitted for public use.</p><div className="grid grid-cols-2 gap-2 mt-4"><button onClick={()=>change('visibility','public')} disabled={draft.confidentiality!=='publicly-publishable'} className={`chip ${draft.visibility==='public'?'active':''}`}>Published</button><button onClick={()=>change('visibility','private')} className={`chip ${draft.visibility==='private'?'active':''}`}>Not published</button></div></div>}
    <section className="project-sidebar-section"><p className="eyebrow">Services</p><div className="project-sidebar-chips">{(draft.services||[]).map(service=><Badge key={service}>{service}</Badge>)}</div></section><section className="project-sidebar-section"><p className="eyebrow">Tags</p><div className="project-sidebar-chips">{(draft.tags||[]).map(tag=><Badge key={tag}>{tag}</Badge>)}</div></section>
   </aside></div><ProjectGallery project={draft}/>
  </>}
 </div>
}
