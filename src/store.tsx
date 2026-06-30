import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,ReactNode} from 'react'
import seedProjects from './data/projects.json'
import seedPeople from './data/people.json'
import seedCollections from './data/collections.json'
import {Asset,Collection,Person,Project,Visibility} from './types'
import {normalizeProject,normalizeProjects} from './lib/project'
import {useAuth} from './auth'
import {apiRequest} from './lib/api'
import {supabase} from './lib/supabase'

type Workspace={id:string;name:string;slug:string}
type Bootstrap={workspace:Workspace;role:'owner'|'editor'|'viewer';projects:unknown[];people:Person[]}
type AssetUpload={asset:Asset;file:File}
type Store={projects:Project[];people:Person[];workspace:Workspace|null;workspaceRole:'owner'|'editor'|'viewer'|null;loading:boolean;error:string;collections:Collection[];selected:string[];toggleSelected:(id:string)=>void;clearSelected:()=>void;addPerson:(p:Omit<Person,'id'>)=>Promise<Person>;addProject:(p:Project,uploads?:AssetUpload[])=>Promise<void>;updateProject:(p:Project)=>void;archiveSelected:()=>void;setSelectedVisibility:(v:Visibility)=>void;createCollection:(name:string)=>Collection;renameCollection:(id:string,name:string)=>void;toggleProjectInCollection:(cid:string,pid:string)=>void;addSelectedToCollection:(cid:string)=>void;reload:()=>Promise<void>}
const Ctx=createContext<Store|null>(null)

export function StoreProvider({children}:{children:ReactNode}){
 const {session}=useAuth();const [projects,setProjects]=useState<Project[]>([]);const [people,setPeople]=useState<Person[]>([]);const [workspace,setWorkspace]=useState<Workspace|null>(null);const [workspaceRole,setWorkspaceRole]=useState<Store['workspaceRole']>(null);const [loading,setLoading]=useState(false);const [error,setError]=useState('');const [collections,setCollections]=useState<Collection[]>(seedCollections as Collection[]);const [selected,setSelected]=useState<string[]>([]);const timers=useRef<Record<string,ReturnType<typeof setTimeout>>>({})
 const applyBootstrap=useCallback((result:Bootstrap)=>{setWorkspace(result.workspace);setWorkspaceRole(result.role);setProjects(normalizeProjects(result.projects));setPeople(result.people||[])},[])
 const reload=useCallback(async()=>{if(!session){setProjects([]);setPeople([]);setWorkspace(null);setWorkspaceRole(null);return}setLoading(true);setError('');try{let result=await apiRequest<Bootstrap>(session,'/v1/bootstrap');if(!result.projects.length&&!result.people.length){await apiRequest(session,'/v1/bootstrap/seed',{method:'POST',body:JSON.stringify({projects:seedProjects,people:seedPeople})});result=await apiRequest<Bootstrap>(session,'/v1/bootstrap')}applyBootstrap(result)}catch(reason){setError(reason instanceof Error?reason.message:'Unable to load the Folion workspace')}finally{setLoading(false)}},[session,applyBootstrap])
 useEffect(()=>{void reload();return()=>Object.values(timers.current).forEach(clearTimeout)},[reload])
 const persist=useCallback(async(project:Project,method:'POST'|'PUT')=>{if(!session||!workspace)throw new Error('A workspace session is required');try{await apiRequest(session,method==='POST'?'/v1/projects':`/v1/projects/${encodeURIComponent(project.id)}`,{method,body:JSON.stringify({workspaceId:workspace.id,project})});setError('')}catch(reason){setError(reason instanceof Error?reason.message:'Unable to save the project');throw reason}},[session,workspace])
 const addPerson=useCallback(async(person:Omit<Person,'id'>)=>{if(!session)throw new Error('Sign in again to add a person');try{const result=await apiRequest<{person:Person;workspace:Workspace;role:Store['workspaceRole']}>(session,'/v1/people',{method:'POST',body:JSON.stringify({person})});setWorkspace(result.workspace);setWorkspaceRole(result.role);setPeople(current=>[...current.filter(item=>item.id!==result.person.id),result.person].sort((a,b)=>a.name.localeCompare(b.name)));setError('');return result.person}catch(reason){setError(reason instanceof Error?reason.message:'Unable to add the person');throw reason}},[session])
 const toggleSelected=(id:string)=>setSelected(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id])
 const clearSelected=()=>setSelected([])
 const addProject=async(project:Project,uploads:AssetUpload[]=[])=>{
  const safe=normalizeProject(project);if(!safe)return;setProjects(current=>[safe,...current.filter(item=>item.id!==safe.id)]);await persist(safe,'POST')
  if(!session||!workspace||!supabase||!uploads.length)return
  const storedPaths=new Map<string,string>()
  for(const upload of uploads){const signed=await apiRequest<{storagePath:string;token:string}>(session,`/v1/projects/${encodeURIComponent(safe.id)}/assets/upload-url`,{method:'POST',body:JSON.stringify({workspaceId:workspace.id,assetId:upload.asset.id,filename:upload.file.name})});const {error:uploadError}=await supabase.storage.from('project-assets').uploadToSignedUrl(signed.storagePath,signed.token,upload.file,{contentType:upload.file.type||undefined});if(uploadError)throw uploadError;await apiRequest(session,`/v1/projects/${encodeURIComponent(safe.id)}/assets`,{method:'POST',body:JSON.stringify({workspaceId:workspace.id,asset:upload.asset,storagePath:signed.storagePath})});storedPaths.set(upload.asset.id,signed.storagePath)}
  const storedProject={...safe,assets:safe.assets.map(asset=>storedPaths.has(asset.id)?{...asset,storagePath:storedPaths.get(asset.id)}:asset)};setProjects(current=>current.map(item=>item.id===storedProject.id?storedProject:item))
 }
 const updateProject=(project:Project)=>{const safe=normalizeProject(project);if(!safe)return;setProjects(current=>current.map(item=>item.id===safe.id?safe:item));if(timers.current[safe.id])clearTimeout(timers.current[safe.id]);timers.current[safe.id]=setTimeout(()=>void persist(safe,'PUT').catch(()=>undefined),500)}
 const archiveSelected=()=>{projects.filter(project=>selected.includes(project.id)).forEach(project=>updateProject({...project,status:'Archived'}));clearSelected()}
 const setSelectedVisibility=(visibility:Visibility)=>{projects.filter(project=>selected.includes(project.id)&&(visibility==='private'||project.confidentiality==='publicly-publishable')).forEach(project=>updateProject({...project,visibility}));clearSelected()}
 const createCollection=(name:string)=>{const collection={id:`collection-${Date.now()}`,name,description:'A curated project story.',projectIds:[]};setCollections(current=>[collection,...current]);return collection}
 const renameCollection=(id:string,name:string)=>setCollections(current=>current.map(collection=>collection.id===id?{...collection,name}:collection))
 const toggleProjectInCollection=(collectionId:string,projectId:string)=>setCollections(current=>current.map(collection=>collection.id===collectionId?{...collection,projectIds:collection.projectIds.includes(projectId)?collection.projectIds.filter(item=>item!==projectId):[...collection.projectIds,projectId]}:collection))
 const addSelectedToCollection=(collectionId:string)=>{setCollections(current=>current.map(collection=>collection.id===collectionId?{...collection,projectIds:Array.from(new Set([...collection.projectIds,...selected]))}:collection));clearSelected()}
 const value=useMemo(()=>({projects,people,workspace,workspaceRole,loading,error,collections,selected,toggleSelected,clearSelected,addPerson,addProject,updateProject,archiveSelected,setSelectedVisibility,createCollection,renameCollection,toggleProjectInCollection,addSelectedToCollection,reload}),[projects,people,workspace,workspaceRole,loading,error,collections,selected,reload,persist,addPerson])
 return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export const useStore=()=>{const value=useContext(Ctx);if(!value)throw new Error('Missing StoreProvider');return value}
