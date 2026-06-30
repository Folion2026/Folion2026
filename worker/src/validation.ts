export type EvidenceCandidate={category:string;field:string;value:string;source_page:number;exact_evidence_quote:string}
export type EvidencePage={page_number:number;extracted_text:string}

export const normalise=(value:string)=>value.normalize('NFKC').replace(/[\u2018\u2019]/g,"'").replace(/[\u201c\u201d]/g,'"').replace(/\s+/g,' ').trim().toLowerCase()

export function validateCandidateEvidence(candidates:EvidenceCandidate[],pages:EvidencePage[]){
 const pagesByNumber=new Map(pages.map(page=>[page.page_number,page]));const validated:EvidenceCandidate[]=[]
 for(const candidate of candidates){const page=pagesByNumber.get(candidate.source_page);if(!page||!normalise(page.extracted_text).includes(normalise(candidate.exact_evidence_quote)))continue;validated.push(candidate)}
 return validated
}
