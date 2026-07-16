import {ArrowRight,Check,Compass,FileCheck2,FileText,FolderKanban,Layers3,Map,Search,ShieldCheck,Users} from 'lucide-react'
import {Link} from 'react-router-dom'
import PublicNav from '../components/PublicNav'

const productAreas=[
  [FolderKanban,'Project Deck',"The firm's projects in one intelligent visual archive."],
  [Users,'People','Professional profiles linked to confirmed project roles.'],
  [Layers3,'Knowledge','Facts, narratives, challenges, opportunities, outcomes and sources.'],
  [Search,'Ask Folion','Search and retrieve relevant practice experience.'],
  [ShieldCheck,'Review & Trust','Control what becomes approved knowledge.'],
] as const
const outputs=[
  ['Project Sheet','One-page project story communicating project impact.'],
  ['Collection','Curated project collections with narrative and purpose.'],
  ['CV Package','Role-based experience using confirmed person → project → role relationships.'],
  ['Tender Response','Tender-specific requirement matching against confirmed experience.'],
  ['Pitch Package','A visual narrative generated from a brief and ranked relevant projects.'],
]
const networkAreas=[
  [Compass,'Practice Profiles','A structured public Folion identity for a firm.'],
  [FileText,'Project Profiles','Public pages centred on complete projects and their knowledge.'],
  [Map,'City Discovery','Explore projects across cities, sectors and typologies.'],
  [FolderKanban,'Collections','Curate projects across firms, places and themes.'],
  [Check,'Following & Updates','Follow practices, cities and topics as new knowledge is published.'],
] as const

function Frame({children}:{children:React.ReactNode}){return <div className="marketing-page"><PublicNav/>{children}<footer className="marketing-footer"><strong>FOLION</strong><span>Practice Intelligence for Design Firms</span><span>© 2026</span></footer></div>}
function PageHero({label,title,body}:{label:string;title:React.ReactNode;body:string}){return <header className="secondary-hero"><p className="marketing-kicker">{label}</p><h1>{title}</h1><p>{body}</p></header>}

export function ProductMarketing(){return <Frame><main><PageHero label="Product" title={<>Your practice intelligence.<br/><em>Structured. Trusted. Usable.</em></>} body="Folion creates a reliable intelligence layer across the work, people and experience your practice has already created."/><section className="marketing-section product-showcase"><div className="product-demo"><div className="demo-side"><strong>FOLION</strong><span className="active">Project Deck</span><span>People</span><span>Knowledge</span><span>Studio</span></div><div className="demo-main"><small>ASK FOLION</small><h3>Find what the practice knows.</h3><div className="demo-search"><Search/> Search projects, places, lessons and people</div><div className="demo-projects"><i/><i/><i/></div></div></div><div className="feature-list">{productAreas.map(([Icon,title,body],index)=><article key={title}><span>0{index+1}</span><Icon/><div><h2>{title}</h2><p>{body}</p></div></article>)}</div></section><TrustSection/></main></Frame>}

export function StudioMarketing(){return <Frame><main><PageHero label="Folion Studio" title={<>Turn practice intelligence<br/><em>into finished work.</em></>} body="A focused creative production environment where approved knowledge and selected imagery become polished, opportunity-ready material."/><section className="studio-marketing-preview"><div className="studio-preview-controls"><small>SOURCE</small><strong>Village of Bowral</strong><span>Approved project knowledge</span><span>Selected hero image</span><span>AP Studio brand kit</span></div><div className="studio-preview-page"><p>AP STUDIO · PROJECT SHEET</p><div className="studio-preview-image"/><h2>Village of Bowral</h2><p>A place-led project story assembled from approved facts, generated narrative and source-backed key focus.</p></div></section><section className="marketing-section"><p className="marketing-index">Source → Folion Intelligence → Finished Output</p><div className="output-grid">{outputs.map(([title,body],index)=><article key={title}><span>0{index+1}</span><h2>{title}</h2><p>{body}</p></article>)}</div></section></main></Frame>}

export function HowItWorksMarketing(){return <Frame><main><PageHero label="How it works" title={<>Memory becomes<br/><em>usable intelligence.</em></>} body="Folion turns fragmented practice information into trusted knowledge, retrieves what matters and assembles it into finished work."/><section className="transformation-sequence">{[
  ['A','Fragmented information','Structured knowledge','Reports, CVs, images and project files resolve into a clear, source-backed project record.'],
  ['B','Large project archive','Relevant ranked shortlist','Ask in natural language and reduce hundreds of records to the most relevant approved experience.'],
  ['C','Approved knowledge','Polished finished output','Create Project Sheets, CVs, Collections, Tenders and Pitches from knowledge the practice trusts.'],
].map(([key,from,to,body])=><article key={key}><span>{key}</span><div><small>FROM</small><h2>{from}</h2></div><ArrowRight/><div><small>TO</small><h2>{to}</h2><p>{body}</p></div></article>)}</section><TrustSection/></main></Frame>}

function TrustSection(){return <section className="trust-section"><p className="marketing-index">Source · Review · Trust</p><h2>Intelligence without invention.</h2><div>{[['Source','Know where information came from.'],['Review','Your team controls what becomes approved knowledge.'],['Trust','Folion uses confirmed experience. No invented claims.']].map(([title,body])=><article key={title}><FileCheck2/><h3>{title}</h3><p>{body}</p></article>)}</div></section>}

export function NetworkMarketing(){return <Frame><main><PageHero label="Folion Network · Future layer" title={<>A living project knowledge network<br/><em>for the built environment.</em></>} body="Private practice intelligence can become selected public project knowledge: discoverable by city, typology, firm, sector and idea."/><section className="network-map"><div className="network-map-copy"><p className="marketing-index">Project → Knowledge → Discovery → Follow → Collect</p><h2>Discover complete projects, not isolated images.</h2><p>Explore what is being designed and built, follow the practices and places that matter, then create project-driven collections across the world.</p></div><div className="city-orbits"><Map/><span>Sydney</span><span>London</span><span>Copenhagen</span><span>Tokyo</span></div></section><section className="marketing-section network-features">{networkAreas.map(([Icon,title,body])=><article key={title}><Icon/><h2>{title}</h2><p>{body}</p></article>)}</section><section className="network-collection-example"><small>FUTURE COLLECTION</small><h2>New Models for Waterfront Cities</h2><p>Sydney · Copenhagen · Rotterdam · Singapore</p><Link to="/sign-in">Build private practice intelligence first <ArrowRight/></Link></section></main></Frame>}
