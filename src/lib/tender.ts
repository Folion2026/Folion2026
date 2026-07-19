import type { Person, Project, StudioPackageMode, TeamMember } from "../types";
import { approvedDraftSections, reviewedKnowledgeFacts } from "./project";
import { personQualifications, personRegistrations, personYears } from "./cv";

export const tenderFields = [
  "client", "opportunity_project", "scope", "required_disciplines", "services",
  "deliverables", "challenges", "required_experience", "evaluation_criteria",
  "team_requirements", "mandatory_roles", "desirable_roles",
  "relevant_project_characteristics", "geography", "sector_typology",
  "scale_complexity",
] as const;
export type TenderField = typeof tenderFields[number];
export type TenderIntelligence = Record<TenderField, string[]> & { tender_title: string; evidence_gaps: string[] };

const stop = new Set(["and", "for", "from", "into", "the", "this", "that", "with", "will", "must", "should", "project", "experience", "required"]);
export const tenderTerms = (values: string[]) => [...new Set(values.join(" ").toLowerCase().replace(/[^a-z0-9+]+/g, " ").split(/\s+/).filter(word => word.length > 3 && !stop.has(word)))];
const unique = (values: string[]) => [...new Set(values.map(value => value.trim()).filter(Boolean))];
export const normaliseTender = (raw: Record<string, unknown>): TenderIntelligence => {
  const legacy: Partial<Record<TenderField, string[]>> = {
    opportunity_project: [String(raw.tender_title || "")], services: raw.requested_services as string[],
    sector_typology: raw.project_type_sector as string[], challenges: raw.priorities as string[],
    team_requirements: raw.team_evidence_required as string[],
  };
  const valuesFor = (field: TenderField) => {
    const value = raw[field];
    const values = Array.isArray(value) ? value.map(String) : typeof value === "string" && value.trim() ? [value] : legacy[field] || [];
    return unique(values);
  };
  return {
    tender_title: String(raw.tender_title || "Untitled tender"),
    evidence_gaps: Array.isArray(raw.evidence_gaps) ? raw.evidence_gaps.map(String) : [],
    client: valuesFor("client"),
    opportunity_project: valuesFor("opportunity_project"),
    scope: valuesFor("scope"),
    required_disciplines: valuesFor("required_disciplines"),
    services: valuesFor("services"),
    deliverables: valuesFor("deliverables"),
    challenges: valuesFor("challenges"),
    required_experience: valuesFor("required_experience"),
    evaluation_criteria: valuesFor("evaluation_criteria"),
    team_requirements: valuesFor("team_requirements"),
    mandatory_roles: valuesFor("mandatory_roles"),
    desirable_roles: valuesFor("desirable_roles"),
    relevant_project_characteristics: valuesFor("relevant_project_characteristics"),
    geography: valuesFor("geography"),
    sector_typology: valuesFor("sector_typology"),
    scale_complexity: valuesFor("scale_complexity"),
  };
};
const approvedText = (project: Project) => unique([
  project.projectName, project.location, project.sector, ...project.services, ...project.tags,
  ...approvedDraftSections(project).map(item => item.value),
  ...(project.approvedNarratives || []).map(item => item.text),
  ...(project.approvedEvidence || []).map(item => item.value),
  ...reviewedKnowledgeFacts(project).map(item => item.value),
]).join(" ");
export function rankTenderProjects(intelligence: TenderIntelligence, projects: Project[], mode: StudioPackageMode) {
  const requirements = tenderFields.flatMap(field => intelligence[field]);
  const terms = tenderTerms(requirements);
  return projects.filter(project => project.status !== "Archived" && (mode === "internal" || project.confidentiality !== "internal-only") && approvedText(project)).map(project => {
    const text = approvedText(project).toLowerCase(), matched = terms.filter(term => text.includes(term));
    const reasons = unique([
      ...intelligence.sector_typology.filter(value => text.includes(value.toLowerCase())).map(value => `Approved sector/typology evidence: ${value}`),
      ...intelligence.services.filter(value => text.includes(value.toLowerCase())).map(value => `Approved service evidence: ${value}`),
      ...intelligence.geography.filter(value => text.includes(value.toLowerCase())).map(value => `Approved geography evidence: ${value}`),
      matched.length ? `Approved project knowledge supports: ${matched.slice(0, 6).join(", ")}` : "",
    ]);
    return { project, score: matched.length, matched, reasons: reasons.length ? reasons : ["Eligible approved project record; direct tender alignment requires review."] };
  }).sort((a, b) => b.score - a.score || a.project.projectName.localeCompare(b.project.projectName));
}
export type TenderRole = { id: string; title: string; requirement: string; mandatory: boolean; personId: string };
export function suggestedTenderRoles(intelligence: TenderIntelligence): TenderRole[] {
  const rows = [
    ...intelligence.mandatory_roles.map(title => ({ title, mandatory: true })),
    ...intelligence.desirable_roles.map(title => ({ title, mandatory: false })),
  ];
  return unique(rows.map(row => row.title)).map((title, index) => {
    const row = rows.find(value => value.title === title)!;
    return { id: `role-${index + 1}`, title, requirement: title, mandatory: row.mandatory, personId: "" };
  });
}
const explicit = (project: Project, personId: string): TeamMember | undefined => project.team.find(member => member.personId === personId && member.personStatus !== "deleted" && member.projectRole.trim());
export function rankPeopleForTenderRole(role: TenderRole, people: Person[], projects: Project[]) {
  const terms = tenderTerms([role.title, role.requirement]);
  return people.filter(person => person.status === "active").map(person => {
    const records = projects.flatMap(project => { const member = explicit(project, person.id); return member ? [{ project, member }] : []; });
    const profile = [person.position, person.bio, ...person.skills, ...personQualifications(person), ...personRegistrations(person), personYears(person)].join(" ").toLowerCase();
    const roleText = records.map(record => `${record.member.projectRole} ${record.member.contribution || ""}`).join(" ").toLowerCase();
    const hits = terms.filter(term => profile.includes(term) || roleText.includes(term));
    return { person, records, score: hits.length * 5 + Math.min(records.length, 3), reasons: unique([
      ...hits.slice(0, 5).map(term => `Approved profile or explicit role evidence: ${term}`),
      records.length ? `${records.length} explicit Person → Project → Role record${records.length === 1 ? "" : "s"}` : "No explicit project-role evidence",
    ]) };
  }).sort((a, b) => b.score - a.score || b.records.length - a.records.length || a.person.name.localeCompare(b.person.name));
}
