import {FolderPlus} from 'lucide-react'
import {useMemo,useState} from 'react'
import CollectionCard from '../components/CollectionCard'
import CollectionForm,{CollectionDraft} from '../components/CollectionForm'
import {Button,EmptyState,Modal} from '../components/ui'
import {useStore} from '../store'

export default function Collections(){
 const {collections,projects,createCollection,workspaceRole}=useStore(),[query,setQuery]=useState(''),[open,setOpen]=useState(false)
 const results=useMemo(()=>collections.filter(item=>[item.name,item.brief,item.description,item.keywords].join(' ').toLowerCase().includes(query.trim().toLowerCase())),[collections,query])
 const save=async(value:CollectionDraft)=>{await createCollection(value)}
 return <div><header className="projects-header"><div><p className="eyebrow">Curated portfolios</p><h1 className="page-title mt-2">Collections</h1><p className="projects-intro">Saved, ordered groups of original project records with an editable narrative.</p></div>{workspaceRole!=='viewer'&&<Button onClick={()=>setOpen(true)}><FolderPlus size={17}/> New Collection</Button>}</header>
  <section className="projects-search-panel"><label className="label">Search collections<input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search title, brief, theme or keywords"/></label></section>
  {results.length?<div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 mt-8">{results.map(item=><CollectionCard key={item.id} collection={item} projects={projects}/>)}</div>:<EmptyState title="No collections found" body={query?'Try a broader search.':'Create a collection to curate and order existing projects.'}/>}<Modal open={open} onClose={()=>setOpen(false)} title="Create Collection"><CollectionForm projects={projects} onSave={save} onCancel={()=>setOpen(false)}/></Modal>
 </div>
}
