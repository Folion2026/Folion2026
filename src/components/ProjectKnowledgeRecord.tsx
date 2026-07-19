import {AlertCircle,ArrowRight,Check,CheckCircle2,FileSearch,Pencil,ShieldCheck,Trash2,Undo2} from 'lucide-react'
import {useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {isKnowledgeReviewResolved,normalizeProject,projectKnowledgeStatus} from '../lib/project'
import {useStore} from '../store'
import {KnowledgeFact,KnowledgeFactKey,Project,ProjectKnowledge,TeamInput} from '../types'
import {Button,Modal} from './ui'
import ConfidentialityControl from './ConfidentialityControl'
import ProjectGallery from './ProjectGallery'
import ProjectAssetUploader from './ProjectAssetUploader'
import ProjectTeamEditor from './ProjectTeamEditor'
import EvidenceIngestionPanel from './EvidenceIngestionPanel'

const statusLabels={reviewed:'Reviewed','review-needed':'Review needed','no-evidence':'No evidence','approval-pending':'Approval pending',rejected:'Rejected'} as const
const sourceLabels={'uploaded-asset':'Uploaded asset','team-input':'Team input'} as const
const teamFields:{key:keyof TeamInput;label:string;prompt:string}[]=[
 {key:'challengeOpportunity',label:'Challenge or opportunity',prompt:'What was the real challenge or opportunity in this project?'},
 {key:'teamResponse',label:'Team response',prompt:'What did the team do in response?'},
 {key:'futureRelevance',label:'Future relevance',prompt:'Why is this project relevant to future work?'},
]

export default function ProjectKnowledgeRecord({project,onUpdate}:{project:Project;onUpdate:(project:Project)=>void}){
 const navigate=useNavigate();const {workspaceRole,deleteProject}=useStore();const safe=normalizeProject(project);const [editingKey,setEditingKey]=useState<KnowledgeFactKey|null>(null);const [editValue,setEditValue]=useState('');const [deleteOpen,setDeleteOpen]=useState(false);const [deleteConfirmation,setDeleteConfirmation]=useState('');const [deleteError,setDeleteError]=useState('');const [deleting,setDeleting]=useState(false)
 if(!safe?.knowledge)return null
 const knowledge=safe.knowledge;const status=projectKnowledgeStatus(safe);const reviewResolved=isKnowledgeReviewResolved(safe)
 const saveKnowledge=(next:ProjectKnowledge)=>onUpdate({...safe,knowledgeStatus:'Review needed',knowledge:next})
 const updateFact=(key:KnowledgeFactKey,patch:Partial<KnowledgeFact>)=>{
  const facts=knowledge.facts.map(fact=>fact.key===key?{...fact,...patch}:fact);const changed=facts.find(fact=>fact.key===key)!;let next:Project={...safe,knowledge:{...knowledge,facts}}
  if('value'in patch){const value=changed.value;if(key==='services')next={...next,services:value.split(',').map(item=>item.trim()).filter(Boolean)};else if(key==='practice')next={...next,company:value};else if(key==='address')next={...next,address:value.split(';').map(item=>item.trim()).filter(Boolean)};else if(['projectType','precincts','siteContext','placeStrategy'].includes(key))next={...next,[key]:value.split(';').map(item=>item.trim()).filter(Boolean)};else if(key==='dwellings'||key==='fsr')next={...next,metrics:{...next.metrics!,[key]:value}};else{next={...next,[key]:value};if(['siteArea','gfa','height'].includes(key))next={...next,metrics:{...next.metrics!,[key]:value}}}}
  onUpdate({...next,knowledgeStatus:'Review needed'})
 }
 const beginEdit=(fact:KnowledgeFact)=>{setEditingKey(fact.key);setEditValue(fact.value)}
 const editAndAccept=(fact:KnowledgeFact)=>{updateFact(fact.key,{value:editValue.trim(),status:editValue.trim()?'reviewed':'no-evidence',sourceType:editValue.trim()?'team-input':null,assetId:undefined,assetName:undefined});setEditingKey(null)}
 const updateTeamInput=(key:keyof TeamInput,value:string)=>saveKnowledge({...knowledge,teamInput:{...knowledge.teamInput,[key]:value}})
 const markReady=()=>onUpdate({...safe,knowledgeStatus:'Ready for Studio'})
 const reopenReview=()=>onUpdate({...safe,knowledgeStatus:'Review needed'})
 const keepReviewing=()=>document.querySelector<HTMLElement>('.knowledge-review-section')?.scrollIntoView({behavior:'smooth',block:'start'})
 const confirmDelete=async()=>{setDeleting(true);setDeleteError('');try{await deleteProject(safe.id);navigate('/home',{replace:true,state:{notice:`${safe.projectName} was deleted.`}})}catch(reason){setDeleteError(reason instanceof Error?reason.message:'Unable to delete the project');setDeleting(false)}}
 return <div className="knowledge-record">
  <header className="knowledge-record-header"><div><p className="eyebrow">Sources</p><h2>Evidence and editing workbench.</h2><p>Uploaded material, factual review, Team input and Folion's draft stay visibly separate until you approve them.</p></div><span className={`knowledge-readiness ${status==='Ready for Studio'?'ready':''}`}>{status==='Ready for Studio'?<ShieldCheck/>:<AlertCircle/>}{status}</span></header>

  {status==='Ready for Studio'&&<div className="knowledge-reopen"><button onClick={reopenReview}><Undo2/> Reopen review</button></div>}
  <div className="sources-section-heading"><p className="eyebrow">Project material</p><h3>Uploaded assets and documents</h3><p>Add, inspect and analyse the source material attached to this project.</p></div>
  <ProjectAssetUploader project={safe}/>
  <ProjectGallery project={safe} mode="sources"/>
  <EvidenceIngestionPanel project={safe}/>

  <section className="knowledge-review-section"><div className="knowledge-review-heading"><div><p className="eyebrow">Project Facts</p><h3>Source-supported facts</h3></div><p>Blank values remain blank. Only reviewed values can be reused in Studio.</p></div><div className="knowledge-facts-head"><span>Project fact</span><span>Source Evidence</span><span>Review</span></div><div className="knowledge-fact-list">{knowledge.facts.map(fact=><article key={fact.key} className={fact.status==='rejected'?'rejected':''}><div><strong>{fact.label}</strong>{editingKey===fact.key?<div className="fact-edit"><input autoFocus value={editValue} onChange={event=>setEditValue(event.target.value)} aria-label={`Edit ${fact.label}`}/><Button onClick={()=>editAndAccept(fact)}><Check size={14}/> Save & accept</Button><button onClick={()=>setEditingKey(null)}>Cancel</button></div>:<p>{fact.value||'—'}</p>}</div><div className="fact-source"><span>{fact.sourceType?sourceLabels[fact.sourceType]:'No source'}</span>{fact.assetName&&<p><FileSearch/>{fact.assetName}</p>}</div><div className="fact-review"><span className={`fact-status status-${fact.status}`}>{statusLabels[fact.status]}</span>{editingKey!==fact.key&&<div className="fact-actions">{fact.value&&fact.status!=='reviewed'&&<button onClick={()=>updateFact(fact.key,{status:'reviewed'})}><Check/> Accept</button>}<button onClick={()=>beginEdit(fact)}><Pencil/> Edit & accept</button>{fact.value&&fact.status!=='review-needed'&&<button onClick={()=>updateFact(fact.key,{status:'review-needed'})}><AlertCircle/> Needs review</button>}{fact.key!=='projectName'&&fact.status!=='rejected'&&<button onClick={()=>updateFact(fact.key,{value:'',status:'rejected'})}><Trash2/> Reject</button>}</div>}</div></article>)}</div></section>

  <section className="knowledge-review-section"><div className="knowledge-review-heading"><div><p className="eyebrow">Team Input</p><h3>What the files cannot tell us</h3></div><p>Optional editorial context from the team. It is never presented as uploaded-source evidence.</p></div><div className="team-input-editor">{teamFields.map(field=><label key={field.key}><span>{field.label}</span><strong>{field.prompt}</strong><textarea value={knowledge.teamInput[field.key]} onChange={event=>updateTeamInput(field.key,event.target.value)} placeholder="Write only what the team knows. Leave blank if it is not useful here."/><small>Autosaved locally · Team input</small></label>)}</div></section>

  <ProjectTeamEditor team={safe.team} onChange={team=>onUpdate({...safe,team,knowledgeStatus:'Review needed'})}/>
  <section className="project-settings"><div><p className="eyebrow">Project settings and readiness</p><h3>Confidentiality and permitted use</h3></div><ConfidentialityControl value={safe.confidentiality} onChange={confidentiality=>onUpdate({...safe,confidentiality,visibility:confidentiality==='publicly-publishable'?safe.visibility:'private'})} compact/>{workspaceRole==='owner'&&<button className="mt-6 flex items-center gap-2 text-xs text-red-800/70 hover:text-red-800" onClick={()=>{setDeleteConfirmation('');setDeleteError('');setDeleteOpen(true)}}><Trash2 size={14}/> Delete project</button>}</section>
  {reviewResolved&&<aside className={`knowledge-release-panel ${status==='Ready for Studio'?'released':''}`} aria-live="polite">{status==='Ready for Studio'?<><CheckCircle2/><div><p className="eyebrow">Editorial release</p><h3>Project ready for Studio</h3><p>Approved knowledge can now be used in Project Sheet, Tender Response, Pitch Deck and CV Package.</p></div><div className="knowledge-release-actions"><Button onClick={()=>navigate('/studio')}>Open Studio <ArrowRight/></Button><button onClick={()=>navigate(`/projects/${safe.id}`)}>Return to project</button></div></>:<><ShieldCheck/><div><p className="eyebrow">Review sign-off</p><h3>All selected knowledge has been reviewed.</h3><p>Release the approved facts and narrative for deliberate reuse in Studio.</p></div><div className="knowledge-release-actions"><Button onClick={markReady}>Mark ready for Studio <ArrowRight/></Button><button onClick={keepReviewing}>Keep reviewing</button></div></>}</aside>}
  <Modal open={deleteOpen} onClose={()=>!deleting&&setDeleteOpen(false)} title={`Delete ${safe.projectName}?`}><p className="text-sm leading-relaxed text-black/55">This will permanently remove the project, its team assignments, knowledge and uploaded assets.</p><label className="label mt-6">Type the project name to confirm<input autoFocus value={deleteConfirmation} onChange={event=>setDeleteConfirmation(event.target.value)} /></label>{deleteError&&<div className="auth-message error mt-4">{deleteError}</div>}<div className="flex justify-end gap-2 mt-6"><Button variant="ghost" disabled={deleting} onClick={()=>setDeleteOpen(false)}>Cancel</Button><Button disabled={deleting||deleteConfirmation!==safe.projectName} className="bg-red-800 text-white" onClick={confirmDelete}>{deleting?'Deleting…':'Delete project'}</Button></div></Modal>
 </div>
}
