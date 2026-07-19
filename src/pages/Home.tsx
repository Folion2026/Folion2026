import {Globe2,Lock,Plus,Share2,Sparkles} from 'lucide-react'
import {useMemo,useState} from 'react'
import {Link,useLocation} from 'react-router-dom'
import BottomSelectionBar from '../components/BottomSelectionBar'
import ProjectCard from '../components/ProjectCard'
import {FilterChips,SearchBar} from '../components/SearchAndFilters'
import {Button,EmptyState} from '../components/ui'
import {useAuth} from '../auth'
import {normalizeProjects,projectSearchText} from '../lib/project'
import {useStore} from '../store'

const examples=['employment land transition','public domain and density','creative makers precinct']
export default function Home(){
 const {user}=useAuth(),location=useLocation(),{projects,people,workspaceRole}=useStore(),[query,setQuery]=useState(''),[filter,setFilter]=useState('All')
 const profile=people.find(person=>person.status==='active'&&person.email?.toLowerCase()===user?.email?.toLowerCase()),metadata=user?.user_metadata||{},display=[profile?.name,metadata.first_name,metadata.full_name,metadata.name,metadata.display_name].find(value=>typeof value==='string'&&value.trim()&&!value.includes('@')) as string|undefined,firstName=display?.trim().split(/\s+/)[0]
 const active=normalizeProjects(projects).filter(project=>project.status!=='Archived'),terms=query.toLowerCase().trim().split(/\s+/).filter(Boolean)
 const results=useMemo(()=>active.filter(project=>terms.every(term=>projectSearchText(project).includes(term))&&(filter==='All'||(filter==='Internal only'&&project.confidentiality==='internal-only')||(filter==='Externally shareable'&&project.confidentiality==='externally-shareable')||(filter==='Publicly publishable'&&project.confidentiality==='publicly-publishable')||project.sector===filter)),[active,terms,filter])
 const notice=(location.state as {notice?:string}|null)?.notice,reset=()=>{setQuery('');setFilter('All')}
 return <div>{notice&&<div className="auth-message mb-5" role="status">{notice}</div>}<header className="projects-header"><div><p className="eyebrow">Project Gallery · Practice Intelligence</p><h1 className="page-title mt-2">{firstName?`Welcome, ${firstName}.`:'Project Gallery'}</h1><p className="projects-intro">Search, discover and open the practice’s approved project memory.</p></div><Link to="/new-project"><Button><Plus size={17}/> Create New Project</Button></Link></header>
  <section className="projects-search-panel"><div className="flex items-center gap-2 mb-3 text-[10px] uppercase tracking-[.16em] text-black/40"><Sparkles size={13}/> Ask Folion</div><SearchBar value={query} onChange={setQuery}/><div className="search-panel-footer"><FilterChips active={filter} onChange={setFilter}/><div className="visibility-tally"><span><Lock/> {active.filter(p=>p.confidentiality==='internal-only').length} internal</span><span><Share2/> {active.filter(p=>p.confidentiality==='externally-shareable').length} external</span><span><Globe2/> {active.filter(p=>p.confidentiality==='publicly-publishable').length} publishable</span></div></div>{!query&&<div className="example-queries"><span>Try</span>{examples.map(value=><button key={value} onClick={()=>setQuery(value)}>“{value}”</button>)}</div>}</section>
  <section className="workspace-section"><div className="workspace-heading"><div><p className="eyebrow">Project Deck</p><h2 className="section-title mt-2">The practice archive</h2><p>Browse visually, select useful records, or open the complete project memory.</p></div><span className="project-count">{results.length} project{results.length===1?'':'s'}</span></div>{results.length?<div className="projects-grid">{results.map(project=><ProjectCard key={project.id} project={project} selectable={workspaceRole!=='viewer'}/>)}</div>:<EmptyState title="No project memory found" body="Try a broader phrase, another place, or a project service." action={<Button variant="ghost" onClick={reset}>Reset search</Button>}/>}</section>{workspaceRole!=='viewer'&&<BottomSelectionBar/>}</div>
}
