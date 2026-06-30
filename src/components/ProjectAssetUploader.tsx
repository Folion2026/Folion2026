import {AlertCircle,Check,FileUp,Plus} from 'lucide-react'
import {ChangeEvent,useState} from 'react'
import {useStore} from '../store'
import {Asset,AssetType,Project} from '../types'
import {Button,Modal} from './ui'

const categories:{label:string;type:AssetType;accept:string;gallery:boolean}[]=[
 {label:'Hero image',type:'hero',accept:'image/jpeg,image/png,image/webp',gallery:true},
 {label:'Project image / photography',type:'photo',accept:'image/jpeg,image/png,image/webp',gallery:true},
 {label:'Render',type:'render',accept:'image/jpeg,image/png,image/webp',gallery:true},
 {label:'Drawing / plan / diagram',type:'diagram',accept:'image/*,.pdf',gallery:true},
 {label:'Report / document',type:'report',accept:'.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx',gallery:false},
 {label:'Reference / internal material',type:'other',accept:'*/*',gallery:false},
]
type FileStatus='queued'|'uploading'|'done'|'error'

export default function ProjectAssetUploader({project}:{project:Project}){
 const {workspaceRole,uploadProjectAssets}=useStore();const [open,setOpen]=useState(false);const [categoryIndex,setCategoryIndex]=useState(0);const [files,setFiles]=useState<File[]>([]);const [statuses,setStatuses]=useState<FileStatus[]>([]);const [uploading,setUploading]=useState(false);const [message,setMessage]=useState('');const [error,setError]=useState('')
 if(workspaceRole==='viewer')return null
 const category=categories[categoryIndex]
 const chooseFiles=(event:ChangeEvent<HTMLInputElement>)=>{const selected=Array.from(event.target.files||[]);setFiles(selected);setStatuses(selected.map(()=>'queued'));setMessage('');setError('');event.target.value=''}
 const close=()=>{if(uploading)return;setOpen(false);setFiles([]);setStatuses([]);setMessage('');setError('')}
 const upload=async()=>{if(!files.length)return;setUploading(true);setMessage('');setError('');setStatuses(files.map(()=>'queued'));const batch=files.map((file,index)=>{const asset:Asset={id:`asset-${Date.now()}-${index}-${Math.random().toString(36).slice(2,8)}`,type:category.type,title:file.name,caption:'',url:'',fileName:file.name,mimeType:file.type,fileSize:file.size,sourcePage:null,tags:[],uploadedCategory:category.label,isPrimary:category.type==='hero'&&index===0,isSelectedForGallery:category.gallery};return{asset,file}});try{await uploadProjectAssets(project.id,batch,(index,status)=>setStatuses(current=>current.map((value,itemIndex)=>itemIndex===index?status:value)));setMessage(`${files.length} ${files.length===1?'asset':'assets'} added to ${project.projectName}.`)}catch(reason){setError(reason instanceof Error?reason.message:'Unable to upload the selected assets')}finally{setUploading(false)}}
 const completed=statuses.filter(status=>status==='done').length
 return <div className="flex justify-end mb-4"><Button variant="ghost" onClick={()=>setOpen(true)}><Plus size={16}/> Add assets</Button><Modal open={open} onClose={close} title="Add assets"><div className="space-y-5"><label className="label">Asset category<select value={categoryIndex} onChange={event=>{setCategoryIndex(Number(event.target.value));setFiles([]);setStatuses([]);setMessage('');setError('')}}>{categories.map((item,index)=><option key={item.label} value={index}>{item.label}</option>)}</select></label><label className="label">Files<input type="file" multiple accept={category.accept} onChange={chooseFiles}/><small>Select one or multiple files. They remain private to this workspace.</small></label>{files.length>0&&<div className="space-y-2">{files.map((file,index)=><div key={`${file.name}-${index}`} className="flex items-center justify-between rounded-xl bg-black/5 px-3 py-2 text-xs"><span>{file.name}</span><span className="flex items-center gap-1 text-black/45">{statuses[index]==='done'?<><Check size={13}/> Uploaded</>:statuses[index]==='error'?<><AlertCircle size={13}/> Failed</>:statuses[index]==='uploading'?<><FileUp size={13}/> Uploading</>:'Ready'}</span></div>)}</div>}{uploading&&<div aria-live="polite"><div className="h-1.5 overflow-hidden rounded-full bg-black/10"><div className="h-full bg-ink transition-all" style={{width:`${Math.max(8,completed/files.length*100)}%`}}/></div><p className="mt-2 text-xs text-black/45">Uploading {completed+1} of {files.length}</p></div>}{message&&<div className="auth-message" role="status">{message}</div>}{error&&<div className="auth-message error" role="alert">{error}</div>}<div className="flex justify-end gap-2"><Button variant="ghost" disabled={uploading} onClick={close}>{message?'Done':'Cancel'}</Button>{!message&&<Button disabled={uploading||!files.length} onClick={upload}>{uploading?'Uploading…':'Upload assets'}</Button>}</div></div></Modal></div>
}
