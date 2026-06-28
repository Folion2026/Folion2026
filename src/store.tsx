import {createContext,useContext,useMemo,useState,ReactNode} from 'react'
import seedProjects from './data/projects.json'
import seedCollections from './data/collections.json'
import {Collection,Project,Visibility} from './types'
import {normalizeProject,normalizeProjects} from './lib/project'

type Store={projects:Project[];collections:Collection[];selected:string[];toggleSelected:(id:string)=>void;clearSelected:()=>void;addProject:(p:Project)=>void;updateProject:(p:Project)=>void;archiveSelected:()=>void;setSelectedVisibility:(v:Visibility)=>void;createCollection:(name:string)=>Collection;renameCollection:(id:string,name:string)=>void;toggleProjectInCollection:(cid:string,pid:string)=>void;addSelectedToCollection:(cid:string)=>void}
const Ctx=createContext<Store|null>(null)
export function StoreProvider({children}:{children:ReactNode}){
 const [projects,setProjects]=useState<Project[]>(()=>normalizeProjects(seedProjects))
 const [collections,setCollections]=useState<Collection[]>(seedCollections as Collection[])
 const [selected,setSelected]=useState<string[]>([])
 const toggleSelected=(id:string)=>setSelected(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id])
 const clearSelected=()=>setSelected([])
 const addProject=(p:Project)=>setProjects(x=>{const safe=normalizeProject(p);return safe?[safe,...x]:x})
 const updateProject=(p:Project)=>setProjects(x=>{const safe=normalizeProject(p);return safe?x.map(v=>v.id===safe.id?safe:v):x})
 const archiveSelected=()=>{setProjects(x=>x.map(p=>selected.includes(p.id)?{...p,status:'Archived'}:p));clearSelected()}
 const setSelectedVisibility=(visibility:Visibility)=>{setProjects(x=>x.map(p=>selected.includes(p.id)?{...p,visibility}:p));clearSelected()}
 const createCollection=(name:string)=>{const c={id:`collection-${Date.now()}`,name,description:'A curated project story.',projectIds:[]};setCollections(x=>[c,...x]);return c}
 const renameCollection=(id:string,name:string)=>setCollections(x=>x.map(c=>c.id===id?{...c,name}:c))
 const toggleProjectInCollection=(cid:string,pid:string)=>setCollections(x=>x.map(c=>c.id===cid?{...c,projectIds:c.projectIds.includes(pid)?c.projectIds.filter(i=>i!==pid):[...c.projectIds,pid]}:c))
 const addSelectedToCollection=(cid:string)=>{setCollections(x=>x.map(c=>c.id===cid?{...c,projectIds:Array.from(new Set([...c.projectIds,...selected]))}:c));clearSelected()}
 const value=useMemo(()=>({projects,collections,selected,toggleSelected,clearSelected,addProject,updateProject,archiveSelected,setSelectedVisibility,createCollection,renameCollection,toggleProjectInCollection,addSelectedToCollection}),[projects,collections,selected])
 return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export const useStore=()=>{const v=useContext(Ctx);if(!v)throw new Error('Missing StoreProvider');return v}
