import {confidentialityLabel} from '../lib/confidentiality'
import {approvedDraftSections,normalizeProject,reviewedKnowledgeFacts} from '../lib/project'
import {KnowledgeFact,KnowledgeFactKey,Project} from '../types'

const factGroups:{title:string;keys:KnowledgeFactKey[]}[]=[
 {title:'Scale',keys:['siteArea','gfa','dwellings','height','fsr']},
 {title:'Practice role',keys:['practice','services','scope']},
]
const projectKeys:KnowledgeFactKey[]=['projectName','location','address','client','status','year','projectType','sector']

function Facts({title,facts}:{title:string;facts:KnowledgeFact[]}){if(!facts.length)return null;return <section className="knowledge-profile-group"><h3>{title}</h3><dl>{facts.map(fact=><div key={`${fact.key}-${fact.value}`}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl></section>}

export default function KnowledgeModelSections({project}:{project?:Project|null}){
 const safe=normalizeProject(project);if(!safe)return null
 const drafts=approvedDraftSections(safe);const summary=drafts.find(section=>section.key==='summary'&&section.basis!=='team')?.value
 const narrative=drafts.filter(section=>section.label==='Project narrative').map(section=>section.value.trim()).filter(Boolean)
 const facts=reviewedKnowledgeFacts(safe);const used=new Set<string>();const uniqueFacts=facts.filter(fact=>{const key=`${fact.key}|${fact.value}`;if(used.has(key))return false;used.add(key);return true})
 const hasFacts=uniqueFacts.length>0||safe.team.length>0
 if(!summary&&!hasFacts&&!narrative.length)return <div className="approved-knowledge-empty" aria-label="No approved project knowledge"/>
 return <div className="knowledge-profile">
  {summary&&<section className="knowledge-profile-summary"><p className="eyebrow">Project Summary</p><p>{summary}</p></section>}
  {hasFacts&&<section className="knowledge-profile-facts"><div><p className="eyebrow">Project Facts</p><h2>Approved factual profile</h2></div><div className="knowledge-profile-grid">
   <section className="knowledge-profile-group"><h3>Project</h3><dl>{uniqueFacts.filter(fact=>projectKeys.includes(fact.key)).map(fact=><div key={`${fact.key}-${fact.value}`}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}<div><dt>Confidentiality / permitted use</dt><dd>{confidentialityLabel(safe.confidentiality)}</dd></div></dl></section>
   {factGroups.map(group=><Facts key={group.title} title={group.title} facts={uniqueFacts.filter(fact=>group.keys.includes(fact.key))}/>)}
   {safe.team.length>0&&<section className="knowledge-profile-group"><h3>Project team</h3><dl>{safe.team.map(member=><div key={member.personId}><dt>{member.name}</dt><dd>{member.projectRole}{member.contribution?` — ${member.contribution}`:''}</dd></div>)}</dl></section>}
  </div></section>}
  {narrative.length>0&&<section className="knowledge-profile-narrative"><p className="eyebrow">Project Narrative</p><p>{narrative.join(' ')}</p></section>}
 </div>
}
