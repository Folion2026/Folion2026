import {ArrowRight,FileText,FolderOpen,Image as ImageIcon,Users} from 'lucide-react'
import {Link} from 'react-router-dom'
import PublicNav from '../components/PublicNav'

const logic=[
  ['Memory','Capture projects, people, reports, images and existing experience.'],
  ['Knowledge','Structure approved facts, narrative, outcomes, sources and roles.'],
  ['Intelligence','Find, understand and rank the experience relevant to the moment.'],
  ['Output','Create Project Sheets, Collections, CVs, Tenders and Pitches.'],
]

export default function Landing(){return <div className="marketing-page">
  <PublicNav overlay/>
  <main>
    <section className="brand-hero">
      <img src="/projects/stormbringer/cover.jpg" alt="Architectural project"/>
      <div className="brand-hero-shade"/><div className="folion-cropmark" aria-hidden="true">F</div>
      <div className="brand-hero-content"><p className="marketing-kicker">Practice Intelligence for Design Firms</p><h1>Build your firm's memory.</h1><p>Your best projects, people and experience already exist. Folion turns them into knowledge your practice can find, trust and use.</p><div className="marketing-actions"><Link className="marketing-primary" to="/product">See Folion in action <ArrowRight/></Link><Link className="marketing-secondary light" to="/how-it-works">Explore how it works</Link></div></div>
    </section>

    <section className="marketing-section problem-section"><div><p className="marketing-index">01 / The opportunity</p><h2>Your practice already knows more than you think.</h2></div><div><p>Knowledge is scattered across CVs, reports, project sheets, folders and people's memories.</p><h3>Folion makes it usable.</h3><div className="knowledge-transform"><div className="source-fragments"><span><FileText/> CV</span><span><FolderOpen/> Reports</span><span><ImageIcon/> Images</span><span><Users/> People</span></div><ArrowRight className="transform-arrow"/><div className="structured-record"><small>Approved project record</small><strong>One reliable source of practice knowledge.</strong><i/></div></div></div></section>

    <section className="marketing-section logic-section"><p className="marketing-index">02 / Product logic</p><h2>Memory <em>→</em> Knowledge <em>→</em> Intelligence <em>→</em> Output</h2><div className="logic-grid">{logic.map(([title,body],index)=><article key={title}><span>0{index+1}</span><h3>{title}</h3><p>{body}</p></article>)}</div></section>

    <section className="marketing-section studio-teaser"><div><p className="marketing-index">03 / Studio</p><h2>Turn practice intelligence into finished work.</h2><p>Approved knowledge becomes precise, polished material without losing its source or inventing experience.</p><Link className="marketing-text-link" to="/studio-product">Explore Studio <ArrowRight/></Link></div><div className="output-stack"><article><span>Project Sheet</span><strong>A one-page project story.</strong></article><article><span>Collection</span><strong>Relevant projects, curated with purpose.</strong></article><article><span>CV · Tender · Pitch</span><strong>Confirmed experience, assembled for the opportunity.</strong></article></div></section>

    <section className="network-teaser"><div className="network-signal">Future layer</div><p className="marketing-index">04 / Network</p><h2>From practice memory to shared project knowledge.</h2><p>Folion begins inside your practice and grows into a project-driven knowledge network for the built environment.</p><div className="network-list"><span>Public firm profiles</span><span>Public project pages</span><span>Project discovery</span><span>Follow practices</span><span>Collections</span></div><Link className="marketing-text-link light" to="/network">Explore the future Network <ArrowRight/></Link></section>

    <section className="closing-statement"><p>Your practice already knows more than you think.</p><h2>Build your firm's memory.</h2><Link className="marketing-primary" to="/sign-in">Request access <ArrowRight/></Link></section>
  </main>
  <footer className="marketing-footer"><strong>FOLION</strong><span>Practice Intelligence for Design Firms</span><span>© 2026</span></footer>
</div>}
