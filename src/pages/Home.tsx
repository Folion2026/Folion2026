import {ArrowRight,ArrowUpRight,BookOpen,ChevronLeft,ChevronRight,ImageOff,MapPin} from 'lucide-react'
import {useEffect,useMemo,useState} from 'react'
import {Link} from 'react-router-dom'
import {useAuth} from '../auth'
import ProjectCard from '../components/ProjectCard'
import RightActivityPanel from '../components/RightActivityPanel'
import {Badge,Button,EmptyState} from '../components/ui'
import {normalizeProjects} from '../lib/project'
import {useStore} from '../store'

const imageUrls=(project:ReturnType<typeof normalizeProjects>[number])=>Array.from(new Set([
 project.coverImage,
 ...project.assets.filter(asset=>asset.url&&['hero','photo','render'].includes(asset.type)).map(asset=>asset.url),
].filter(Boolean)))

export default function Home(){
 const {user}=useAuth()
 const {projects,people}=useStore()
 const publicProjects=useMemo(()=>normalizeProjects(projects).filter(project=>project.visibility==='public'&&project.status!=='Archived'),[projects])
 const slides=useMemo(()=>publicProjects.flatMap(project=>imageUrls(project).map(url=>({project,url}))),[publicProjects])
 const [active,setActive]=useState(0)
 useEffect(()=>{setActive(value=>slides.length?value%slides.length:0)},[slides.length])
 useEffect(()=>{if(slides.length<2)return;const timer=window.setInterval(()=>setActive(value=>(value+1)%slides.length),6500);return()=>window.clearInterval(timer)},[slides.length])
 const slide=slides[active]||null
 const moreProjects=publicProjects.filter(project=>project.id!==slide?.project.id).slice(0,3)
 const profilePerson=people.find(person=>person.status==='active'&&person.email&&person.email.toLowerCase()===user?.email?.toLowerCase())
 const metadata=user?.user_metadata||{}
 const metadataName=[metadata.first_name,metadata.full_name,metadata.name,metadata.display_name].find(value=>typeof value==='string'&&value.trim()&&!value.includes('@')) as string|undefined
 const firstName=(profilePerson?.name||metadataName||'').trim().split(/\s+/)[0]
 const greeting=firstName?`Good morning, ${firstName}.`:'Good morning.'
 const today=new Intl.DateTimeFormat('en-AU',{weekday:'long',day:'numeric',month:'long'}).format(new Date())
 const move=(direction:-1|1)=>setActive(value=>(value+direction+slides.length)%slides.length)

 return <div>
  <header className="home-welcome"><div><p className="eyebrow">{today}</p><h1 className="page-title mt-2">{greeting}</h1></div><p>Your practice memory has a few good threads worth picking up today.</p></header>
  <div className="home-layout"><div className="min-w-0">
   {slide?<section className="potd"><Link className="potd-media" to={`/projects/${slide.project.id}`} aria-label={`Open ${slide.project.projectName}`}><img src={slide.url} alt={`${slide.project.projectName}, ${slide.project.location||'project image'}`}/></Link><div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/85 via-black/5 to-black/10"/><div className="potd-top"><Badge tone="dark">Project of the day</Badge><span>Memory {(active+1).toString().padStart(2,'0')} / {slides.length.toString().padStart(2,'0')}</span></div>{slides.length>1&&<div className="potd-carousel-controls"><button onClick={()=>move(-1)} aria-label="Previous project image"><ChevronLeft/></button><button onClick={()=>move(1)} aria-label="Next project image"><ChevronRight/></button></div>}<div className="potd-content"><div className="max-w-2xl"><p className="flex items-center gap-2 text-sm text-white/65"><MapPin size={14}/>{slide.project.location||'Location not recorded'} · {slide.project.year||'Year not recorded'}</p><h2>{slide.project.projectName||'Untitled project'}</h2><p className="potd-brief">{slide.project.story?.brief||'Project story not recorded yet.'}</p><div className="potd-tags">{(slide.project.services||[]).slice(0,3).map(service=><span key={service}>{service}</span>)}</div></div><Link to={`/projects/${slide.project.id}`}><Button variant="light">Open project story <ArrowRight size={16}/></Button></Link></div></section>:<section className="potd potd-empty"><ImageOff size={42}/><div><Badge>Project of the day</Badge><h2>No project image available</h2><p>Add a real image to a public project to feature it here.</p><Link to="/projects"><Button>Open projects <ArrowRight size={16}/></Button></Link></div></section>}
   <section className="mt-14"><div className="section-heading"><div><p className="eyebrow">Public work</p><h2 className="section-title mt-2">From your practice</h2><p className="mt-3 text-sm text-black/45 max-w-xl">The projects currently visible on the public profile and in Folion Magazine.</p></div><Link to="/projects" className="section-link">All projects <ArrowUpRight size={15}/></Link></div>{moreProjects.length?<div className="grid md:grid-cols-2 gap-5 mt-6">{moreProjects.map(project=><ProjectCard key={project.id} project={project} selectable={false}/>)}</div>:<div className="mt-6"><EmptyState title="No more public projects" body="Public projects will appear here when they are published from the workspace."/></div>}</section>
   <Link to="/magazine" className="home-magazine-callout"><span className="home-magazine-icon"><BookOpen size={20}/></span><span><strong>See your work in context</strong><small>Open the public Folion Magazine</small></span><ArrowUpRight className="ml-auto" size={19}/></Link>
  </div><RightActivityPanel/></div>
 </div>
}
