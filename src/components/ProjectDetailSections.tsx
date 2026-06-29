import {MapPin,ShieldCheck,Users} from 'lucide-react'
import {confidentialityLabel} from '../lib/confidentiality'
import {normalizeProject} from '../lib/project'
import {Project} from '../types'
import {Badge} from './ui'
import ProjectGallery from './ProjectGallery'

const clean=(value?:string)=>value&&!['Unknown','Uncategorised','Year not recorded','Location not recorded','Project story not recorded yet.'].includes(value)?value:''
function FactGroup({title,items}:{title:string;items:[string,string|undefined][]}){const known=items.filter((item):item is [string,string]=>Boolean(clean(item[1])));if(!known.length)return null;return <section className="overview-fact-group"><h2>{title}</h2><dl>{known.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>}

export function ProjectHero({project}:{project?:Project|null}){const safe=normalizeProject(project);if(!safe)return null;return <><div className="project-profile-heading"><div><p className="flex gap-2 items-center text-sm text-black/45"><MapPin size={15}/>{clean(safe.location)}{clean(safe.year)&&` · ${safe.year}`}</p><h1>{safe.projectName}</h1></div><div className="flex flex-wrap gap-2"><Badge><ShieldCheck size={11}/>{confidentialityLabel(safe.confidentiality)}</Badge>{safe.visibility==='public'&&<Badge>Published</Badge>}{clean(safe.status)&&<Badge>{safe.status}</Badge>}</div></div><ProjectGallery project={safe}/></>}

export function ProjectOverview({project}:{project?:Project|null}){
 const safe=normalizeProject(project);if(!safe)return null
 const metrics=safe.metrics
 return <div className="project-overview-profile">
  <FactGroup title="Project" items={[["Project name",safe.projectName],["Type",safe.projectType?.join(' · ')],["Sector / typology",safe.sector],["Status",safe.status],["Year / dates",safe.year],["Client",safe.client],["Location",safe.location],["Address",safe.address?.join(' · ')],["Confidentiality and permitted use",confidentialityLabel(safe.confidentiality)]]}/>
  <FactGroup title="Scale" items={[["Site area",safe.siteArea],["GFA",safe.gfa],["Dwellings",metrics?.dwellings],["Height / levels",safe.height],["FSR",metrics?.fsr]]}/>
  <FactGroup title="Practice role" items={[["Practice",safe.company],["Services",safe.services.join(' · ')],["Scope",safe.scope||safe.identity?.role.join(' · ')]]}/>
  {safe.team.length>0&&<section className="overview-fact-group"><h2><Users/> Project team</h2><div className="overview-team">{safe.team.map(member=><article key={member.personId}><span>{member.name.split(' ').map(part=>part[0]).join('')}</span><div><strong>{member.name}</strong><p>{member.projectRole}</p>{member.contribution&&<small>{member.contribution}</small>}</div></article>)}</div></section>}
 </div>
}
