import {Plus,Trash2,Users} from 'lucide-react'
import {useState} from 'react'
import people from '../data/people.json'
import {TeamMember} from '../types'

export default function ProjectTeamEditor({team,onChange,compact=false}:{team:TeamMember[];onChange:(team:TeamMember[])=>void;compact?:boolean}){
 const available=people.filter(person=>!team.some(member=>member.personId===person.id));const [personId,setPersonId]=useState('')
 const add=()=>{const person=people.find(item=>item.id===personId);if(!person)return;onChange([...team,{personId:person.id,name:person.name,projectRole:'',contribution:''}]);setPersonId('')}
 const update=(personId:string,patch:Partial<TeamMember>)=>onChange(team.map(member=>member.personId===personId?{...member,...patch}:member))
 return <section className={`project-team-editor ${compact?'compact':''}`}><div className="project-team-editor-heading"><div><p className="eyebrow">Project team</p><h3>Project team and roles</h3><p>Select existing People records. Roles and contributions apply to this project only.</p></div><Users/></div>
  {team.length>0&&<div className="project-team-editor-list">{team.map(member=><article key={member.personId}><div className="team-editor-person"><span>{member.name.split(' ').map(part=>part[0]).join('')}</span><div><strong>{member.name}</strong><small>{people.find(person=>person.id===member.personId)?.position}</small></div><button type="button" onClick={()=>onChange(team.filter(item=>item.personId!==member.personId))} aria-label={`Remove ${member.name}`}><Trash2/></button></div><div className="team-editor-fields"><label>Project-specific role<input value={member.projectRole} onChange={event=>update(member.personId,{projectRole:event.target.value})} placeholder="Enter the role for this project"/></label><label>Contribution <small>Optional</small><textarea value={member.contribution||''} onChange={event=>update(member.personId,{contribution:event.target.value})} placeholder="What did this person contribute?"/></label></div></article>)}</div>}
  <div className="team-person-picker"><select value={personId} onChange={event=>setPersonId(event.target.value)} aria-label="Select an existing person"><option value="">Select a person</option>{available.map(person=><option key={person.id} value={person.id}>{person.name} · {person.position}</option>)}</select><button type="button" onClick={add} disabled={!personId}><Plus/> Add person</button></div>
  {!team.length&&<p className="team-skip-note">Optional. This section can be skipped.</p>}
 </section>
}
