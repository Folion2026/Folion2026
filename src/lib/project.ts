import {Asset,AssetType,DraftBasis,DraftKey,Evidence,FolionDraftSection,KnowledgeFact,KnowledgeFactKey,KnowledgeItem,KnowledgeReviewStatus,KnowledgeSourceType,PlaceFramework,Project,ProjectConfidentiality,ProjectIdentity,ProjectKnowledge,ProjectMetrics,ProjectOutcome,SearchIntelligence,Story,StudioAssets,TeamInput} from '../types'

export const FALLBACK_PROJECT_IMAGE='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"%3E%3Crect width="1200" height="800" fill="%23d9d8d1"/%3E%3Cpath d="M0 620L310 350l210 190 190-150 490 310v100H0z" fill="%23b8b9b1"/%3E%3Ccircle cx="930" cy="190" r="72" fill="%23d6ff5c"/%3E%3C/svg%3E'

export const EMPTY_STORY:Story={brief:'Project story not recorded yet.',challenge:'',response:'',outcome:'',lessons:''}

const STORMBRINGER_SOURCE='Stormbringer Studios Place Vision — uploaded report'
export const STORMBRINGER_DEMO_TEAM_INPUT:TeamInput={
 challengeOpportunity:'To create a film-studio campus that was more than a self-contained production compound: a catalyst for an ecosystem of filming, innovation, education, living and culture.',
 teamResponse:'The team created a compelling and legible place vision, bringing film production together with cultural, education, innovation, hospitality, accommodation and public-life uses.',
 futureRelevance:'The project positioned Hatch as a masterplanning leader for large, industry-led creative precincts, where a specialist production use can catalyse a broader innovation, living and cultural ecosystem.',
}

// Stormbringer demo extraction fixture — controlled local prototype data, not OCR or AI.
export function isStormbringerDemoInput(projectName:string,fileNames:string[]){return/stormbringer/i.test(projectName)||fileNames.some(name=>/sto[\s_-]*arm/i.test(name))}

export function createStormbringerDemoProject({id,assets,coverImage,confidentiality='internal-only'}:{id:string;assets:Asset[];coverImage:string;confidentiality?:ProjectConfidentiality}):Project{
 const fact=(key:KnowledgeFactKey,label:string,value:string):KnowledgeFact=>({key,label,value,sourceType:'uploaded-asset',assetId:'stormbringer-report',assetName:STORMBRINGER_SOURCE,status:'review-needed'})
 const facts:KnowledgeFact[]=[
  fact('projectName','Project name','Stormbringer Studios Place Vision'),fact('client','Client','Stormbringer Studios'),fact('location','Location','Armidale, NSW'),fact('practice','Practice','Hatch RobertsDay'),fact('projectType','Project type','Strategic place vision and masterplan'),fact('year','Date','18 June 2021'),fact('proposal','Proposal','Film studio complex, media innovation hub and CulturePlex'),fact('precincts','Precincts','Media Maker Precinct; The Village; Creative Precinct; Campus Precinct'),fact('siteContext','Site context','Northern outskirts of Armidale; Approximately 4 km from Armidale station and town centre; Less than 10 minutes from Armidale Airport; Proximity to the University of New England'),fact('placeStrategy','Place strategy','Film production; Culture and events; Education and innovation; Retail and dining; Accommodation; Landscape, ecology, hydrology and views as design inputs'),
 ]
 const draft:FolionDraftSection[]=[
  {key:'summary',label:'Project summary',value:'Stormbringer Studios Place Vision is a strategic masterplanning proposal for a film-studio campus, media-innovation hub and cultural destination in Armidale, NSW. Prepared for Stormbringer Studios, the vision reframes a specialist production facility as the catalyst for a broader creative ecosystem—bringing together film production, culture, education, innovation, hospitality, accommodation and public life.',approved:false,basis:'both'},
  {key:'challenge',label:'Challenge',value:'The opportunity was to move beyond an isolated studio compound and create a place where production activity could support a broader ecosystem of creativity, learning, culture and everyday life.',approved:false,basis:'both'},
  {key:'response',label:'Response',value:'The masterplan translated this ambition into four connected precincts: the Media Maker Precinct, The Village, Creative Precinct and Campus Precinct. It used Armidale’s landscape, movement network, university proximity and regional character to create a coherent destination framework.',approved:false,basis:'both'},
  {key:'outcome',label:'Outcome / relevance',value:'The project demonstrates a place-led approach to specialist-industry precincts, where production infrastructure can become a platform for long-term cultural, educational and innovation value.',approved:false,basis:'both'},
 ]
 return{id,projectName:'Stormbringer Studios Place Vision',visibility:'private',confidentiality,status:'',company:'Hatch RobertsDay',location:'Armidale, NSW',sector:'',projectType:['Strategic place vision and masterplan'],proposal:'Film studio complex, media innovation hub and CulturePlex',precincts:['Media Maker Precinct','The Village','Creative Precinct','Campus Precinct'],siteContext:['Northern outskirts of Armidale','Approximately 4 km from Armidale station and town centre','Less than 10 minutes from Armidale Airport','Proximity to the University of New England'],placeStrategy:['Film production','Culture and events','Education and innovation','Retail and dining','Accommodation','Landscape, ecology, hydrology and views as design inputs'],year:'18 June 2021',client:'Stormbringer Studios',siteArea:'',gfa:'',height:'',services:[],team:[],story:{brief:'',challenge:'',response:'',outcome:'',lessons:''},knowledge:{facts,teamInput:STORMBRINGER_DEMO_TEAM_INPUT,draft},assets,tags:['creative industries','innovation precinct','masterplanning','regional NSW'],coverImage}
}

const text=(value:unknown,fallback='')=>typeof value==='string'&&value.trim()?value:fallback
const strings=(value:unknown)=>Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'&&Boolean(item.trim())):[]
const records=(value:unknown)=>Array.isArray(value)?value.filter((item):item is Record<string,unknown>=>Boolean(item)&&typeof item==='object'):[]
const slug=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'untitled'

const assetTypes:AssetType[]=['hero','report','plan','section','diagram','render','photo','document','other']
const confidentialityValues:ProjectConfidentiality[]=['internal-only','externally-shareable','publicly-publishable']
function normalizeAsset(value:unknown,index:number):Asset|null{
 if(typeof value==='string')return{id:`legacy-asset-${index}`,type:'other',title:`Project asset ${index+1}`,caption:'',url:value,sourcePage:null,tags:[],uploadedCategory:'Other',isPrimary:false,isSelectedForGallery:true}
 if(!value||typeof value!=='object')return null
 const asset=value as Partial<Asset>;const type=assetTypes.includes(asset.type as AssetType)?asset.type as AssetType:'other'
 return{id:text(asset.id,`asset-${index}`),type,title:text(asset.title,`Project asset ${index+1}`),caption:text(asset.caption),url:text(asset.url),sourcePage:typeof asset.sourcePage==='number'?asset.sourcePage:null,tags:strings(asset.tags),uploadedCategory:text(asset.uploadedCategory,type),isPrimary:Boolean(asset.isPrimary),isSelectedForGallery:asset.isSelectedForGallery!==false}
}

function normalizeKnowledgeItems(value:unknown,fallback?:string):KnowledgeItem[]{
 const items=records(value).map(item=>({title:text(item.title,'Project insight'),description:text(item.description)})).filter(item=>item.description)
 return items.length||!fallback?items:[{title:'Project context',description:fallback}]
}

function normalizeIdentity(value:unknown,project:Record<string,unknown>):ProjectIdentity{
 const identity=value&&typeof value==='object'?value as Partial<ProjectIdentity>:{}
 return{name:text(identity.name,text(project.projectName,'Untitled project')),location:text(identity.location,text(project.location,'Location not recorded')),status:text(identity.status,text(project.status,'Unknown')),practice:text(identity.practice,text(project.company,'Unknown practice')),collaborators:strings(identity.collaborators),role:strings(identity.role),description:text(identity.description)}
}

function normalizeMetrics(value:unknown,project:Record<string,unknown>):ProjectMetrics{
 const metrics=value&&typeof value==='object'?value as Partial<ProjectMetrics>:{}
 return{siteArea:text(metrics.siteArea,text(project.siteArea)),fsr:text(metrics.fsr),height:text(metrics.height,text(project.height)),publicDomain:text(metrics.publicDomain),publicDomainPercentage:text(metrics.publicDomainPercentage),affordableHousing:text(metrics.affordableHousing),gfa:text(metrics.gfa,text(project.gfa)),dwellings:text(metrics.dwellings)}
}

function normalizeOutcome(value:unknown,fallback:string):ProjectOutcome{
 const outcome=value&&typeof value==='object'?value as Partial<ProjectOutcome>:{}
 return{summary:text(outcome.summary,fallback),benefits:strings(outcome.benefits)}
}

function normalizeStudioAssets(value:unknown):StudioAssets{
 const assets=value&&typeof value==='object'?value as Partial<StudioAssets>:{}
 return{shortSummary:text(assets.shortSummary),capabilityStatement:text(assets.capabilityStatement),tenderParagraph:text(assets.tenderParagraph)}
}

function normalizeSearchIntelligence(value:unknown,tags:string[]):SearchIntelligence{
 const search=value&&typeof value==='object'?value as Partial<SearchIntelligence>:{}
 return{keywords:Array.from(new Set([...tags,...strings(search.keywords)])),concepts:strings(search.concepts),searchQuestionsThisProjectShouldAnswer:strings(search.searchQuestionsThisProjectShouldAnswer)}
}

function normalizeEvidence(value:unknown):Evidence[]{
 return records(value).map(item=>({field:text(item.field,'Unknown field'),source:text(item.source,'Source not recorded'),page:typeof item.page==='number'?item.page:null,confidence:typeof item.confidence==='number'?item.confidence:null}))
}

export const KNOWLEDGE_FACTS:{key:KnowledgeFactKey;label:string}[]=[
 {key:'projectName',label:'Project name'},{key:'location',label:'Location'},{key:'client',label:'Client'},{key:'practice',label:'Practice'},{key:'sector',label:'Sector / typology'},{key:'projectType',label:'Project type'},{key:'status',label:'Project status'},{key:'year',label:'Dates'},{key:'proposal',label:'Proposal'},{key:'precincts',label:'Precincts'},{key:'siteContext',label:'Site context'},{key:'placeStrategy',label:'Place strategy'},{key:'siteArea',label:'Site area'},{key:'gfa',label:'GFA'},{key:'dwellings',label:'Dwelling count'},{key:'height',label:'Height / levels'},{key:'services',label:'Services'},
]
const reviewStatuses:KnowledgeReviewStatus[]=['reviewed','review-needed','no-evidence','approval-pending','rejected']
const sourceTypes:KnowledgeSourceType[]=['uploaded-asset','team-input']
const draftDefinitions:{key:DraftKey;label:string}[]=[{key:'summary',label:'Project summary'},{key:'challenge',label:'Challenge'},{key:'response',label:'Response'},{key:'outcome',label:'Outcome / relevance'}]

function factValue(key:KnowledgeFactKey,project:Record<string,unknown>,metrics:ProjectMetrics){
 if(key==='services')return strings(project.services).join(', ')
 if(key==='practice')return text(project.company)
 if(key==='projectType'||key==='precincts'||key==='siteContext'||key==='placeStrategy')return strings(project[key]).join('; ')
 if(key==='dwellings')return text(metrics.dwellings)
 if(key==='siteArea'||key==='gfa'||key==='height')return text(project[key],text(metrics[key]))
 return text(project[key])
}

function normalizeTeamInput(value:unknown):TeamInput{
 const input=value&&typeof value==='object'?value as Partial<TeamInput>:{}
 return{challengeOpportunity:text(input.challengeOpportunity),teamResponse:text(input.teamResponse),futureRelevance:text(input.futureRelevance)}
}

function draftBasis(hasFacts:boolean,hasTeam:boolean):DraftBasis{return hasFacts&&hasTeam?'both':hasTeam?'team':'facts'}

function normalizeProjectKnowledge(project:Record<string,unknown>,metrics:ProjectMetrics,story:Story,studio:StudioAssets,whyItMatters:string,assets:Asset[],evidence:Evidence[]):ProjectKnowledge{
 const raw=project.knowledge&&typeof project.knowledge==='object'?project.knowledge as Partial<ProjectKnowledge>:{}
 const rawFacts=new Map((Array.isArray(raw.facts)?raw.facts:[]).filter((item):item is KnowledgeFact=>Boolean(item)&&typeof item==='object').map(item=>[item.key,item]))
 const primaryReport=assets.find(asset=>asset.type==='report'&&asset.isPrimary)||assets.find(asset=>asset.type==='report')
 const facts=KNOWLEDGE_FACTS.map(({key,label})=>{
  const existing=rawFacts.get(key);const value=existing?text(existing.value):factValue(key,project,metrics)
  const matchingEvidence=evidence.find(item=>item.field.toLowerCase()===key.toLowerCase()||item.field.toLowerCase().includes(key.toLowerCase()))
  const inferredSource:KnowledgeSourceType|null=value?(matchingEvidence||primaryReport?'uploaded-asset':'team-input'):null
  const sourceType=existing&&sourceTypes.includes(existing.sourceType as KnowledgeSourceType)?existing.sourceType:inferredSource
  const status=existing&&reviewStatuses.includes(existing.status)?existing.status:value?'approval-pending':'no-evidence'
  return{key,label,value,sourceType,assetId:existing?.assetId||primaryReport?.id,assetName:existing?.assetName||matchingEvidence?.source||primaryReport?.title,status} as KnowledgeFact
 })
 const teamInput=normalizeTeamInput(raw.teamInput)
 const rawDraft=new Map((Array.isArray(raw.draft)?raw.draft:[]).filter((item):item is FolionDraftSection=>Boolean(item)&&typeof item==='object').map(item=>[item.key,item]))
 const draftSeeds:Record<DraftKey,{value:string;basis:DraftBasis}>={
  summary:{value:text(studio.shortSummary,story.brief===EMPTY_STORY.brief?'':story.brief),basis:'facts'},
  challenge:{value:text(teamInput.challengeOpportunity,story.challenge),basis:draftBasis(Boolean(story.challenge),Boolean(teamInput.challengeOpportunity))},
  response:{value:text(teamInput.teamResponse,story.response),basis:draftBasis(Boolean(story.response),Boolean(teamInput.teamResponse))},
  outcome:{value:text(teamInput.futureRelevance,text(whyItMatters,story.outcome)),basis:draftBasis(Boolean(whyItMatters||story.outcome),Boolean(teamInput.futureRelevance))},
 }
 const draft=draftDefinitions.map(({key,label})=>{const existing=rawDraft.get(key);return{key,label,value:existing?text(existing.value):draftSeeds[key].value,approved:Boolean(existing?.approved),basis:existing?.basis||draftSeeds[key].basis}})
 return{facts,teamInput,draft}
}

export function isKnowledgeReviewResolved(project:Project){
 const knowledge=project.knowledge
 if(!knowledge)return false
 const hasSelectedKnowledge=knowledge.facts.some(fact=>Boolean(fact.value)||fact.status==='rejected')||knowledge.draft.some(section=>Boolean(section.value))
 const unresolvedFact=knowledge.facts.some(fact=>Boolean(fact.value)&&!['reviewed','rejected'].includes(fact.status))
 const unresolvedDraft=knowledge.draft.some(section=>Boolean(section.value)&&!section.approved)
 return hasSelectedKnowledge&&!unresolvedFact&&!unresolvedDraft
}

export function projectKnowledgeStatus(project:Project){
 return project.knowledgeStatus==='Ready for Studio'&&isKnowledgeReviewResolved(project)?'Ready for Studio' as const:'Review needed' as const
}

export function reviewedKnowledgeFacts(project:Project){return(project.knowledge?.facts||[]).filter(fact=>fact.status==='reviewed'&&Boolean(fact.value))}
export function approvedDraftSections(project:Project){return(project.knowledge?.draft||[]).filter(section=>section.approved&&Boolean(section.value))}

export function normalizeProject(value:unknown):Project|null{
 if(!value||typeof value!=='object')return null
 const project=value as Partial<Project>&Record<string,unknown>
 const rawStory=project.story&&typeof project.story==='object'?project.story as Partial<Story>:{}
 const identity=normalizeIdentity(project.identity,project)
 const metrics=normalizeMetrics(project.metrics,project)
 const opportunity=normalizeKnowledgeItems(project.opportunity)
 const challenges=normalizeKnowledgeItems(project.challenges,text(rawStory.challenge))
 const designResponse=normalizeKnowledgeItems(project.designResponse,text(rawStory.response))
 const outcome=normalizeOutcome(project.outcome,text(rawStory.outcome))
 const lessonsLearned=strings(project.lessonsLearned);if(!lessonsLearned.length&&text(rawStory.lessons))lessonsLearned.push(text(rawStory.lessons))
 const story:Story={brief:text(rawStory.brief,identity.description||EMPTY_STORY.brief),challenge:text(rawStory.challenge,challenges.map(item=>item.description).join(' ')),response:text(rawStory.response,designResponse.map(item=>item.description).join(' ')),outcome:text(rawStory.outcome,outcome.summary),lessons:text(rawStory.lessons,lessonsLearned.join(' '))}
 const assets=(Array.isArray(project.assets)?project.assets:[]).map(normalizeAsset).filter((asset):asset is Asset=>Boolean(asset))
 const team=records(project.team).map((member,index)=>({personId:text(member.personId,`unknown-${index}`),name:text(member.name,'Unknown team member'),projectRole:text(member.projectRole,'Role not recorded')}))
 const tags=strings(project.tags)
 const place=project.placeFramework&&typeof project.placeFramework==='object'?project.placeFramework as Partial<PlaceFramework>:{}
 const studioAssets=normalizeStudioAssets(project.studioAssets);const normalizedEvidence=normalizeEvidence(project.evidence);const whyItMatters=text(project.whyItMatters)
 const projectName=text(project.projectName,identity.name)
 const knowledge=normalizeProjectKnowledge(project,metrics,story,studioAssets,whyItMatters,assets,normalizedEvidence)
 const visibility=project.visibility==='public'?'public':'private';const confidentiality=confidentialityValues.includes(project.confidentiality as ProjectConfidentiality)?project.confidentiality as ProjectConfidentiality:visibility==='public'?'publicly-publishable':'internal-only'
 return{id:text(project.id,`project-${slug(projectName)}`),projectName,visibility,confidentiality,status:text(project.status,identity.status),knowledgeStatus:project.knowledgeStatus==='Ready for Studio'?'Ready for Studio':'Review needed',company:text(project.company,identity.practice),location:text(project.location,identity.location),address:strings(project.address),sector:text(project.sector,'Uncategorised'),projectType:strings(project.projectType),proposal:text(project.proposal),precincts:strings(project.precincts),siteContext:strings(project.siteContext),placeStrategy:strings(project.placeStrategy),year:text(project.year,'Year not recorded'),client:text(project.client),siteArea:text(project.siteArea,metrics.siteArea),gfa:text(project.gfa,metrics.gfa),height:text(project.height,metrics.height),identity,metrics,opportunity,challenges,designResponse,outcome,whyItMatters,lessonsLearned,placeFramework:{name:text(place.name),elements:strings(place.elements)},studioAssets,searchIntelligence:normalizeSearchIntelligence(project.searchIntelligence,tags),evidence:normalizedEvidence,knowledge,services:strings(project.services),team,story,reflection:project.reflection,assets,tags,coverImage:text(project.coverImage,assets.find(asset=>asset.type==='hero')?.url||FALLBACK_PROJECT_IMAGE)}
}

export function normalizeProjects(values:unknown):Project[]{return(Array.isArray(values)?values:[]).map(normalizeProject).filter((project):project is Project=>Boolean(project))}

function collectSearchText(value:unknown,output:string[]){
 if(typeof value==='string')output.push(value)
 else if(Array.isArray(value))value.forEach(item=>collectSearchText(item,output))
 else if(value&&typeof value==='object')Object.values(value).forEach(item=>collectSearchText(item,output))
}

export function projectSearchText(project:Project){
 const output:string[]=[]
 collectSearchText({projectName:project.projectName,status:project.status,confidentiality:project.confidentiality,company:project.company,location:project.location,address:project.address,sector:project.sector,projectType:project.projectType,proposal:project.proposal,precincts:project.precincts,siteContext:project.siteContext,placeStrategy:project.placeStrategy,year:project.year,client:project.client,identity:project.identity,metrics:project.metrics,opportunity:project.opportunity,challenges:project.challenges,designResponse:project.designResponse,outcome:project.outcome,whyItMatters:project.whyItMatters,lessonsLearned:project.lessonsLearned,placeFramework:project.placeFramework,studioAssets:project.studioAssets,searchIntelligence:project.searchIntelligence,knowledge:project.knowledge,services:project.services,tags:project.tags,story:project.story,reflection:project.reflection},output)
 return output.join(' ').toLowerCase()
}
