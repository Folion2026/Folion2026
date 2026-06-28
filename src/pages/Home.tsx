import {ArrowRight,ArrowUpRight,BookOpen,ImageOff,MapPin} from 'lucide-react'
import {Link} from 'react-router-dom'
import ProjectCard from '../components/ProjectCard'
import RightActivityPanel from '../components/RightActivityPanel'
import {Badge,Button,EmptyState} from '../components/ui'
import {FALLBACK_PROJECT_IMAGE,normalizeProjects} from '../lib/project'
import {useStore} from '../store'

export default function Home(){
 const {projects}=useStore()
 const publicProjects=normalizeProjects(projects).filter(project=>project.visibility==='public'&&project.status!=='Archived')
 const hero=publicProjects[0]||null
 const moreProjects=publicProjects.slice(1,4)
 const today=new Intl.DateTimeFormat('en-AU',{weekday:'long',day:'numeric',month:'long'}).format(new Date())

 return <div>
  <header className="home-welcome"><div><p className="eyebrow">{today}</p><h1 className="page-title mt-2">Good morning, Maya.</h1></div><p>Your practice memory has a few good threads worth picking up today.</p></header>
  <div className="home-layout"><div className="min-w-0">
   {hero?<section className="potd"><img src={hero?.coverImage||FALLBACK_PROJECT_IMAGE} onError={event=>{event.currentTarget.src=FALLBACK_PROJECT_IMAGE}} alt={`${hero?.projectName||'Project'}, ${hero?.location||''}`}/><div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/5 to-black/10"/><div className="potd-top"><Badge tone="dark">Project of the day</Badge><span>Memory 01 / {publicProjects.length.toString().padStart(2,'0')}</span></div><div className="potd-content"><div className="max-w-2xl"><p className="flex items-center gap-2 text-sm text-white/65"><MapPin size={14}/>{hero?.location||'Location not recorded'} · {hero?.year||'Year not recorded'}</p><h2>{hero?.projectName||'Untitled project'}</h2><p className="potd-brief">{hero?.story?.brief||'Project story not recorded yet.'}</p><div className="potd-tags">{(hero?.services||[]).slice(0,3).map(service=><span key={service}>{service}</span>)}</div></div><Link to={`/projects/${hero?.id||''}`}><Button variant="light">Open project story <ArrowRight size={16}/></Button></Link></div></section>:<section className="potd potd-empty"><ImageOff size={42}/><div><Badge tone="dark">Project of the day</Badge><h2>No public project selected</h2><p>Publish a project from the workspace to feature it here.</p><Link to="/projects"><Button variant="light">Open projects <ArrowRight size={16}/></Button></Link></div></section>}
   <section className="mt-14"><div className="section-heading"><div><p className="eyebrow">Public work</p><h2 className="section-title mt-2">From your practice</h2><p className="mt-3 text-sm text-black/45 max-w-xl">The projects currently visible on the public profile and in Folion Magazine.</p></div><Link to="/projects" className="section-link">All projects <ArrowUpRight size={15}/></Link></div>{moreProjects.length?<div className="grid md:grid-cols-2 gap-5 mt-6">{moreProjects.map(project=><ProjectCard key={project.id} project={project} selectable={false}/>)}</div>:<div className="mt-6"><EmptyState title="No more public projects" body="Public projects will appear here when they are published from the workspace."/></div>}</section>
   <Link to="/magazine" className="home-magazine-callout"><span className="home-magazine-icon"><BookOpen size={20}/></span><span><strong>See your work in context</strong><small>Open the public Folion Magazine</small></span><ArrowUpRight className="ml-auto" size={19}/></Link>
  </div><RightActivityPanel/></div>
 </div>
}
