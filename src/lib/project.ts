import {Asset,AssetType,Evidence,KnowledgeItem,PlaceFramework,Project,ProjectIdentity,ProjectMetrics,ProjectOutcome,SearchIntelligence,Story,StudioAssets} from '../types'

export const FALLBACK_PROJECT_IMAGE='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"%3E%3Crect width="1200" height="800" fill="%23d9d8d1"/%3E%3Cpath d="M0 620L310 350l210 190 190-150 490 310v100H0z" fill="%23b8b9b1"/%3E%3Ccircle cx="930" cy="190" r="72" fill="%23d6ff5c"/%3E%3C/svg%3E'

export const EMPTY_STORY:Story={brief:'Project story not recorded yet.',challenge:'',response:'',outcome:'',lessons:''}

const text=(value:unknown,fallback='')=>typeof value==='string'&&value.trim()?value:fallback
const strings=(value:unknown)=>Array.isArray(value)?value.filter((item):item is string=>typeof item==='string'&&Boolean(item.trim())):[]
const records=(value:unknown)=>Array.isArray(value)?value.filter((item):item is Record<string,unknown>=>Boolean(item)&&typeof item==='object'):[]
const slug=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'untitled'

const assetTypes:AssetType[]=['hero','report','plan','section','diagram','render','photo','document','other']
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
 const projectName=text(project.projectName,identity.name)
 return{id:text(project.id,`project-${slug(projectName)}`),projectName,visibility:project.visibility==='private'?'private':'public',status:text(project.status,identity.status),company:text(project.company,identity.practice),location:text(project.location,identity.location),address:strings(project.address),sector:text(project.sector,'Uncategorised'),projectType:strings(project.projectType),year:text(project.year,'Year not recorded'),client:text(project.client),siteArea:text(project.siteArea,metrics.siteArea),gfa:text(project.gfa,metrics.gfa),height:text(project.height,metrics.height),identity,metrics,opportunity,challenges,designResponse,outcome,whyItMatters:text(project.whyItMatters),lessonsLearned,placeFramework:{name:text(place.name),elements:strings(place.elements)},studioAssets:normalizeStudioAssets(project.studioAssets),searchIntelligence:normalizeSearchIntelligence(project.searchIntelligence,tags),evidence:normalizeEvidence(project.evidence),services:strings(project.services),team,story,reflection:project.reflection,assets,tags,coverImage:text(project.coverImage,assets.find(asset=>asset.type==='hero')?.url||FALLBACK_PROJECT_IMAGE)}
}

export function normalizeProjects(values:unknown):Project[]{return(Array.isArray(values)?values:[]).map(normalizeProject).filter((project):project is Project=>Boolean(project))}

function collectSearchText(value:unknown,output:string[]){
 if(typeof value==='string')output.push(value)
 else if(Array.isArray(value))value.forEach(item=>collectSearchText(item,output))
 else if(value&&typeof value==='object')Object.values(value).forEach(item=>collectSearchText(item,output))
}

export function projectSearchText(project:Project){
 const output:string[]=[]
 collectSearchText({projectName:project.projectName,status:project.status,company:project.company,location:project.location,address:project.address,sector:project.sector,projectType:project.projectType,year:project.year,client:project.client,identity:project.identity,metrics:project.metrics,opportunity:project.opportunity,challenges:project.challenges,designResponse:project.designResponse,outcome:project.outcome,whyItMatters:project.whyItMatters,lessonsLearned:project.lessonsLearned,placeFramework:project.placeFramework,studioAssets:project.studioAssets,searchIntelligence:project.searchIntelligence,services:project.services,tags:project.tags,story:project.story,reflection:project.reflection},output)
 return output.join(' ').toLowerCase()
}
