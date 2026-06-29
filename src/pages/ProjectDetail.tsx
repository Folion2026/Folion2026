import {ArrowLeft} from 'lucide-react'
import {useMemo} from 'react'
import {useNavigate,useParams,useSearchParams} from 'react-router-dom'
import KnowledgeModelSections from '../components/KnowledgeModelSections'
import ProjectKnowledgeRecord from '../components/ProjectKnowledgeRecord'
import {ProjectHero,ProjectOverview} from '../components/ProjectDetailSections'
import {EmptyState} from '../components/ui'
import {normalizeProject} from '../lib/project'
import {useStore} from '../store'

type DetailTab='overview'|'knowledge'|'sources'
export default function ProjectDetail(){
 const {id}=useParams();const navigate=useNavigate();const [searchParams,setSearchParams]=useSearchParams();const {projects,updateProject}=useStore()
 const project=useMemo(()=>normalizeProject((projects||[]).find(item=>item?.id===id)),[projects,id])
 const requested=searchParams.get('tab');const activeTab:DetailTab=requested==='knowledge'||requested==='sources'?requested:'overview'
 if(!project)return <EmptyState title="Project not found" body="This project may have moved or been archived."/>
 const changeTab=(tab:DetailTab)=>setSearchParams(tab==='overview'?{}:{tab})
 return <div className="project-record">
  <div className="detail-toolbar"><button onClick={()=>navigate(-1)} className="detail-back"><ArrowLeft size={16}/> Back to projects</button></div>
  <ProjectHero project={project}/>
  <nav className="detail-tabs" aria-label="Project detail sections">{(['overview','knowledge','sources'] as DetailTab[]).map(tab=><button key={tab} className={activeTab===tab?'active':''} onClick={()=>changeTab(tab)}>{tab[0].toUpperCase()+tab.slice(1)}</button>)}</nav>
  {activeTab==='overview'&&<ProjectOverview project={project}/>}
  {activeTab==='knowledge'&&<KnowledgeModelSections project={project}/>}
  {activeTab==='sources'&&<ProjectKnowledgeRecord project={project} onUpdate={updateProject}/>}
 </div>
}
