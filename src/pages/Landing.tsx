import {ArrowRight,ArrowUpRight,BookOpen,Check,FolderPlus,Layers3,Search,Sparkles} from 'lucide-react'
import {useState} from 'react'
import {Link} from 'react-router-dom'
import FolionLogo from '../components/FolionLogo'
import {Button} from '../components/ui'
import projects from '../data/projects.json'
import {FALLBACK_PROJECT_IMAGE,normalizeProject,normalizeProjects} from '../lib/project'

const safeProjects=normalizeProjects(projects)

const capabilities=[
  {icon:Search,title:'Find the thinking',body:'Search across projects, stories, sectors, materials and people in natural language.'},
  {icon:Layers3,title:'Curate with intent',body:'Turn the right projects into living collections for sectors, ideas or opportunities.'},
  {icon:Sparkles,title:'Make something new',body:'Generate a capability statement from the evidence already inside your practice.'},
  {icon:BookOpen,title:'Share your work',body:'Publish selected projects into a generous public library of design practice.'},
]

const steps=[
  {number:'01',title:'Capture the whole story',body:'Bring project facts, people, decisions, outcomes and lessons into one clear project memory.'},
  {number:'02',title:'Find it when it matters',body:'Ask Folion in everyday language and search across what your practice has already learned.'},
  {number:'03',title:'Put memory back to work',body:'Curate collections and turn relevant work into capability statements, submissions and stories.'},
]

function SearchDemo(){
  const [active,setActive]=useState(0)
  const examples=[
    {query:'subtropical education projects',result:safeProjects[2]||safeProjects[0]||normalizeProject({})!},
    {query:'adaptive reuse and heritage',result:safeProjects[1]||safeProjects[0]||normalizeProject({})!},
    {query:'coastal residential work',result:safeProjects[0]||normalizeProject({})!},
  ]
  const example=examples[active]
  return <div className="memory-demo">
    <div className="memory-demo-bar"><span/><span/><span/><strong>Ask Folion</strong></div>
    <div className="memory-demo-body">
      <p className="eyebrow">Search your project memory</p>
      <div className="memory-query"><Search size={19}/><span>{example.query}</span><kbd>↵</kbd></div>
      <div className="flex flex-wrap gap-2 mt-3">{examples.map((item,index)=><button key={item.query} onClick={()=>setActive(index)} className={`demo-query-chip ${active===index?'active':''}`}>{item.query}</button>)}</div>
      <div className="memory-result">
        <img src={example.result?.coverImage||FALLBACK_PROJECT_IMAGE} onError={event=>{event.currentTarget.src=FALLBACK_PROJECT_IMAGE}} alt=""/>
        <div className="flex-1 min-w-0"><span className="text-[10px] uppercase tracking-wider text-black/35">Best project match</span><h3>{example.result?.projectName||'Project unavailable'}</h3><p>{example.result?.sector||'Uncategorised'} · {example.result?.location||'Location not recorded'} · {example.result?.year||'—'}</p><div className="mt-4 flex flex-wrap gap-1.5">{(example.result?.tags||[]).slice(0,3).map(tag=><span key={tag}>{tag}</span>)}</div></div>
        <ArrowUpRight className="shrink-0" size={19}/>
      </div>
    </div>
  </div>
}

export default function Landing(){
  const featured=safeProjects[0]||normalizeProject({})!
  return <div className="landing">
    <header className="landing-nav">
      <FolionLogo/>
      <nav className="hidden md:flex gap-7 text-sm"><a href="#memory">How it works</a><a href="#project-memory">Project memory</a><Link to="/magazine">Magazine</Link></nav>
      <Link to="/sign-in"><Button variant="light">Sign in <ArrowRight size={16}/></Button></Link>
    </header>
    <main>
      <section className="hero-landing">
        <div className="hero-grid-lines"/>
        <div className="max-w-5xl relative z-10">
          <p className="eyebrow text-white/55 mb-6">A collective memory for design practices</p>
          <h1>Build your firm's memory.</h1>
          <p className="hero-copy">Folion turns the work your practice has already done into knowledge your whole team can find, shape and use again.</p>
          <div className="mt-9 flex flex-wrap gap-3"><Link to="/sign-in"><Button variant="acid">Sign in to Folion <ArrowRight size={17}/></Button></Link><a href="#memory"><Button variant="light">See how it works</Button></a></div>
        </div>
        <div className="hero-index"><span>Projects</span><span>People</span><span>Stories</span><strong>Remembered →</strong></div>
        <div className="hero-scroll">Scroll to remember <span>↓</span></div>
      </section>

      <section id="memory" className="landing-section">
        <div className="grid lg:grid-cols-[.78fr_1.22fr] gap-14 xl:gap-24">
          <div className="lg:sticky lg:top-28 self-start"><p className="eyebrow">Memory, made useful</p><h2 className="landing-h2">Your archive should do more than sit there.</h2><p className="mt-7 max-w-md text-lg leading-relaxed text-black/50">The best work in a practice is often trapped in folders, old submissions and the memories of busy people. Folion gives it a place to live.</p></div>
          <div className="capability-grid">{capabilities.map(({icon:Icon,title,body},index)=><article key={title}><div className="flex justify-between items-start"><Icon size={23}/><span>0{index+1}</span></div><h3>{title}</h3><p>{body}</p></article>)}</div>
        </div>
      </section>

      <section className="demo-section"><div className="demo-copy"><p className="eyebrow text-white/50">Ask Folion</p><h2>Find the precedent hiding in plain sight.</h2><p>Search facts and project stories together. A place, material, lesson or half-remembered idea can become the beginning of the right shortlist.</p><ul><li><Check/>Natural-language-style search</li><li><Check/>Results grounded in your project JSON</li><li><Check/>No scores, black boxes or dashboard theatre</li></ul></div><SearchDemo/></section>

      <section id="project-memory" className="project-memory-feature">
        <div className="project-feature-image"><img src={featured?.coverImage||FALLBACK_PROJECT_IMAGE} onError={event=>{event.currentTarget.src=FALLBACK_PROJECT_IMAGE}} alt={`${featured?.projectName||'Project'}, ${featured?.location||''}`}/><span className="image-overlay"/><div className="project-feature-label"><span>Project memory 01</span><strong>{featured?.projectName||'Project unavailable'}</strong></div></div>
        <div className="project-feature-copy"><p className="eyebrow">Not just what you made</p><h2>Remember why it mattered.</h2><p>{featured?.story?.brief||'Project story not recorded yet.'}</p><blockquote>“{featured?.story?.lessons||'Lessons are still being captured.'}”</blockquote><div className="project-fact-row"><span><small>Place</small>{featured?.location||'—'}</span><span><small>Sector</small>{featured?.sector||'—'}</span><span><small>Year</small>{featured?.year||'—'}</span></div>{featured?.id&&<Link to={`/projects/${featured.id}`} className="inline-flex items-center gap-2 text-sm font-medium mt-9 border-b border-black pb-1">Open the full story <ArrowUpRight size={16}/></Link>}</div>
      </section>

      <section className="landing-section"><div className="flex flex-col md:flex-row justify-between md:items-end gap-6"><div><p className="eyebrow">A simple rhythm</p><h2 className="landing-h2 max-w-2xl">Capture. Find. Reuse.</h2></div><Link to="/projects"><Button variant="ghost">Explore projects <ArrowRight size={16}/></Button></Link></div><div className="steps-grid">{steps.map(step=><article key={step.number}><span>{step.number}</span><h3>{step.title}</h3><p>{step.body}</p></article>)}</div></section>

      <section id="about" className="landing-cta"><div><p className="eyebrow text-white/45">Your practice already knows more than it can find.</p><h2>Bring the memory together.</h2></div><div><p>Start with four projects. Search the stories. Build one useful collection. That is enough to learn what Folion can become for your practice.</p><Link to="/sign-in"><Button variant="acid">Sign in to Folion <ArrowRight size={17}/></Button></Link></div><FolderPlus className="cta-mark"/></section>
    </main>
    <footer className="landing-footer"><div><FolionLogo/><p>A working prototype for better practice memory.</p></div><div><Link to="/sign-in">Sign in</Link><Link to="/magazine">Magazine</Link><a href="#memory">How it works</a></div><span>Folion · 2026</span></footer>
  </div>
}
