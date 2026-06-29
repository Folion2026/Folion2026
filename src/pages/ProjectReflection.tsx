import {ArrowLeft,ArrowRight,Box,Camera,Check,FileText,Files,FileUp,GalleryHorizontal,Image,Layers3,PackageOpen,PanelsTopLeft,Sparkles} from 'lucide-react'
import {ChangeEvent,useEffect,useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {Button} from '../components/ui'
import {createStormbringerDemoProject,FALLBACK_PROJECT_IMAGE,isStormbringerDemoInput,STORMBRINGER_DEMO_TEAM_INPUT} from '../lib/project'
import {useStore} from '../store'
import {Asset,AssetType,Project,TeamInput} from '../types'

type UploadFile={name:string;url:string}
type Category={type:AssetType;label:string;description:string;accept:string;icon:typeof FileText}
const categories:Category[]=[
 {type:'report',label:'Report',description:'A source document for project facts, outcomes and documented knowledge.',accept:'.pdf,.doc,.docx,.txt',icon:FileText},
 {type:'hero',label:'Hero Image',description:'The primary project image used on cards and page headers.',accept:'image/*',icon:Image},
 {type:'plan',label:'Plans',description:'Site, floor, landscape and urban plans.',accept:'image/*,.pdf',icon:PanelsTopLeft},
 {type:'section',label:'Sections',description:'Building, landscape and site sections.',accept:'image/*,.pdf',icon:Layers3},
 {type:'diagram',label:'Diagrams',description:'Concept, strategy, process and analysis diagrams.',accept:'image/*,.pdf',icon:GalleryHorizontal},
 {type:'render',label:'Renders',description:'Visualisations and design development imagery.',accept:'image/*',icon:Box},
 {type:'photo',label:'Photos',description:'Completed work, site and construction photography.',accept:'image/*',icon:Camera},
 {type:'document',label:'Documents',description:'Briefs, submissions, schedules and supporting records.',accept:'.pdf,.doc,.docx,.xls,.xlsx',icon:Files},
 {type:'other',label:'Other',description:'Any additional project material worth preserving.',accept:'*',icon:PackageOpen},
]
const processingSteps=['Reading report','Extracting project facts','Extracting project knowledge','Processing hero image','Organising plans and diagrams','Preparing Team input']
const localOnlySteps=['Cataloguing uploaded assets','Preserving category metadata','Preparing Team input']
const emptyTeamInput:TeamInput={challengeOpportunity:'',teamResponse:'',futureRelevance:''}
const teamInputStorageKey='folion-import-team-input'
const questions:{key:keyof TeamInput;label:string;prompt:string}[]=[
 {key:'challengeOpportunity',label:'Challenge or opportunity',prompt:'What was the real challenge or opportunity in this project?'},
 {key:'teamResponse',label:'Team response',prompt:'What did the team do in response?'},
 {key:'futureRelevance',label:'Future relevance',prompt:'Why is this project relevant to future work?'},
]

export default function ProjectReflectionPage(){
 const navigate=useNavigate();const {addProject}=useStore();const [stage,setStage]=useState<'upload'|'context'>('upload');const [uploads,setUploads]=useState<Partial<Record<AssetType,UploadFile[]>>>({});const [processIndex,setProcessIndex]=useState(0);const [teamInput,setTeamInput]=useState<TeamInput>(()=>{try{return{...emptyTeamInput,...JSON.parse(localStorage.getItem(teamInputStorageKey)||'{}')}}catch{return emptyTeamInput}});const [stormbringerDemo,setStormbringerDemo]=useState(false);const activeSteps=stormbringerDemo?processingSteps:localOnlySteps
 useEffect(()=>{if(stage!=='context'||processIndex>=activeSteps.length)return;const timer=setTimeout(()=>setProcessIndex(index=>index+1),500);return()=>clearTimeout(timer)},[stage,processIndex,activeSteps.length])
 const setFixtureTeamInput=()=>{setTeamInput(STORMBRINGER_DEMO_TEAM_INPUT);localStorage.setItem(teamInputStorageKey,JSON.stringify(STORMBRINGER_DEMO_TEAM_INPUT))}
 const chooseFiles=(type:AssetType)=>(event:ChangeEvent<HTMLInputElement>)=>{const selected=Array.from(event.target.files||[]).map(file=>({name:file.name,url:file.type.startsWith('image/')?URL.createObjectURL(file):''}));setUploads(current=>{const next={...current,[type]:[...(current[type]||[]),...selected]};const fixture=isStormbringerDemoInput('',Object.values(next).flat().map(file=>file.name));setStormbringerDemo(fixture);if(fixture)setFixtureTeamInput();return next});event.target.value=''}
 const addStormbringerDemo=()=>{setStormbringerDemo(true);setFixtureTeamInput();setUploads({report:[{name:'210622_STO ARM_Armidale Vision Deck Draft Issue_LowRes.pdf',url:''}],hero:[{name:'Cover.jpg',url:'/projects/stormbringer/cover.jpg'}]})}
 const assets=():Asset[]=>(Object.entries(uploads) as [AssetType,UploadFile[]][]).flatMap(([type,files])=>files.map((file,index)=>{const category=categories.find(item=>item.type===type)!;return{id:stormbringerDemo&&type==='report'&&index===0?'stormbringer-report':stormbringerDemo&&type==='hero'&&index===0?'stormbringer-hero':`${type}-${Date.now()}-${index}`,type,title:file.name.replace(/\.[^.]+$/,''),caption:'',url:file.url,sourcePage:null,tags:[],uploadedCategory:category.label,isPrimary:(type==='report'||type==='hero')&&index===0,isSelectedForGallery:['hero','plan','section','diagram','render','photo'].includes(type)}}))
 const startOrganising=()=>{setProcessIndex(0);setStage('context');window.scrollTo({top:0,behavior:'smooth'})}
 const saveTeamInput=(key:keyof TeamInput,value:string)=>setTeamInput(current=>{const next={...current,[key]:value};localStorage.setItem(teamInputStorageKey,JSON.stringify(next));return next})
 const createProject=()=>{const projectAssets=assets();const coverImage=projectAssets.find(asset=>asset.type==='hero')?.url||FALLBACK_PROJECT_IMAGE;const id=`imported-project-${Date.now().toString().slice(-6)}`;const project:Project=stormbringerDemo?createStormbringerDemoProject({id,assets:projectAssets,coverImage}):{id,projectName:'',company:'',location:'',sector:'',year:'',client:'',status:'',visibility:'private',siteArea:'',gfa:'',height:'',services:[],team:[],story:{brief:'',challenge:teamInput.challengeOpportunity,response:teamInput.teamResponse,outcome:'',lessons:teamInput.futureRelevance},knowledge:{facts:[],teamInput,draft:[]},assets:projectAssets,tags:[],coverImage};addProject(project);localStorage.removeItem(teamInputStorageKey);navigate(`/projects/${id}?tab=knowledge`)}
 const fileCount=Object.values(uploads).flat().length
 return <div className="reflection-page"><button onClick={()=>stage==='upload'?navigate('/new-project'):setStage('upload')} className="detail-back"><ArrowLeft size={16}/> {stage==='upload'?'Back to new project':'Back to uploads'}</button><header className="reflection-heading"><p className="eyebrow">Import Project</p><h1>{stage==='upload'?'Classify the project material.':'Tell Folion what mattered.'}</h1><p className="creation-flow-intro">{stage==='upload'?'Add the material you have. One report, one image or a broader set of files are all valid starting points.':'While Folion organises the uploaded material, add only the context the team believes will matter later.'}</p></header>
 {stage==='upload'&&<><section className="asset-upload-intro"><div><FileUp/><div><h2>Upload files by category</h2><p>Classification preserves what each asset is and how it may support project knowledge.</p></div></div><button onClick={addStormbringerDemo}>Use Stormbringer demo files</button></section><section className="upload-categories">{categories.map(({type,label,description,accept,icon:Icon})=>{const files=uploads[type]||[];return <article key={type}><div className="upload-category-head"><span><Icon/></span></div><h3>{label}</h3><p>{description}</p><label><input type="file" multiple accept={accept} onChange={chooseFiles(type)}/><FileUp/> Add files</label>{files.length>0&&<div className="category-files">{files.map((file,index)=><span key={`${file.name}-${index}`}><Check/>{file.name}</span>)}</div>}</article>})}</section><div className="upload-actions"><p>{fileCount?`${fileCount} categorized ${fileCount===1?'file':'files'} selected`:'Continue with the material available now.'}</p><Button onClick={startOrganising}>Organise project <ArrowRight size={16}/></Button></div></>}
 {stage==='context'&&<div className="team-context-stage"><aside className="context-processing" aria-live="polite"><Sparkles/><p className="eyebrow">Organising locally</p><div className="processing-list">{activeSteps.map((step,index)=><span key={step} className={index<processIndex?'done':index===processIndex?'active':''}><i>{index<processIndex?<Check/>:index+1}</i>{step}</span>)}</div><small>{stormbringerDemo?'Controlled Stormbringer demo extraction is active for this prototype.':'No document extraction runs locally; facts remain blank until entered or reviewed.'}</small></aside><section className="team-context-editor"><p className="team-input-label">Optional · Team input</p><p className="team-context-note">Answer one, two, all or none. Your words autosave locally and remain clearly labelled as Team input.</p>{questions.map(question=><label key={question.key}><span>{question.label}</span><strong>{question.prompt}</strong><textarea value={teamInput[question.key]} onChange={event=>saveTeamInput(question.key,event.target.value)} placeholder="Write in the team’s own words, or leave blank."/><small>Autosaved locally</small></label>)}<div className="context-actions"><p>This step never blocks project creation.</p><Button onClick={createProject}>Create project <ArrowRight size={16}/></Button></div></section></div>}
 </div>
}
