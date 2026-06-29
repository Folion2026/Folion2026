import {Check,Globe2,Lock,Share2,ShieldCheck} from 'lucide-react'
import {CONFIDENTIALITY_OPTIONS} from '../lib/confidentiality'
import {ProjectConfidentiality} from '../types'

const icons={
 'internal-only':Lock,
 'externally-shareable':Share2,
 'publicly-publishable':Globe2,
}

export default function ConfidentialityControl({value,onChange,compact=false}:{value:ProjectConfidentiality;onChange:(value:ProjectConfidentiality)=>void;compact?:boolean}){
 return <section className={`confidentiality-control ${compact?'compact':''}`}><div className="confidentiality-heading"><ShieldCheck/><div><h3>Confidentiality and permitted use</h3><p>Controls where this project may be reused. It does not change review readiness or publish anything.</p></div></div><div className="confidentiality-options">{CONFIDENTIALITY_OPTIONS.map(option=>{const Icon=icons[option.value];return <label key={option.value} className={value===option.value?'selected':''}><input type="radio" name="project-confidentiality" value={option.value} checked={value===option.value} onChange={()=>onChange(option.value)}/><Icon/><span><strong>{option.label}</strong><small>{option.description}</small></span>{value===option.value&&<Check/>}</label>})}</div></section>
}
