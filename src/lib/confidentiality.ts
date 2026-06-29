import {ProjectConfidentiality} from '../types'

export const CONFIDENTIALITY_OPTIONS:{value:ProjectConfidentiality;label:string;description:string}[]=[
 {value:'internal-only',label:'Internal only',description:'Available within Folion, but excluded from public-facing material.'},
 {value:'externally-shareable',label:'Externally shareable',description:'May be used in approved pitches, tenders and capability material.'},
 {value:'publicly-publishable',label:'Publicly publishable',description:'May be used in public project material when explicitly published. This does not publish the project automatically.'},
]

export const confidentialityLabel=(value:ProjectConfidentiality)=>CONFIDENTIALITY_OPTIONS.find(option=>option.value===value)?.label||'Internal only'
export const isExternalOutputAllowed=(value:ProjectConfidentiality)=>value!=='internal-only'
export const isPublicMaterialAllowed=(value:ProjectConfidentiality)=>value==='publicly-publishable'
