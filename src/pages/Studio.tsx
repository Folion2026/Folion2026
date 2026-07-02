import {Archive,BookOpen,FileText,LayoutGrid,Presentation,Users} from 'lucide-react'
import {useCallback,useEffect,useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {useAuth} from '../auth'
import {apiRequest} from '../lib/api'
import {StudioPackage,StudioPackageType} from '../types'

const options:{type:StudioPackageType;title:string;description:string;icon:typeof FileText}[]=[
 {type:'single_project_sheet',title:'Single Project Sheet',description:'One approved project, ready for deliberate reuse.',icon:FileText},
 {type:'project_collection',title:'Project Collection',description:'A controlled collection of approved projects.',icon:LayoutGrid},
 {type:'pitch',title:'Pitch Package',description:'A tailored argument for a specific opportunity.',icon:Presentation},
 {type:'cv',title:'CV Package',description:'Role-safe individual or proposed-team experience.',icon:Users},
 {type:'tender',title:'Tender Response Package',description:'Criteria-led evidence and response assembly.',icon:BookOpen},
]
const stateLabels:Record<string,string>={draft:'Draft',ready_to_share:'Ready to share',source_updated:'Source updated',archived:'Archived'}

export default function Studio(){
 const {session}=useAuth();const navigate=useNavigate();const [packages,setPackages]=useState<StudioPackage[]>([]);const [error,setError]=useState('')
 const load=useCallback(async()=>{if(!session)return;try{const result=await apiRequest<{packages:StudioPackage[]}>(session,'/v1/packages');setPackages(result.packages);setError('')}catch(reason){setError(reason instanceof Error?reason.message:'Folion could not load Studio packages')}},[session])
 useEffect(()=>{void load()},[load])
 const create=async(type:StudioPackageType,title:string)=>{if(!session)return;try{const result=await apiRequest<{package:StudioPackage}>(session,'/v1/packages',{method:'POST',body:JSON.stringify({packageType:type,title,mode:'internal',state:'draft',data:{},sections:[{id:crypto.randomUUID(),sectionType:'cover',title:'Cover',body:title,status:'draft',sources:[]}],projectIds:[],personIds:[],assetIds:[]})});navigate(`/studio/${result.package.id}`)}catch(reason){setError(reason instanceof Error?reason.message:'Package could not be created')}}
 return <div className="studio-home"><header className="studio-heading"><p className="eyebrow">Studio</p><h1>What are you preparing?</h1><p>Build saved, editable packages from approved project knowledge.</p></header>{error&&<div className="auth-message error">{error}</div>}
  <section className="studio-output-grid">{options.map(option=>{const Icon=option.icon;return <button key={option.type} onClick={()=>['single_project_sheet','project_collection','pitch'].includes(option.type)?navigate(`/studio/new/${option.type}`):void create(option.type,option.title)}><Icon/><span><strong>{option.title}</strong><small>{option.description}</small></span></button>})}</section>
  <section className="studio-package-index"><div><p className="eyebrow">Saved work</p><h2>Recent Packages</h2></div>{!packages.length?<p className="evidence-empty">No packages yet. Choose what you are preparing above.</p>:<div className="studio-package-list">{packages.map(item=><button key={item.id} onClick={()=>navigate(`/studio/${item.id}`)}><span><strong>{item.title}</strong><small>{options.find(option=>option.type===item.packageType)?.title} · {item.mode==='internal'?'Internal':'External'}</small></span><span className={`package-state ${item.state}`}>{item.state==='archived'&&<Archive/>}{stateLabels[item.state]}</span></button>)}</div>}</section>
 </div>
}
