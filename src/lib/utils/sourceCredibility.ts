export type SourceTier = 'academic' | 'official' | 'institutional' | 'social' | 'unknown';

export type SourceCredibility = {
  tier: SourceTier;
  tierLabel: string;
  tierNumber: 1 | 2 | 3 | 4 | 5;
};

const ACADEMIC_ENGINES = new Set([
  'arxiv',
  'google scholar',
  'pubmed',
  'semantic scholar',
  'crossref',
  'base',
  'openaire',
]);

const ACADEMIC_DOMAINS = [
  /\.edu$/,
  /\.ac\.\w{2,3}$/,
  /arxiv\.org$/,
  /pubmed\.ncbi\.nlm\.nih\.gov$/,
  /scholar\.google\./,
  /nature\.com$/,
  /science\.org$/,
  /thelancet\.com$/,
  /sciencedirect\.com$/,
  /springer\.com$/,
  /wiley\.com$/,
  /jstor\.org$/,
  /ieee\.org$/,
  /ncbi\.nlm\.nih\.gov$/,
  /plos\.org$/,
  /bmj\.com$/,
  /nejm\.org$/,
];

const OFFICIAL_DOMAINS = [
  /\.gov$/,
  /\.gov\.\w{2,3}$/,
  /\.mil$/,
  /who\.int$/,
  /europa\.eu$/,
  /un\.org$/,
  /worldbank\.org$/,
];

const INSTITUTIONAL_DOMAINS = [
  /reuters\.com$/,
  /apnews\.com$/,
  /bbc\.com$/,
  /bbc\.co\.uk$/,
  /nytimes\.com$/,
  /washingtonpost\.com$/,
  /theguardian\.com$/,
  /economist\.com$/,
  /ft\.com$/,
  /wsj\.com$/,
  /bloomberg\.com$/,
  /npr\.org$/,
  /pbs\.org$/,
  /britannica\.com$/,
  /wikipedia\.org$/,
];

const TECH_REFERENCE_DOMAINS = [
  /stackoverflow\.com$/,
  /stackexchange\.com$/,
  /developer\.mozilla\.org$/,
  /docs\.python\.org$/,
  /docs\.microsoft\.com$/,
  /learn\.microsoft\.com$/,
  /docs\.github\.com$/,
  /github\.com$/,
  /docs\.google\.com$/,
  /cloud\.google\.com$/,
  /docs\.aws\.amazon\.com$/,
  /aws\.amazon\.com$/,
  /developer\.apple\.com$/,
  /docs\.oracle\.com$/,
  /rust-lang\.org$/,
  /golang\.org$/,
  /typescriptlang\.org$/,
  /cppreference\.com$/,
  /docs\.rs$/,
];

const SOCIAL_DOMAINS = [
  /reddit\.com$/,
  /twitter\.com$/,
  /x\.com$/,
  /facebook\.com$/,
  /instagram\.com$/,
  /tiktok\.com$/,
  /quora\.com$/,
  /medium\.com$/,
  /substack\.com$/,
  /tumblr\.com$/,
  /threads\.net$/,
];

function extractHostname(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function matchesDomainList(hostname: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(hostname));
}

/**
 * Classify a source URL into a credibility tier.
 * Uses engine metadata from SearXNG (strongest signal) combined with
 * domain-based heuristics.
 *
 * Tier 1: Academic/Peer-reviewed (arxiv, pubmed, .edu, journals)
 * Tier 2: Official/Government (.gov, WHO, UN, etc.)
 * Tier 3: Institutional/Major News (reuters, bbc, nytimes, wikipedia)
 * Tier 4: Social/Opinion (reddit, twitter, medium, substack)
 * Tier 5: Unknown (everything else)
 */
export function classifySource(
  url: string,
  engine?: string,
  engines?: string[],
): SourceCredibility {
  // 1. Engine-based classification (strongest signal)
  const allEngines = new Set<string>();
  if (engine) allEngines.add(engine.toLowerCase());
  if (engines) {
    for (const e of engines) allEngines.add(e.toLowerCase());
  }

  for (const e of allEngines) {
    if (ACADEMIC_ENGINES.has(e)) {
      return { tier: 'academic', tierLabel: 'Academic/Peer-reviewed', tierNumber: 1 };
    }
  }

  // 2. Domain-based classification
  const hostname = extractHostname(url);
  if (!hostname) {
    return { tier: 'unknown', tierLabel: 'Unknown', tierNumber: 5 };
  }

  if (matchesDomainList(hostname, ACADEMIC_DOMAINS)) {
    return { tier: 'academic', tierLabel: 'Academic/Peer-reviewed', tierNumber: 1 };
  }

  if (matchesDomainList(hostname, OFFICIAL_DOMAINS)) {
    return { tier: 'official', tierLabel: 'Official/Government', tierNumber: 2 };
  }

  if (matchesDomainList(hostname, INSTITUTIONAL_DOMAINS)) {
    return { tier: 'institutional', tierLabel: 'Institutional/Major News', tierNumber: 3 };
  }

  if (matchesDomainList(hostname, SOCIAL_DOMAINS)) {
    return { tier: 'social', tierLabel: 'Social/Opinion', tierNumber: 4 };
  }

  // 3. Tech reference / documentation sites — Tier 3
  if (matchesDomainList(hostname, TECH_REFERENCE_DOMAINS)) {
    return { tier: 'institutional', tierLabel: 'Tech Reference', tierNumber: 3 };
  }

  // 4. Default: unverified web — Tier 5
  return { tier: 'unknown', tierLabel: 'Unverified Web', tierNumber: 5 };
}
