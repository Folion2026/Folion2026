import {Asset,AssetType,Project,Story} from '../types'

export const FALLBACK_PROJECT_IMAGE='data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"%3E%3Crect width="1200" height="800" fill="%23d9d8d1"/%3E%3Cpath d="M0 620L310 350l210 190 190-150 490 310v100H0z" fill="%23b8b9b1"/%3E%3Ccircle cx="930" cy="190" r="72" fill="%23d6ff5c"/%3E%3C/svg%3E'

export const EMPTY_STORY:Story={brief:'Project story not recorded yet.',challenge:'',response:'',outcome:'',lessons:''}

const assetTypes:AssetType[]=['hero','report','plan','section','diagram','render','photo','document','other']
function normalizeAsset(value:unknown,index:number):Asset|null{
 if(typeof value==='string')return{id:`legacy-asset-${index}`,type:'other',title:`Project asset ${index+1}`,caption:'',url:value,sourcePage:null,tags:[],uploadedCategory:'Other',isPrimary:false,isSelectedForGallery:true}
 if(!value||typeof value!=='object')return null
 const asset=value as Partial<Asset>;const type=assetTypes.includes(asset.type as AssetType)?asset.type as AssetType:'other'
 return{id:asset.id||`asset-${index}`,type,title:asset.title||`Project asset ${index+1}`,caption:asset.caption||'',url:asset.url||'',sourcePage:typeof asset.sourcePage==='number'?asset.sourcePage:null,tags:Array.isArray(asset.tags)?asset.tags.filter(Boolean):[],uploadedCategory:asset.uploadedCategory||type,isPrimary:Boolean(asset.isPrimary),isSelectedForGallery:asset.isSelectedForGallery!==false}
}

export function normalizeProject(value:unknown):Project|null{
 if(!value||typeof value!=='object')return null
 const project=value as Partial<Project>;const storyValue=project.story||EMPTY_STORY
 const story:Story={brief:storyValue.brief||EMPTY_STORY.brief,challenge:storyValue.challenge||'',response:storyValue.response||'',outcome:storyValue.outcome||'',lessons:storyValue.lessons||''}
 const assets=(Array.isArray(project.assets)?project.assets:[]).map(normalizeAsset).filter((asset):asset is Asset=>Boolean(asset))
 const team=Array.isArray(project.team)?project.team.filter(member=>member&&typeof member==='object').map((member,index)=>({personId:member.personId||`unknown-${index}`,name:member.name||'Unknown team member',projectRole:member.projectRole||'Role not recorded'})):[]
 return{id:project.id||`project-${Date.now()}`,projectName:project.projectName||'Untitled project',visibility:project.visibility==='private'?'private':'public',status:project.status||'Unknown',company:project.company||'Unknown practice',location:project.location||'Location not recorded',sector:project.sector||'Uncategorised',year:project.year||'Year not recorded',client:project.client||'',siteArea:project.siteArea||'',gfa:project.gfa||'',height:project.height||'',services:Array.isArray(project.services)?project.services.filter((item):item is string=>typeof item==='string'&&Boolean(item)):[],team,story,reflection:project.reflection,assets,tags:Array.isArray(project.tags)?project.tags.filter((item):item is string=>typeof item==='string'&&Boolean(item)):[],coverImage:project.coverImage||assets.find(asset=>asset.type==='hero')?.url||FALLBACK_PROJECT_IMAGE}
}

export function normalizeProjects(values:unknown):Project[]{return(Array.isArray(values)?values:[]).map(normalizeProject).filter((project):project is Project=>Boolean(project))}
