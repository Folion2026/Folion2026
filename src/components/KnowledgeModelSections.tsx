import {CheckCircle2} from 'lucide-react'
import {approvedDraftSections,normalizeProject} from '../lib/project'
import {ApprovedEvidenceItem,KnowledgeFact,KnowledgeFactKey,Project} from '../types'

const factGroups:{title:string;keys:KnowledgeFactKey[]}[]=[
 {title:'Place and location context',keys:['location','address','siteContext']},
 {title:'Client and stakeholder context',keys:['client']},
 {title:'Sector / typology',keys:['sector','projectType','proposal','precincts']},
 {title:'Scale',keys:['siteArea','gfa','dwellings','height','fsr']},
 {title:'Services and practice role',keys:['practice','services','scope']},
 {title:'Design moves / strategic response',keys:['placeStrategy']},
]

function StructuredGroup({title,facts}:{title:string;facts:KnowledgeFact[]}){if(!facts.length)return null;return <section className="approved-knowledge-group"><h3>{title}</h3><dl>{facts.map(fact=><div key={fact.key}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl></section>}
const evidenceGroupLabels:Record<string,string>={project_identity:'Project identity',scale:'Scale',practice_role:'Practice role',place_context:'Place and context',design_response:'Design moves and strategic response',outcomes_relevance:'Outcomes and future relevance',tags_themes:'Tags and themes'}
function EvidenceGroup({category,items}:{category:string;items:ApprovedEvidenceItem[]}){if(!items.length)return null;return <section className="approved-knowledge-group"><h3>{evidenceGroupLabels[category]||category}</h3><dl>{items.map(item=><div key={item.id}><dt>{item.field}</dt><dd>{item.value}</dd>{item.sourcePage&&<small>Document · Page {item.sourcePage}</small>}</div>)}</dl></section>}

export default function KnowledgeModelSections({project}:{project?:Project|null}){
 const safe=normalizeProject(project);if(!safe)return null
 const approvedDraft=approvedDraftSections(safe);const reviewedFacts=(safe.knowledge?.facts||[]).filter(fact=>fact.status==='reviewed'&&Boolean(fact.value))
 const approvedEvidence=safe.approvedEvidence||[];const evidenceCategories=Array.from(new Set(approvedEvidence.map(item=>item.category)))
 const hasContent=approvedDraft.length>0||reviewedFacts.length>0||approvedEvidence.length>0||safe.team.length>0
 if(!hasContent)return <div className="approved-knowledge-empty" aria-label="No approved project knowledge"/>
 return <div className="approved-knowledge">
  {approvedDraft.length>0&&<section className="approved-narrative"><div><p className="eyebrow">Project narrative</p><h2>Approved project understanding</h2></div><div>{approvedDraft.map(section=><article key={section.key}><span><CheckCircle2/>{section.label}</span><p>{section.value}</p></article>)}</div></section>}
  {(reviewedFacts.length>0||approvedEvidence.length>0||safe.team.length>0)&&<section className="structured-knowledge"><div><p className="eyebrow">Structured knowledge</p><h2>Approved information for reuse</h2></div><div className="structured-knowledge-grid">
   {evidenceCategories.map(category=><EvidenceGroup key={category} category={category} items={approvedEvidence.filter(item=>item.category===category)}/>)}
   {factGroups.map(group=><StructuredGroup key={group.title} title={group.title} facts={reviewedFacts.filter(fact=>group.keys.includes(fact.key))}/>)}
   {safe.team.length>0&&<section className="approved-knowledge-group"><h3>Project team and individual roles</h3><dl>{safe.team.map(member=><div key={member.personId}><dt>{member.name}</dt><dd>{member.projectRole}{member.contribution?` — ${member.contribution}`:''}</dd></div>)}</dl></section>}
  </div></section>}
 </div>
}
