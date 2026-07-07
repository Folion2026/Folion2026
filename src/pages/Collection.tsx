import {ArrowLeft,Check,Edit3,Plus,Trash2,X} from 'lucide-react'
import {useState} from 'react'
import {useNavigate,useParams} from 'react-router-dom'
import ProjectCard from '../components/ProjectCard'
import {Button,EmptyState,Modal} from '../components/ui'
import {FALLBACK_PROJECT_IMAGE,normalizeProjects} from '../lib/project'
import {useStore} from '../store'

export default function CollectionPage(){
 const {id}=useParams()
 const navigate=useNavigate()
 const {collections,projects,updateCollection,toggleProjectInCollection}=useStore()
 const safeProjects=normalizeProjects(projects)
 const collection=(collections||[]).find(item=>item?.id===id)
 const [renaming,setRenaming]=useState(false)
 const [name,setName]=useState(collection?.name||'')
 const [brief,setBrief]=useState(collection?.brief||collection?.description||'')
 const [pickerOpen,setPickerOpen]=useState(false)

 if(!collection)return <EmptyState title="Collection not found" body="This collection may no longer exist."/>

 const projectIds=collection.projectIds||[]
 const items=safeProjects.filter(project=>projectIds.includes(project.id))
 const saveName=async()=>{if(name.trim())await updateCollection({...collection,name:name.trim(),brief:brief.trim(),description:brief.trim()});setRenaming(false)}

 return <div>
  <button onClick={()=>navigate('/projects')} className="detail-back mb-8"><ArrowLeft size={16}/> Back to projects</button>
  <header className="collection-header">
   <div><p className="eyebrow">Curated portfolio</p>{renaming?<div><div className="collection-title-edit"><input autoFocus value={name} onChange={event=>setName(event.target.value)}/><button onClick={()=>void saveName()}><Check size={18}/></button><button onClick={()=>{setName(collection.name||'');setBrief(collection.brief||'');setRenaming(false)}}><X size={18}/></button></div><label className="label mt-4">Collection Brief<textarea value={brief} onChange={event=>setBrief(event.target.value)} placeholder="Purpose, thematic focus, client context or opportunity"/></label></div>:<h1>{collection.name||'Untitled collection'}</h1>}<p>{collection.brief||'Add a Collection Brief to guide Studio output.'}</p></div>
   <div className="flex gap-2"><Button variant="ghost" onClick={()=>setRenaming(true)}><Edit3 size={16}/> Rename</Button><Button onClick={()=>setPickerOpen(true)}><Plus size={16}/> Add projects</Button></div>
  </header>
  <div className="collection-meta"><span><strong>{items.length}</strong> {items.length===1?'project':'projects'}</span><span><strong>{items.filter(project=>project.visibility==='public').length}</strong> public</span><span><strong>{new Set(items.map(project=>project.sector)).size}</strong> sectors</span></div>
  <section className="mt-10">{items.length?<div className="projects-grid">{items.map(project=><div key={project.id} className="collection-project"><ProjectCard project={project} selectable={false}/><button onClick={()=>toggleProjectInCollection(collection.id,project.id)} className="remove-project" aria-label={`Remove ${project.projectName} from collection`}><Trash2 size={15}/></button></div>)}</div>:<EmptyState title="Start curating" body="Add projects to build a focused story for your next opportunity." action={<Button onClick={()=>setPickerOpen(true)}>Add projects</Button>}/>}</section>
  <Modal open={pickerOpen} onClose={()=>setPickerOpen(false)} title="Choose projects"><p className="text-sm text-black/45 -mt-2 mb-5">Add or remove projects. Changes apply immediately in this prototype.</p><div className="project-picker">{safeProjects.filter(project=>project.status!=='Archived').map(project=>{const selected=projectIds.includes(project.id);return <button key={project.id} onClick={()=>toggleProjectInCollection(collection.id,project.id)} className={selected?'selected':''}><img src={project?.coverImage||FALLBACK_PROJECT_IMAGE} onError={event=>{event.currentTarget.src=FALLBACK_PROJECT_IMAGE}} alt=""/><div><strong>{project.projectName||'Untitled project'}</strong><span>{project.sector||'Uncategorised'} · {project.year||'Year not recorded'}</span></div><span className="picker-check">{selected&&<Check size={15}/>}</span></button>})}</div><Button className="w-full mt-5 justify-center" onClick={()=>setPickerOpen(false)}>Done</Button></Modal>
 </div>
}
