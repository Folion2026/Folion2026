import {FolderPlus,Globe2,Lock,Plus,Sparkles} from 'lucide-react'
import {useMemo,useState} from 'react'
import {Link} from 'react-router-dom'
import CollectionCard from '../components/CollectionCard'
import BottomSelectionBar from '../components/BottomSelectionBar'
import ProjectCard from '../components/ProjectCard'
import {FilterChips,SearchBar} from '../components/SearchAndFilters'
import {useStore} from '../store'
import {Button,EmptyState,Modal} from '../components/ui'
import {EMPTY_STORY,normalizeProjects} from '../lib/project'

const exampleQueries=['adaptive reuse','subtropical education','coastal residential']

export default function Projects(){
  const {projects,collections,createCollection}=useStore()
  const [query,setQuery]=useState('')
  const [filter,setFilter]=useState('All')
  const [collectionModal,setCollectionModal]=useState(false)
  const [collectionName,setCollectionName]=useState('')
  const activeProjects=normalizeProjects(projects).filter(project=>project.status!=='Archived')
  const publicCount=activeProjects.filter(project=>project.visibility==='public').length
  const privateCount=activeProjects.filter(project=>project.visibility==='private').length
  const isExploring=Boolean(query.trim())||filter!=='All'

  const results=useMemo(()=>activeProjects.filter(project=>{
    const searchable=[project.projectName,project.sector,project.location,project.company,project.client,project.status,project.tags||[],project.services||[],Object.values(project.story||EMPTY_STORY),Object.values(project.reflection||{})].flat().join(' ').toLowerCase()
    const searchTerms=query.toLowerCase().trim().split(/\s+/).filter(Boolean)
    const matchesSearch=searchTerms.every(term=>searchable.includes(term))
    const matchesFilter=filter==='All'||(filter==='Public'&&project.visibility==='public')||(filter==='Private'&&project.visibility==='private')||project.sector===filter
    return matchesSearch&&matchesFilter
  }),[activeProjects,query,filter])

  const resetSearch=()=>{setQuery('');setFilter('All')}
  const create=()=>{if(!collectionName.trim())return;createCollection(collectionName.trim());setCollectionName('');setCollectionModal(false)}

  return <div>
    <header className="projects-header">
      <div><p className="eyebrow">Project memory</p><h1 className="page-title mt-2">Find what the practice knows.</h1><p className="projects-intro">Search the facts, stories, services and lessons inside every Fieldwork project.</p></div>
      <Link to="/new-project"><Button><Plus size={17}/> New project</Button></Link>
    </header>

    <section className="projects-search-panel">
      <div className="flex items-center gap-2 mb-3 text-[10px] uppercase tracking-[.16em] text-black/40"><Sparkles size={13}/> Ask Folion</div>
      <SearchBar value={query} onChange={setQuery}/>
      <div className="search-panel-footer"><FilterChips active={filter} onChange={setFilter}/><div className="visibility-tally"><span><Globe2/> {publicCount} public</span><span><Lock/> {privateCount} private</span></div></div>
      {!query&&<div className="example-queries"><span>Try</span>{exampleQueries.map(example=><button key={example} onClick={()=>setQuery(example)}>“{example}”</button>)}</div>}
      {query&&<div className="search-summary"><span>Found <strong>{results.length}</strong> project{results.length!==1?'s':''} matching “{query}” across facts and story text.</span><button onClick={resetSearch}>Clear search</button></div>}
    </section>

    {!isExploring&&<section className="workspace-section"><div className="workspace-heading"><div><p className="eyebrow">Curated portfolios</p><h2 className="section-title mt-2">Collections</h2><p>Reusable groups of projects for sectors, ideas and opportunities.</p></div><Button variant="ghost" onClick={()=>setCollectionModal(true)}><FolderPlus size={17}/> Create collection</Button></div><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5 mt-6">{collections.map(collection=><CollectionCard key={collection.id} collection={collection} projects={projects}/>)}</div></section>}

    <section className="workspace-section"><div className="workspace-heading"><div><p className="eyebrow">{isExploring?'Ask Folion':'Workspace'}</p><h2 className="section-title mt-2">{isExploring?'Project matches':'All projects'}</h2><p>{isExploring?'Select a project, refine the search, or open its full memory.':'Select cards to curate, change visibility or archive work.'}</p></div><span className="project-count">{results.length} project{results.length!==1?'s':''}</span></div>{results.length?<div className="projects-grid">{results.map(project=><ProjectCard key={project.id} project={project}/>)}</div>:<EmptyState title="No project memory found" body="Try a broader phrase, another place, or a project service." action={<Button variant="ghost" onClick={resetSearch}>Reset search</Button>}/>}</section>

    <BottomSelectionBar/>
    <Modal open={collectionModal} onClose={()=>setCollectionModal(false)} title="Create a collection"><p className="text-sm text-black/50 -mt-2 mb-6">Start with a name. You can add projects from the workspace next.</p><label className="label">Collection name<input autoFocus value={collectionName} onChange={event=>setCollectionName(event.target.value)} onKeyDown={event=>event.key==='Enter'&&create()} placeholder="e.g. Civic life"/></label><div className="flex justify-end gap-2 mt-6"><Button variant="ghost" onClick={()=>setCollectionModal(false)}>Cancel</Button><Button disabled={!collectionName.trim()} onClick={create}>Create collection</Button></div></Modal>
  </div>
}
