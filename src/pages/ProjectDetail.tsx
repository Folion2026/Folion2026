import {ArrowLeft,ArrowRight,CheckCircle2} from 'lucide-react'
import {useMemo,useState} from 'react'
import {useLocation,useNavigate,useParams,useSearchParams} from 'react-router-dom'
import KnowledgeModelSections from '../components/KnowledgeModelSections'
import ProjectKnowledgeRecord from '../components/ProjectKnowledgeRecord'
import {ProjectHero,ProjectOverview} from '../components/ProjectDetailSections'
import {Button,EmptyState} from '../components/ui'
import {normalizeProject} from '../lib/project'
import {useStore} from '../store'

type DetailTab='overview'|'knowledge'|'sources'
export default function ProjectDetail(){
 const {id}=useParams();const navigate=useNavigate();const location=useLocation();const [searchParams,setSearchParams]=useSearchParams();const {projects,updateProject}=useStore();const [showReadyConfirmation,setShowReadyConfirmation]=useState(Boolean((location.state as {readyConfirmation?:boolean}|null)?.readyConfirmation))
 const project=useMemo(()=>normalizeProject((projects||[]).find(item=>item?.id===id)),[projects,id])
 const requested=searchParams.get('tab');const activeTab:DetailTab=requested==='knowledge'||requested==='sources'?requested:'overview'
 if(!project)return <EmptyState title="Project not found" body="This project may have moved or been archived."/>
 const changeTab=(tab:DetailTab)=>setSearchParams(tab==='overview'?{}:{tab})
 return <div className="project-record">
 <div className="detail-toolbar"><button onClick={()=>navigate(-1)} className="detail-back"><ArrowLeft size={16}/> Back to projects</button></div>
  <nav className="detail-tabs" aria-label="Project detail sections">{(['overview','knowledge','sources'] as DetailTab[]).map(tab=><button key={tab} className={activeTab===tab?'active':''} onClick={()=>changeTab(tab)}>{tab[0].toUpperCase()+tab.slice(1)}</button>)}</nav>
  {showReadyConfirmation&&<aside className="project-ready-confirmation" aria-live="polite"><CheckCircle2/><div><p className="eyebrow">Editorial release</p><h2>Project ready for Studio</h2><p>Approved knowledge is ready for deliberate Studio use. This does not publish the project.</p></div><div><Button onClick={()=>navigate('/studio')}>Open Studio <ArrowRight/></Button><button onClick={()=>{setShowReadyConfirmation(false);navigate(`/projects/${project.id}`,{replace:true})}}>View project</button></div></aside>}
  {activeTab==='overview'&&<>{project.knowledgeStatus==='Ready for Studio'&&<p className="project-ready-status"><CheckCircle2/> Ready for Studio</p>}<ProjectHero project={project}/><ProjectOverview project={project}/></>}
  {activeTab==='knowledge'&&<KnowledgeModelSections project={project}/>}
  {activeTab==='sources'&&<ProjectKnowledgeRecord project={project} onUpdate={updateProject}/>}
 </div>
}
