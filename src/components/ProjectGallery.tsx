import {FileText,Image as ImageIcon} from 'lucide-react'
import {PointerEvent as ReactPointerEvent,useCallback,useEffect,useMemo,useRef,useState} from 'react'
import {FALLBACK_PROJECT_IMAGE,normalizeProject} from '../lib/project'
import {Asset,Project} from '../types'

const imageTypes=new Set(['hero','plan','section','diagram','render','photo'])
const assetLabel=(asset:Asset)=>asset.uploadedCategory||asset.type||'Asset'
const imageExtension=/\.(?:avif|gif|jpe?g|png|svg|webp)(?:$|[?#])/i
const isImageAsset=(asset?:Asset)=>!asset||imageTypes.has(asset.type)||Boolean(asset.mimeType?.startsWith('image/'))||imageExtension.test(asset.fileName||asset.url||asset.title)
type ViewMode='fit'|'fill'
type Point={x:number;y:number}

export default function ProjectGallery({project,mode='overview'}:{project?:Project|null;mode?:'overview'|'sources'}){
 const safe=normalizeProject(project)
 const assets=useMemo(()=>safe?.assets||[],[safe])
 const visible=mode==='overview'?assets.filter(asset=>asset.isSelectedForGallery):assets
 const initial=visible.find(asset=>asset.isPrimary)||visible[0]
 const [selectedId,setSelectedId]=useState(initial?.id||'cover')
 const [viewMode,setViewMode]=useState<ViewMode>('fit')
 const [zoom,setZoom]=useState(1)
 const [offset,setOffset]=useState<Point>({x:0,y:0})
 const [dragging,setDragging]=useState(false)
 const stageRef=useRef<HTMLDivElement>(null);const imageRef=useRef<HTMLImageElement>(null);const dragRef=useRef<{pointerId:number;start:Point;origin:Point}|null>(null)
 useEffect(()=>setSelectedId(initial?.id||'cover'),[safe?.id,initial?.id])
 const resetView=useCallback(()=>{setViewMode('fit');setZoom(1);setOffset({x:0,y:0});setDragging(false);dragRef.current=null},[])
 useEffect(()=>resetView(),[selectedId,resetView])
 const selected=visible.find(asset=>asset.id===selectedId)||initial
 const displayUrl=selected?.url||(!selected||imageTypes.has(selected.type)?safe?.coverImage||'':'')
 const showingImage=Boolean(displayUrl&&isImageAsset(selected))
 const constrain=useCallback((point:Point,nextZoom=zoom,nextMode=viewMode)=>{const stage=stageRef.current;const image=imageRef.current;if(!stage||!image||!image.naturalWidth||!image.naturalHeight)return{x:0,y:0};const {width,height}=stage.getBoundingClientRect();const base=nextMode==='fit'?Math.min(width/image.naturalWidth,height/image.naturalHeight):Math.max(width/image.naturalWidth,height/image.naturalHeight);const maxX=Math.max(0,(image.naturalWidth*base*nextZoom-width)/2);const maxY=Math.max(0,(image.naturalHeight*base*nextZoom-height)/2);return{x:Math.max(-maxX,Math.min(maxX,point.x)),y:Math.max(-maxY,Math.min(maxY,point.y))}},[viewMode,zoom])
 useEffect(()=>{const onResize=()=>setOffset(current=>constrain(current));window.addEventListener('resize',onResize);return()=>window.removeEventListener('resize',onResize)},[constrain])
 const chooseMode=(mode:ViewMode)=>{setViewMode(mode);setZoom(1);setOffset({x:0,y:0})}
 const changeZoom=(delta:number)=>{const next=Math.max(1,Math.min(4,Number((zoom+delta).toFixed(2))));setZoom(next);setOffset(point=>constrain(point,next,viewMode))}
 const canPan=showingImage&&(zoom>1||viewMode==='fill')
 const startPan=(event:ReactPointerEvent<HTMLImageElement>)=>{if(!canPan)return;event.currentTarget.setPointerCapture(event.pointerId);dragRef.current={pointerId:event.pointerId,start:{x:event.clientX,y:event.clientY},origin:offset};setDragging(true)}
 const movePan=(event:ReactPointerEvent<HTMLImageElement>)=>{const drag=dragRef.current;if(!drag||drag.pointerId!==event.pointerId)return;setOffset(constrain({x:drag.origin.x+event.clientX-drag.start.x,y:drag.origin.y+event.clientY-drag.start.y}))}
 const endPan=(event:ReactPointerEvent<HTMLImageElement>)=>{if(dragRef.current?.pointerId!==event.pointerId)return;dragRef.current=null;setDragging(false);if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId)}
 if(!safe)return null
 const groups=mode==='sources'?Array.from(new Set(visible.map(asset=>assetLabel(asset)))):[]
 return <section className={`project-asset-viewer ${mode==='sources'?'source-assets':''}`}>
  {mode==='sources'&&<div className="project-gallery-heading"><div><p className="eyebrow">Uploaded assets</p><h2 className="section-title mt-2">Source viewer</h2></div><span>{visible.length} {visible.length===1?'asset':'assets'}</span></div>}
  <div ref={stageRef} className="asset-viewer-stage">{showingImage?<><img ref={imageRef} className={canPan?(dragging?'is-dragging':'is-pannable'):''} src={displayUrl||FALLBACK_PROJECT_IMAGE} style={{objectFit:viewMode==='fit'?'contain':'cover',transform:`translate3d(${offset.x}px, ${offset.y}px, 0) scale(${zoom})`}} onLoad={()=>setOffset(current=>constrain(current))} onError={event=>{event.currentTarget.src=FALLBACK_PROJECT_IMAGE}} onPointerDown={startPan} onPointerMove={movePan} onPointerUp={endPan} onPointerCancel={endPan} alt={selected?.title||safe.projectName}/><div className="asset-viewer-controls" aria-label="Image view controls"><button className={viewMode==='fit'?'active':''} onClick={()=>chooseMode('fit')} aria-pressed={viewMode==='fit'}>Fit</button><button className={viewMode==='fill'?'active':''} onClick={()=>chooseMode('fill')} aria-pressed={viewMode==='fill'}>Fill</button><button onClick={()=>changeZoom(-.25)} disabled={zoom<=1} aria-label="Zoom out" title="Zoom out">−</button><button onClick={()=>changeZoom(.25)} disabled={zoom>=4} aria-label="Zoom in" title="Zoom in">+</button><button onClick={resetView}>Reset</button></div></>:<div className="source-document-placeholder"><FileText/><span>{selected?assetLabel(selected):'Source document'}</span><strong>{selected?.title||'No source asset selected'}</strong>{selected?.caption&&<p>{selected.caption}</p>}</div>}<div className="asset-viewer-caption"><span>{selected?assetLabel(selected):'Primary image'}</span><strong>{selected?.title||safe.projectName}</strong></div></div>
  {visible.length>0&&<div className="asset-strip" aria-label={mode==='sources'?'Source assets':'Project assets'}>{visible.map(asset=><button key={asset.id} className={asset.id===selected?.id?'active':''} onClick={()=>setSelectedId(asset.id)} aria-label={`View ${asset.title}`} aria-pressed={asset.id===selected?.id}>{asset.url&&isImageAsset(asset)?<img src={asset.url} onError={event=>{event.currentTarget.src=FALLBACK_PROJECT_IMAGE}} alt=""/>:<span><FileText/></span>}<small>{asset.title||'Untitled asset'}</small></button>)}</div>}
  {mode==='sources'&&groups.length>0&&<div className="source-category-summary">{groups.map(group=><span key={group}><ImageIcon/>{group}<strong>{visible.filter(asset=>assetLabel(asset)===group).length}</strong></span>)}</div>}
 </section>
}
