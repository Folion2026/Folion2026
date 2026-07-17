import type { FirmProfile, Project } from "../types";
import { approvedDraftSections } from "./project";

export type PitchSlideKind =
  | "cover"
  | "opportunity"
  | "thesis"
  | "point_of_view"
  | "evidence_one"
  | "evidence_two"
  | "evidence_three"
  | "credibility"
  | "closing";

export interface PitchMatch {
  projectId: string;
  score: number;
  coveredThemes: string[];
  evidenceGaps: string[];
  rationale: string;
}

export interface PitchIntelligence {
  centralIdea: string;
  opportunityStatement: string;
  challengeInterpretation: string;
  firmPointOfView: string;
  evidenceThemes: string[];
  credibilityStatement: string;
  closingVisionStatement: string;
  matches: PitchMatch[];
}

export interface PitchSlide {
  kind: PitchSlideKind;
  eyebrow: string;
  title: string;
  body: string;
  projectId?: string;
  assetId?: string;
  supportingAssetIds?: string[];
}

const stopWords = new Set([
  "about", "after", "against", "being", "brief", "client", "could", "from",
  "have", "into", "more", "must", "only", "other", "should", "their",
  "there", "these", "they", "this", "through", "what", "where", "which",
  "while", "with", "would", "your", "that", "than", "will", "project",
  "pitch", "opportunity", "looking", "seeking", "need", "needs",
]);

const clean = (value: unknown) =>
  typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";

const trimWords = (value: string, maximum: number) => {
  const words = clean(value).split(" ").filter(Boolean);
  return words.length <= maximum
    ? words.join(" ")
    : `${words.slice(0, maximum).join(" ").replace(/[,:;]$/, "")}…`;
};

const firstSentence = (value: string) =>
  clean(value).split(/(?<=[.!?])\s+/)[0]?.trim() || "";

const themesFrom = (value: string) => {
  const counts = new Map<string, number>();
  clean(value)
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter((word) => word.length > 4 && !stopWords.has(word))
    .forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));
  return [...counts]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([word]) => word)
    .slice(0, 7);
};

export const approvedPitchEvidence = (project: Project) => {
  const narratives = (project.approvedNarratives || []).map((item) => item.text),
    drafts = approvedDraftSections(project).map((item) => item.value),
    evidence = (project.approvedEvidence || []).map((item) => item.value);
  return [...narratives, ...drafts, ...evidence]
    .map(clean)
    .filter(Boolean);
};

const projectCorpus = (project: Project) =>
  [
    project.projectName,
    project.location,
    project.client,
    project.sector,
    ...(project.projectType || []),
    ...project.services,
    ...project.tags,
    ...approvedPitchEvidence(project),
  ]
    .map(clean)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

const projectEvidenceStatement = (project: Project) => {
  const approved = approvedPitchEvidence(project);
  return trimWords(
    firstSentence(approved[0] || "") ||
      [project.sector, project.services.slice(0, 2).join(" and ")]
        .filter(Boolean)
        .join(" · "),
    24,
  );
};

const capitalise = (value: string) =>
  value ? `${value[0].toUpperCase()}${value.slice(1)}` : value;

export function analysePitchBrief(
  briefing: string,
  projects: Project[],
  firm: FirmProfile,
): PitchIntelligence {
  const brief = clean(briefing),
    themes = themesFrom(brief),
    matches = projects
      .map((project) => {
        const corpus = projectCorpus(project),
          coveredThemes = themes.filter((theme) => corpus.includes(theme)),
          evidenceGaps = themes.filter((theme) => !coveredThemes.includes(theme)),
          serviceMatches = project.services.filter((service) =>
            brief.toLowerCase().includes(service.toLowerCase()),
          ),
          sectorMatch = project.sector && brief.toLowerCase().includes(project.sector.toLowerCase()),
          score = coveredThemes.length * 3 + serviceMatches.length * 2 + (sectorMatch ? 2 : 0),
          rationaleParts = [
            coveredThemes.length
              ? `Evidence for ${coveredThemes.slice(0, 3).join(", ")}`
              : "Approved project knowledge available",
            serviceMatches.length ? serviceMatches.slice(0, 2).join(" and ") : "",
            projectEvidenceStatement(project),
          ].filter(Boolean);
        return {
          projectId: project.id,
          score,
          coveredThemes,
          evidenceGaps,
          rationale: trimWords(rationaleParts.join(". "), 34),
        };
      })
      .sort((a, b) => b.score - a.score),
    lead = projects.find((project) => project.id === matches[0]?.projectId),
    leadTheme = themes[0] || lead?.sector || "place",
    secondTheme = themes[1] || lead?.services[0] || "purpose",
    briefOpening = trimWords(firstSentence(brief), 18),
    firmStatement = trimWords(firstSentence(firm.firmStatement), 22),
    centralIdea = briefOpening || `A ${leadTheme} vision shaped by ${secondTheme}.`,
    opportunityStatement = briefOpening || `Create a ${leadTheme} response grounded in ${secondTheme}.`,
    challengeInterpretation = themes.length > 1
      ? `${capitalise(themes[0])} must work with ${themes[1]}, not against it.`
      : `The response must make ${leadTheme} tangible.`,
    firmPointOfView = firmStatement ||
      `Begin with ${[leadTheme, secondTheme, themes[2]].filter(Boolean).join(", ")}.`,
    services = firm.servicesProvided.slice(0, 4);

  return {
    centralIdea,
    opportunityStatement,
    challengeInterpretation,
    firmPointOfView,
    evidenceThemes: themes,
    credibilityStatement: services.length
      ? `A team experienced in ${services.join(", ").toLowerCase()}.`
      : "A team experienced in turning complex constraints into clear place-led frameworks.",
    closingVisionStatement: `A ${leadTheme} response people can believe in before it is built.`,
    matches,
  };
}

export function createPitchSlides(
  analysis: PitchIntelligence,
  selected: Project[],
): PitchSlide[] {
  if (selected.length < 3) throw new Error("Select three projects to complete the nine-slide Pitch Vision.");
  const evidence = selected.slice(0, 3),
    evidenceSlides = evidence.map((project, index): PitchSlide => {
      const assets = project.assets.filter(
          (asset) => asset.url && ["hero", "photo", "render", "plan", "section", "diagram"].includes(asset.type),
        ),
        match = analysis.matches.find((value) => value.projectId === project.id);
      return {
        kind: (["evidence_one", "evidence_two", "evidence_three"] as PitchSlideKind[])[index],
        eyebrow: `Evidence ${String(index + 1).padStart(2, "0")}`,
        title: project.projectName,
        body: trimWords(match?.rationale || projectEvidenceStatement(project), 28),
        projectId: project.id,
        assetId: assets[0]?.id,
      };
    }),
    lead = evidence[0],
    leadAssets = lead.assets.filter(
      (asset) => asset.url && ["hero", "photo", "render", "plan", "section", "diagram"].includes(asset.type),
    ),
    credibilityAssets = evidence
      .map((project) => project.assets.find((asset) => asset.url && ["hero", "photo", "render"].includes(asset.type))?.id)
      .filter(Boolean) as string[];

  return [
    {
      kind: "cover",
      eyebrow: "Pitch Vision",
      title: analysis.centralIdea,
      body: analysis.evidenceThemes.slice(0, 3).join(" · "),
      projectId: lead.id,
      assetId: leadAssets[0]?.id,
    },
    {
      kind: "opportunity",
      eyebrow: "The opportunity",
      title: analysis.opportunityStatement,
      body: analysis.evidenceThemes.slice(0, 4).join(", "),
      projectId: lead.id,
      assetId: leadAssets[1]?.id || leadAssets[0]?.id,
    },
    {
      kind: "thesis",
      eyebrow: "Pitch thesis",
      title: analysis.challengeInterpretation,
      body: analysis.centralIdea,
      projectId: lead.id,
      assetId: leadAssets[0]?.id,
    },
    {
      kind: "point_of_view",
      eyebrow: "Our point of view",
      title: analysis.firmPointOfView,
      body: analysis.opportunityStatement,
    },
    ...evidenceSlides,
    {
      kind: "credibility",
      eyebrow: "Why this team",
      title: analysis.credibilityStatement,
      body: analysis.evidenceThemes.slice(0, 5).join(" · "),
      projectId: lead.id,
      supportingAssetIds: credibilityAssets,
    },
    {
      kind: "closing",
      eyebrow: "Closing vision",
      title: analysis.closingVisionStatement,
      body: analysis.centralIdea,
      projectId: lead.id,
      assetId: leadAssets[0]?.id,
    },
  ];
}
