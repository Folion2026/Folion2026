import {FileText,Image as ImageIcon} from 'lucide-react'
import {useEffect,useMemo,useState} from 'react'
import {FALLBACK_PROJECT_IMAGE,normalizeProject} from '../lib/project'
import {Asset,Project} from '../types'

const imageTypes=new Set(['hero','plan','section','diagram','render','photo'])
const assetLabel=(asset:Asset)=>asset.uploadedCategory||asset.type||'Asset'

export default function ProjectGallery({project,mode='overview'}:{project?:Project|null;mode?:'overview'|'sources'}){
 const safe=normalizeProject(project)
 const assets=useMemo(()=>safe?.assets||[],[safe])
 const visible=mode==='overview'?assets.filter(asset=>asset.isSelectedForGallery):assets
 const initial=visible.find(asset=>asset.isPrimary)||visible[0]
 const [selectedId,setSelectedId]=useState(initial?.id||'cover')
 useEffect(()=>setSelectedId(initial?.id||'cover'),[safe?.id,initial?.id])
 if(!safe)return null
 const selected=visible.find(asset=>asset.id===selectedId)||initial
 const displayUrl=selected?.url||(!selected||imageTypes.has(selected.type)?safe.coverImage:'')
 const groups=mode==='sources'?Array.from(new Set(visible.map(asset=>assetLabel(asset)))):[]
 return <section className={`project-asset-viewer ${mode==='sources'?'source-assets':''}`}>
  {mode==='sources'&&<div className="project-gallery-heading"><div><p className="eyebrow">Uploaded assets</p><h2 className="section-title mt-2">Source viewer</h2></div><span>{visible.length} {visible.length===1?'asset':'assets'}</span></div>}
  <div className="asset-viewer-stage">{displayUrl&&(!selected||imageTypes.has(selected.type))?<img src={displayUrl||FALLBACK_PROJECT_IMAGE} onError={event=>{event.currentTarget.src=FALLBACK_PROJECT_IMAGE}} alt={selected?.title||safe.projectName}/>:<div className="source-document-placeholder"><FileText/><span>{selected?assetLabel(selected):'Source document'}</span><strong>{selected?.title||'No source asset selected'}</strong>{selected?.caption&&<p>{selected.caption}</p>}</div>}<div className="asset-viewer-caption"><span>{selected?assetLabel(selected):'Primary image'}</span><strong>{selected?.title||safe.projectName}</strong></div></div>
  {visible.length>0&&<div className="asset-strip" aria-label={mode==='sources'?'Source assets':'Project assets'}>{visible.map(asset=><button key={asset.id} className={asset.id===selected?.id?'active':''} onClick={()=>setSelectedId(asset.id)} aria-label={`View ${asset.title}`} aria-pressed={asset.id===selected?.id}>{asset.url&&imageTypes.has(asset.type)?<img src={asset.url} onError={event=>{event.currentTarget.src=FALLBACK_PROJECT_IMAGE}} alt=""/>:<span><FileText/></span>}<small>{asset.title||'Untitled asset'}</small></button>)}</div>}
  {mode==='sources'&&groups.length>0&&<div className="source-category-summary">{groups.map(group=><span key={group}><ImageIcon/>{group}<strong>{visible.filter(asset=>assetLabel(asset)===group).length}</strong></span>)}</div>}
 </section>
}
