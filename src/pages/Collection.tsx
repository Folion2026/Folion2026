import {ArrowLeft,Edit3,Trash2} from 'lucide-react'
import {useState} from 'react'
import {useNavigate,useParams} from 'react-router-dom'
import ProjectCard from '../components/ProjectCard'
import CollectionForm,{CollectionDraft} from '../components/CollectionForm'
import {Button,EmptyState,Modal} from '../components/ui'
import {normalizeProjects} from '../lib/project'
import {useStore} from '../store'

export default function CollectionPage(){
 const {id}=useParams(),navigate=useNavigate(),{collections,projects,workspaceRole,updateCollection,deleteCollection}=useStore(),[editing,setEditing]=useState(false),[deleting,setDeleting]=useState(false),[deleteError,setDeleteError]=useState(''),collection=collections.find(item=>item.id===id),safeProjects=normalizeProjects(projects)
 if(!collection)return <EmptyState title="Collection not found" body="This collection may no longer exist."/>
 const items=safeProjects.filter(project=>collection.projectIds.includes(project.id)),save=async(value:CollectionDraft)=>{await updateCollection({...value,id:collection.id})}
 const remove=async()=>{if(!window.confirm('Delete this collection? Projects will not be deleted.'))return;setDeleting(true);setDeleteError('');try{await deleteCollection(collection.id);navigate('/projects',{replace:true,state:{notice:'Collection deleted. Projects were preserved.'}})}catch(reason){setDeleteError(reason instanceof Error?reason.message:'Unable to delete this collection');setDeleting(false)}}
 return <div>
  <button onClick={()=>navigate('/projects')} className="detail-back mb-8"><ArrowLeft size={16}/> Back to projects</button>
  <header className="collection-header"><div><p className="eyebrow">Curated portfolio</p><h1>{collection.name}</h1><p>{collection.brief}</p></div><div className="flex flex-wrap gap-2"><Button onClick={()=>setEditing(true)} disabled={deleting}><Edit3 size={16}/> Edit Collection</Button>{workspaceRole!=='viewer'&&<Button variant="ghost" onClick={()=>void remove()} disabled={deleting}><Trash2 size={16}/> {deleting?'Deleting…':'Delete Collection'}</Button>}</div></header>
  {deleteError&&<div className="auth-message error" role="alert">{deleteError}</div>}
  <section className="collection-narrative"><p className="eyebrow">Approved Collection Narrative</p>{collection.approvedNarrative?<p>{collection.approvedNarrative}</p>:<p className="text-black/45">No approved narrative yet.</p>}</section>
  <div className="collection-meta"><span><strong>{items.length}</strong> {items.length===1?'project':'projects'}</span><span><strong>{items.filter(project=>project.visibility==='public').length}</strong> public</span><span><strong>{new Set(items.map(project=>project.sector)).size}</strong> sectors</span></div>
  <section className="mt-10">{items.length?<div className="projects-grid">{items.map(project=><ProjectCard key={project.id} project={project} selectable={false}/>)}</div>:<EmptyState title="Start curating" body="Edit this Collection to select projects and generate its narrative." action={<Button onClick={()=>setEditing(true)}>Edit Collection</Button>}/>}</section>
  <Modal open={editing} onClose={()=>setEditing(false)} title="Edit Collection"><CollectionForm initial={{name:collection.name,description:collection.description,brief:collection.brief,keywords:collection.keywords,approvedNarrative:collection.approvedNarrative,projectIds:collection.projectIds}} projects={projects} onSave={save} onCancel={()=>setEditing(false)}/></Modal>
 </div>
}
