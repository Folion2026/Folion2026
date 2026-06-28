import {BookOpen,FileText,Lightbulb,Search} from 'lucide-react'
import {normalizeProject} from '../lib/project'
import {KnowledgeItem,Project} from '../types'
import {Badge} from './ui'

function SectionHeading({label,title}:{label:string;title:string}){return <div><p className="eyebrow">{label}</p><h2 className="section-title mt-2">{title}</h2></div>}

function ItemSection({label,title,items}:{label:string;title:string;items?:KnowledgeItem[]}){
 if(!items?.length)return null
 return <section className="knowledge-section"><SectionHeading label={label} title={title}/><div className="knowledge-item-grid">{items.map((item,index)=><article key={`${item.title}-${index}`}><span>0{index+1}</span><h3>{item.title}</h3><p>{item.description}</p></article>)}</div></section>
}

function ListSection({label,title,items}:{label:string;title:string;items?:string[]}){
 if(!items?.length)return null
 return <section className="knowledge-section"><SectionHeading label={label} title={title}/><ul className="knowledge-list">{items.map(item=><li key={item}><span/><p>{item}</p></li>)}</ul></section>
}

export default function KnowledgeModelSections({project}:{project?:Project|null}){
 const safe=normalizeProject(project);if(!safe)return null
 const identity=safe.identity
 const metrics=safe.metrics
 const studio=safe.studioAssets
 const search=safe.searchIntelligence
 const identityDetails=[identity?.practice&&`Practice: ${identity.practice}`,...(identity?.collaborators||[]).map(item=>`Collaborator: ${item}`)]
 const metricItems=[['Site area',metrics?.siteArea],['FSR',metrics?.fsr],['Height',metrics?.height],['Public domain',metrics?.publicDomain],['Public domain share',metrics?.publicDomainPercentage],['Affordable housing',metrics?.affordableHousing],['GFA',metrics?.gfa],['Dwellings',metrics?.dwellings]].filter((item):item is [string,string]=>Boolean(item[1]))
 const studioItems=[['Short summary',studio?.shortSummary],['Capability statement',studio?.capabilityStatement],['Tender paragraph',studio?.tenderParagraph]].filter((item):item is [string,string]=>Boolean(item[1]))
 return <div className="knowledge-model">
  <section className="knowledge-section knowledge-identity"><SectionHeading label="Identity" title="The project at a glance"/><p className="knowledge-lead">{identity?.description||safe.story.brief}</p>{Boolean(safe.address?.length)&&<p className="knowledge-address">{safe.address?.join(' · ')}</p>}<div className="flex flex-wrap gap-2 mt-5">{(safe.projectType||[]).map(item=><Badge key={item}>{item}</Badge>)}</div>{Boolean(identityDetails.length)&&<div className="knowledge-meta">{identityDetails.map(item=><span key={item}>{item}</span>)}</div>}{Boolean(identity?.role.length)&&<div className="knowledge-role"><strong>Hatch role</strong><p>{identity?.role.join(' · ')}</p></div>}</section>
  {metricItems.length>0&&<section className="knowledge-section"><SectionHeading label="Metrics" title="Scale and public benefit"/><dl className="knowledge-metrics">{metricItems.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>}
  <ItemSection label="Opportunity" title="What the site makes possible" items={safe.opportunity}/>
  <ItemSection label="Challenges" title="What the proposal needed to resolve" items={safe.challenges}/>
  <ItemSection label="Design Response" title="How the project responds" items={safe.designResponse}/>
  {(safe.outcome?.summary||safe.outcome?.benefits.length)&&<section className="knowledge-section"><SectionHeading label="Outcome" title="Urban design merit and public benefit"/><p className="knowledge-lead">{safe.outcome?.summary}</p><div className="knowledge-benefits">{safe.outcome?.benefits.map(item=><span key={item}>{item}</span>)}</div></section>}
  {safe.whyItMatters&&<section className="knowledge-section knowledge-highlight"><Lightbulb/><div><p className="eyebrow">Why It Matters</p><h2>{safe.whyItMatters}</h2></div></section>}
  <ListSection label="Lessons Learned" title="Knowledge to carry forward" items={safe.lessonsLearned}/>
  {studioItems.length>0&&<section className="knowledge-section"><SectionHeading label="Studio Assets" title="Ready to reuse"/><div className="studio-asset-list">{studioItems.map(([label,value])=><article key={label}><FileText/><div><h3>{label}</h3><p>{value}</p></div></article>)}</div></section>}
  {(search?.keywords.length||search?.concepts.length||search?.searchQuestionsThisProjectShouldAnswer.length)&&<section className="knowledge-section"><SectionHeading label="Search Intelligence" title="How this project can be found"/><div className="search-intelligence"><div><Search/><strong>Keywords and concepts</strong><div className="flex flex-wrap gap-2 mt-4">{[...(search?.keywords||[]),...(search?.concepts||[])].map(item=><Badge key={item}>{item}</Badge>)}</div></div>{Boolean(search?.searchQuestionsThisProjectShouldAnswer.length)&&<div><BookOpen/><strong>Questions this project should answer</strong><ul>{search?.searchQuestionsThisProjectShouldAnswer.map(item=><li key={item}>{item}</li>)}</ul></div>}</div></section>}
  {Boolean(safe.evidence?.length)&&<section className="knowledge-section"><SectionHeading label="Evidence" title="Traceable project knowledge"/><div className="evidence-list">{safe.evidence?.map((item,index)=><article key={`${item.field}-${index}`}><div><strong>{item.field}</strong><span>{item.source}</span></div><div><span>{item.page===null?'Page not recorded':`Page ${item.page}`}</span><strong>{item.confidence===null?'—':`${Math.round(item.confidence*100)}%`}</strong></div></article>)}</div></section>}
 </div>
}
