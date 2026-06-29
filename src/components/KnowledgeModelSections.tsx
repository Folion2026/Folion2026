import {CheckCircle2} from 'lucide-react'
import {approvedDraftSections,normalizeProject,reviewedKnowledgeFacts} from '../lib/project'
import {KnowledgeFact,KnowledgeFactKey,Project} from '../types'

const factGroups:{title:string;keys:KnowledgeFactKey[]}[]=[
 {title:'Place and location context',keys:['location','address','siteContext','placeStrategy']},
 {title:'Client and stakeholder context',keys:['client']},
 {title:'Sector / typology',keys:['sector','projectType','proposal','precincts']},
 {title:'Scale',keys:['siteArea','gfa','dwellings','height','fsr']},
 {title:'Services and practice role',keys:['practice','services','scope']},
]

function StructuredGroup({title,facts}:{title:string;facts:KnowledgeFact[]}){if(!facts.length)return null;return <section className="approved-knowledge-group"><h3>{title}</h3><dl>{facts.map(fact=><div key={fact.key}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl></section>}

export default function KnowledgeModelSections({project}:{project?:Project|null}){
 const safe=normalizeProject(project);if(!safe)return null
 const approvedDraft=approvedDraftSections(safe);const reviewedFacts=reviewedKnowledgeFacts(safe)
 const hasContent=approvedDraft.length>0||reviewedFacts.length>0||safe.team.length>0||safe.tags.length>0
 if(!hasContent)return <div className="approved-knowledge-empty" aria-label="No approved project knowledge"/>
 return <div className="approved-knowledge">
  {approvedDraft.length>0&&<section className="approved-narrative"><div><p className="eyebrow">Project narrative</p><h2>Approved project understanding</h2></div><div>{approvedDraft.map(section=><article key={section.key}><span><CheckCircle2/>{section.label}</span><p>{section.value}</p></article>)}</div></section>}
  {(reviewedFacts.length>0||safe.team.length>0||safe.tags.length>0)&&<section className="structured-knowledge"><div><p className="eyebrow">Structured knowledge</p><h2>Approved information for reuse</h2></div><div className="structured-knowledge-grid">
   {factGroups.map(group=><StructuredGroup key={group.title} title={group.title} facts={reviewedFacts.filter(fact=>group.keys.includes(fact.key))}/>)}
   {safe.team.length>0&&<section className="approved-knowledge-group"><h3>Project team and individual roles</h3><dl>{safe.team.map(member=><div key={member.personId}><dt>{member.name}</dt><dd>{member.projectRole}{member.contribution?` — ${member.contribution}`:''}</dd></div>)}</dl></section>}
   {safe.tags.length>0&&<section className="approved-knowledge-group"><h3>Tags and themes</h3><div className="approved-tags">{safe.tags.map(tag=><span key={tag}>{tag}</span>)}</div></section>}
  </div></section>}
 </div>
}
