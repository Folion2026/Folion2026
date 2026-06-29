import {AlertCircle,Check,FileSearch,Pencil,ShieldCheck,Trash2} from 'lucide-react'
import {useState} from 'react'
import {normalizeProject,projectKnowledgeStatus} from '../lib/project'
import {FolionDraftSection,KnowledgeFact,KnowledgeFactKey,Project,ProjectKnowledge,TeamInput} from '../types'
import {Button} from './ui'

const statusLabels={reviewed:'Reviewed','review-needed':'Review needed','no-evidence':'No evidence','approval-pending':'Approval pending',rejected:'Rejected'} as const
const sourceLabels={'uploaded-asset':'Uploaded asset','team-input':'Team input'} as const
const teamFields:{key:keyof TeamInput;label:string;prompt:string}[]=[
 {key:'challengeOpportunity',label:'Challenge or opportunity',prompt:'What was the real challenge or opportunity in this project?'},
 {key:'teamResponse',label:'Team response',prompt:'What did the team do in response?'},
 {key:'futureRelevance',label:'Future relevance',prompt:'Why is this project relevant to future work?'},
]
const basisLabels={facts:'Based on reviewed project facts',team:'Informed by team input',both:'Based on both'} as const

export default function ProjectKnowledgeRecord({project,onUpdate}:{project:Project;onUpdate:(project:Project)=>void}){
 const safe=normalizeProject(project);const [editingKey,setEditingKey]=useState<KnowledgeFactKey|null>(null);const [editValue,setEditValue]=useState('')
 if(!safe?.knowledge)return null
 const knowledge=safe.knowledge;const status=projectKnowledgeStatus(safe)
 const saveKnowledge=(next:ProjectKnowledge)=>onUpdate({...safe,knowledge:next})
 const updateFact=(key:KnowledgeFactKey,patch:Partial<KnowledgeFact>)=>{
  const facts=knowledge.facts.map(fact=>fact.key===key?{...fact,...patch}:fact);const changed=facts.find(fact=>fact.key===key)!;let next:Project={...safe,knowledge:{...knowledge,facts}}
  if('value'in patch){const value=changed.value;if(key==='services')next={...next,services:value.split(',').map(item=>item.trim()).filter(Boolean)};else if(key==='practice')next={...next,company:value};else if(['projectType','precincts','siteContext','placeStrategy'].includes(key))next={...next,[key]:value.split(';').map(item=>item.trim()).filter(Boolean)};else if(key==='dwellings')next={...next,metrics:{...next.metrics!,dwellings:value}};else{next={...next,[key]:value};if(['siteArea','gfa','height'].includes(key))next={...next,metrics:{...next.metrics!,[key]:value}}}}
  onUpdate(next)
 }
 const beginEdit=(fact:KnowledgeFact)=>{setEditingKey(fact.key);setEditValue(fact.value)}
 const editAndAccept=(fact:KnowledgeFact)=>{updateFact(fact.key,{value:editValue.trim(),status:editValue.trim()?'reviewed':'no-evidence',sourceType:editValue.trim()?'team-input':null,assetId:undefined,assetName:undefined});setEditingKey(null)}
 const updateTeamInput=(key:keyof TeamInput,value:string)=>saveKnowledge({...knowledge,teamInput:{...knowledge.teamInput,[key]:value}})
 const updateDraft=(key:FolionDraftSection['key'],patch:Partial<FolionDraftSection>)=>saveKnowledge({...knowledge,draft:knowledge.draft.map(section=>section.key===key?{...section,...patch}:section)})
 return <div className="knowledge-record">
  <header className="knowledge-record-header"><div><p className="eyebrow">Project Knowledge Record</p><h2>Review what Folion can safely reuse.</h2><p>Facts, Team input and Folion’s proposed articulation stay visibly separate until you approve them.</p></div><span className={`knowledge-readiness ${status==='Ready for Studio'?'ready':''}`}>{status==='Ready for Studio'?<ShieldCheck/>:<AlertCircle/>}{status}</span></header>

  <section className="knowledge-review-section"><div className="knowledge-review-heading"><div><p className="eyebrow">Project Facts</p><h3>Source-supported facts</h3></div><p>Blank values remain blank. Only reviewed values can be reused in Studio.</p></div><div className="knowledge-facts-head"><span>Project fact</span><span>Source Evidence</span><span>Review</span></div><div className="knowledge-fact-list">{knowledge.facts.map(fact=><article key={fact.key} className={fact.status==='rejected'?'rejected':''}><div><strong>{fact.label}</strong>{editingKey===fact.key?<div className="fact-edit"><input autoFocus value={editValue} onChange={event=>setEditValue(event.target.value)} aria-label={`Edit ${fact.label}`}/><Button onClick={()=>editAndAccept(fact)}><Check size={14}/> Save & accept</Button><button onClick={()=>setEditingKey(null)}>Cancel</button></div>:<p>{fact.value||'—'}</p>}</div><div className="fact-source"><span>{fact.sourceType?sourceLabels[fact.sourceType]:'No source'}</span>{fact.assetName&&<p><FileSearch/>{fact.assetName}</p>}</div><div className="fact-review"><span className={`fact-status status-${fact.status}`}>{statusLabels[fact.status]}</span>{editingKey!==fact.key&&<div className="fact-actions">{fact.value&&fact.status!=='reviewed'&&<button onClick={()=>updateFact(fact.key,{status:'reviewed'})}><Check/> Accept</button>}<button onClick={()=>beginEdit(fact)}><Pencil/> Edit & accept</button>{fact.value&&fact.status!=='review-needed'&&<button onClick={()=>updateFact(fact.key,{status:'review-needed'})}><AlertCircle/> Needs review</button>}{fact.key!=='projectName'&&fact.status!=='rejected'&&<button onClick={()=>updateFact(fact.key,{value:'',status:'rejected'})}><Trash2/> Reject</button>}</div>}</div></article>)}</div></section>

  <section className="knowledge-review-section"><div className="knowledge-review-heading"><div><p className="eyebrow">Team Input</p><h3>What the files cannot tell us</h3></div><p>Optional editorial context from the team. It is never presented as uploaded-source evidence.</p></div><div className="team-input-editor">{teamFields.map(field=><label key={field.key}><span>{field.label}</span><strong>{field.prompt}</strong><textarea value={knowledge.teamInput[field.key]} onChange={event=>updateTeamInput(field.key,event.target.value)} placeholder="Write only what the team knows. Leave blank if it is not useful here."/><small>Autosaved locally · Team input</small></label>)}</div></section>

  <section className="knowledge-review-section"><div className="knowledge-review-heading"><div><p className="eyebrow">Folion Draft</p><h3>Proposed articulation</h3></div><p>Editable narrative for reuse. A draft remains outside Studio until it is approved.</p></div><div className="folion-draft-list">{knowledge.draft.map(section=><article key={section.key}><div><strong>{section.label}</strong><span>{basisLabels[section.basis]}</span></div><textarea value={section.value} onChange={event=>updateDraft(section.key,{value:event.target.value,approved:false})} placeholder="Omitted until a source-supported or team-provided articulation is available."/><button className={section.approved?'approved':''} disabled={!section.value.trim()} onClick={()=>updateDraft(section.key,{approved:!section.approved})}>{section.approved?<><ShieldCheck/> Approved for Studio</>:<><Check/> Approve draft</>}</button></article>)}</div></section>
 </div>
}
