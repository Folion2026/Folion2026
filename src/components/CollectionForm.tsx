import {useMemo,useState} from 'react'
import {Check,ChevronDown,ChevronUp} from 'lucide-react'
import {Button} from './ui'
import {approvedDraftSections,FALLBACK_PROJECT_IMAGE,normalizeProjects} from '../lib/project'
import {Collection,Project} from '../types'

export type CollectionDraft=Omit<Collection,'id'>
type SaveState='idle'|'saving'|'saved'|'failed'
const blank:CollectionDraft={name:'',description:'',brief:'',keywords:'',approvedNarrative:'',projectIds:[]}

export default function CollectionForm({initial,projects,onSave,onCancel}:{initial?:CollectionDraft;projects:Project[];onSave:(value:CollectionDraft)=>Promise<void>;onCancel:()=>void}){
 const [value,setValue]=useState<CollectionDraft>({...blank,...initial,projectIds:[...(initial?.projectIds||[])]}),[generated,setGenerated]=useState(initial?.approvedNarrative||''),[approved,setApproved]=useState(Boolean(initial?.approvedNarrative)),[state,setState]=useState<SaveState>('idle'),safeProjects=useMemo(()=>normalizeProjects(projects).filter(project=>project.status!=='Archived'),[projects])
 const update=<K extends keyof CollectionDraft>(key:K,next:CollectionDraft[K])=>{setValue(current=>({...current,[key]:next}));setState('idle');if(key==='brief'||key==='keywords'||key==='projectIds')setApproved(false)}
 const toggle=(id:string)=>update('projectIds',value.projectIds.includes(id)?value.projectIds.filter(item=>item!==id):[...value.projectIds,id])
 const move=(id:string,direction:-1|1)=>{const index=value.projectIds.indexOf(id),next=[...value.projectIds],target=index+direction;if(index<0||target<0||target>=next.length)return;[next[index],next[target]]=[next[target],next[index]];update('projectIds',next)}
 const generate=()=>{if(!value.brief.trim())return;const selected=safeProjects.filter(project=>value.projectIds.includes(project.id)),evidence=selected.flatMap(project=>[...approvedDraftSections(project).map(section=>section.value),project.story.challenge,project.story.response,project.story.outcome,project.whyItMatters]).filter(Boolean).slice(0,5);setGenerated([value.brief.trim(),value.keywords.trim()&&`Focus: ${value.keywords.trim()}.`,...evidence].filter(Boolean).join('\n\n'));setApproved(false);setState('idle')}
 const save=async()=>{if(!value.name.trim()||!value.brief.trim())return;setState('saving');try{await onSave({...value,name:value.name.trim(),brief:value.brief.trim(),description:value.brief.trim(),keywords:value.keywords.trim(),approvedNarrative:approved?generated.trim():''});setState('saved')}catch{setState('failed')}}
 return <div className="collection-form space-y-5">
  <label className="label">Collection Title<input value={value.name} onChange={event=>update('name',event.target.value)}/></label>
  <label className="label">Collection Brief / Description<textarea value={value.brief} onChange={event=>update('brief',event.target.value)} placeholder="Purpose, opportunity and narrative intention"/></label>
  <label className="label">Optional Narrative Keywords<input value={value.keywords} onChange={event=>update('keywords',event.target.value)} placeholder="e.g. public realm, renewal, transport"/></label>
  <fieldset><legend className="label">Selected Projects</legend><div className="collection-form-projects">{safeProjects.map(project=><div key={project.id} className={value.projectIds.includes(project.id)?'selected':''}><button type="button" onClick={()=>toggle(project.id)}><img src={project.coverImage||FALLBACK_PROJECT_IMAGE} alt=""/><span><strong>{project.projectName}</strong><small>{[project.sector,project.year].filter(Boolean).join(' · ')}</small></span>{value.projectIds.includes(project.id)&&<Check/>}</button>{value.projectIds.includes(project.id)&&<span><button type="button" aria-label={`Move ${project.projectName} up`} onClick={()=>move(project.id,-1)}><ChevronUp/></button><button type="button" aria-label={`Move ${project.projectName} down`} onClick={()=>move(project.id,1)}><ChevronDown/></button></span>}</div>)}</div></fieldset>
  <Button type="button" variant="ghost" disabled={!value.brief.trim()||!value.projectIds.length} onClick={generate}>Generate Narrative</Button>
  {!value.brief.trim()&&<p className="text-sm text-black/45">A Collection Brief / Description is required before narrative generation.</p>}
  <label className="label">Generated Narrative<textarea value={generated} onChange={event=>{setGenerated(event.target.value);setApproved(false);setState('idle')}} placeholder="Generate, review and edit the Collection Narrative."/></label>
  <label className="flex items-center gap-2"><input type="checkbox" checked={approved} disabled={!generated.trim()} onChange={event=>{setApproved(event.target.checked);setState('idle')}}/> Approved / Saved Narrative</label>
  <div className="collection-form-footer"><span className={`collection-save-state ${state}`}>{state==='saving'?'Saving…':state==='saved'?'Saved':state==='failed'?'Failed to save — retry':''}</span><div><Button type="button" variant="ghost" onClick={onCancel}>{state==='saved'?'Close':'Cancel'}</Button><Button type="button" disabled={!value.name.trim()||!value.brief.trim()||state==='saving'||state==='saved'} onClick={()=>void save()}>Save Collection</Button></div></div>
 </div>
}
