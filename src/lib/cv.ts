import {approvedDraftSections,reviewedKnowledgeFacts} from './project'
import type {Person,Project,StudioPackageMode,TeamMember} from '../types'

const stopWords=new Set(['about','after','also','and','are','been','being','best','brief','create','created','creating','for','from','have','into','more','most','need','needed','opportunity','package','people','person','project','projects','role','senior','team','that','the','their','this','through','using','want','where','which','while','with','work'])
const words=(value:string)=>[...new Set(value.toLowerCase().replace(/[^a-z0-9+]+/g,' ').split(/\s+/).filter(word=>word.length>2&&!stopWords.has(word)))]
const unique=(values:string[])=>[...new Set(values.map(value=>value.trim()).filter(Boolean))]
const list=(...values:Array<string[]|undefined>)=>unique(values.flatMap(value=>value||[]))
const hits=(terms:string[],value:string)=>terms.filter(term=>value.toLowerCase().includes(term))
const truncate=(value:string,maximum:number)=>{const tokens=value.trim().split(/\s+/).filter(Boolean);return tokens.length<=maximum?value.trim():`${tokens.slice(0,maximum).join(' ').replace(/[,:;.!?]+$/,'')}…`}

export const personQualifications=(person:Person)=>list(person.qualifications,person.education)
export const personRegistrations=(person:Person)=>list(person.registrations,person.affiliations,person.professionalAffiliations)
export const personCareer=(person:Person)=>list(person.careerHistory,person.employmentHistory)
export const personYears=(person:Person)=>person.yearsExperience||person.yearsOfExperience||''
export const personPortrait=(person:Person)=>person.portraitUrl||person.photoUrl||''

const approvedProjectText=(project:Project)=>unique([
 ...approvedDraftSections(project).map(item=>item.value),
 ...(project.approvedNarratives||[]).map(item=>item.text),
 ...(project.approvedEvidence||[]).map(item=>item.value),
 ...reviewedKnowledgeFacts(project).map(item=>item.value),
]).join(' ')

const eligibleProject=(project:Project,mode:StudioPackageMode)=>project.status!=='Archived'&&(mode==='internal'||project.confidentiality!=='internal-only')&&Boolean(approvedProjectText(project))
const explicitMember=(project:Project,personId:string)=>project.team.find(member=>member.personId===personId&&member.personStatus!=='deleted'&&member.projectRole.trim())

export interface CvPersonMatch{person:Person;reasons:string[];evidenceProjects:Project[];matchedTerms:string[];score:number}
export interface CvProjectMatch{personId:string;project:Project;member:TeamMember;reasons:string[];matchedTerms:string[];score:number}

export function matchPeopleForCv(brief:string,people:Person[],projects:Project[],mode:StudioPackageMode):CvPersonMatch[]{
 const terms=words(brief)
 return people.filter(person=>person.status==='active').map(person=>{
  const assigned=projects.filter(project=>eligibleProject(project,mode)&&Boolean(explicitMember(project,person.id)))
  const profile=[person.position,person.bio,...person.skills,...personQualifications(person),...personRegistrations(person),personYears(person),...personCareer(person)].join(' ')
  const roles=assigned.flatMap(project=>{const member=explicitMember(project,person.id)!;return[member.projectRole,member.seniority||'',member.contribution||'']}).join(' ')
  const knowledge=assigned.map(project=>approvedProjectText(project)).join(' ')
  const profileHits=hits(terms,profile),roleHits=hits(terms,roles),projectHits=hits(terms,knowledge),matchedTerms=unique([...profileHits,...roleHits,...projectHits])
  const matchingSkills=person.skills.filter(skill=>hits(terms,skill).length).slice(0,3)
  const matchingRoles=unique(assigned.map(project=>explicitMember(project,person.id)!.projectRole).filter(role=>hits(terms,role).length)).slice(0,2)
  const reasons=unique([
   ...matchingSkills.map(skill=>`Approved expertise: ${skill}`),
   ...matchingRoles.map(role=>`Explicit project role: ${role}`),
   assigned.length?`${assigned.length} approved project-role record${assigned.length===1?'':'s'}`:'No eligible explicit project-role records',
  ])
  return{person,reasons,evidenceProjects:assigned,matchedTerms,score:profileHits.length*4+roleHits.length*5+projectHits.length*2+Math.min(assigned.length,3)}
 }).sort((a,b)=>b.score-a.score||b.evidenceProjects.length-a.evidenceProjects.length||a.person.name.localeCompare(b.person.name))
}

export function matchProjectsForCv(brief:string,personIds:string[],projects:Project[],mode:StudioPackageMode):CvProjectMatch[]{
 const terms=words(brief),matches:CvProjectMatch[]=[]
 for(const personId of personIds){
  const candidates=projects.flatMap(project=>{const member=eligibleProject(project,mode)?explicitMember(project,personId):undefined;if(!member)return[]
   const roleText=[member.projectRole,member.seniority||'',member.contribution||''].join(' '),projectText=[project.projectName,project.location,project.sector,...project.services,...project.tags,approvedProjectText(project)].join(' ')
   const roleHits=hits(terms,roleText),projectHits=hits(terms,projectText),matchedTerms=unique([...roleHits,...projectHits])
   const reasons=unique([roleHits.length?`Recorded role aligns with ${roleHits.slice(0,3).join(', ')}`:'',projectHits.length?`Approved project knowledge aligns with ${projectHits.slice(0,3).join(', ')}`:'','Explicit Person → Project → Role record'])
   return[{personId,project,member,reasons,matchedTerms,score:roleHits.length*5+projectHits.length*2+(member.contribution?2:0)}]
  }).sort((a,b)=>b.score-a.score||a.project.projectName.localeCompare(b.project.projectName))
  matches.push(...candidates.slice(0,3))
 }
 return matches
}

export function createOpportunityProfile(person:Person,brief:string,matches:CvProjectMatch[]){
 const terms=words(brief),expertise=person.skills.filter(skill=>hits(terms,skill).length).slice(0,6),selectedExpertise=expertise.length?expertise:person.skills.slice(0,6)
 const roles=unique(matches.map(match=>match.member.projectRole)),projects=matches.map(match=>`${match.project.projectName} (${match.member.projectRole})`)
 const parts=[person.bio.trim(),selectedExpertise.length?`The approved person profile records expertise in ${selectedExpertise.join(', ')}.`:'',roles.length?`Explicit project records include roles as ${roles.join(', ')}.`:'',projects.length?`For this CV brief, the selected evidence is ${projects.join('; ')}.`:'']
 return truncate(parts.filter(Boolean).join(' '),120)
}

export function createProjectContribution(person:Person,match:CvProjectMatch){
 const projectContext=truncate(approvedProjectText(match.project),42)
 return truncate([match.member.contribution?.trim()||`${person.name} is explicitly recorded as ${match.member.projectRole} on this project.`,projectContext?`The approved project record describes ${projectContext.charAt(0).toLowerCase()}${projectContext.slice(1)}`:''].filter(Boolean).join(' '),78)
}

export function createSelectionNote(matches:CvProjectMatch[]){
 const names=matches.map(match=>match.project.projectName),terms=unique(matches.flatMap(match=>match.matchedTerms)).slice(0,5)
 return names.length?`Selected by Folion from explicit project-role records because ${names.join(', ')} provide the strongest approved evidence${terms.length?` aligned with ${terms.join(', ')}`:''}.`:'No eligible explicit project-role evidence was selected.'
}
