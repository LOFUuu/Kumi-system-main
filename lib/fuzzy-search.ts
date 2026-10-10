// Levenshtein Distance algorithm to calculate edit distance between two strings
export function getLevenshteinDistance(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 0;
  if (!s1.length) return s2.length;
  if (!s2.length) return s1.length;

  const dp: number[][] = Array.from({ length: s1.length + 1 }, () =>
    Array(s2.length + 1).fill(0)
  );

  for (let i = 0; i <= s1.length; i++) dp[i][0] = i;
  for (let j = 0; j <= s2.length; j++) dp[0][j] = j;

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[s1.length][s2.length];
}

// Calculate similarity score between 0.0 and 1.0
export function getStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (!s1 || !s2) return 0;
  if (s1 === s2) return 1.0;

  // Prefix match boost
  if (s2.startsWith(s1) || s1.startsWith(s2)) return 0.9;
  // Substring match boost
  if (s2.includes(s1) || s1.includes(s2)) return 0.8;

  const distance = getLevenshteinDistance(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);
  return Math.max(0, 1 - distance / maxLen);
}

export interface SearchTarget {
  id: string;
  title: string;
  category: "Navigation" | "House Listing" | "Amenity" | "Resident Feature";
  href: string;
  keywords: string[];
  roleRequired?: "resident" | "authenticated";
}

export const SYSTEM_SEARCH_TARGETS: SearchTarget[] = [
  {
    id: "house-listings",
    title: "House Listings",
    category: "Navigation",
    href: "/house-listing",
    keywords: ["house", "houses", "house listings", "hous", "home", "homes", "property", "properties", "real estate"],
  },
  {
    id: "available-houses",
    title: "Available Houses",
    category: "House Listing",
    href: "/house-listing?type=all",
    keywords: ["available", "availble", "available houses", "available homes", "vacant", "for sale", "for rent"],
  },
  {
    id: "for-sale",
    title: "Properties For Sale",
    category: "House Listing",
    href: "/house-listing?type=sale",
    keywords: ["sale", "for sale", "buy house", "buying house", "property for sale"],
  },
  {
    id: "for-rent",
    title: "Properties For Rent",
    category: "House Listing",
    href: "/house-listing?type=rent",
    keywords: ["rent", "for rent", "rental", "lease", "house for rent"],
  },
  {
    id: "amenities",
    title: "Amenities",
    category: "Navigation",
    href: "/reservation",
    keywords: [
      "amenities",
      "amenit",
      "ammenitie",
      "amenity",
      "swimming pool",
      "pool",
      "covered court",
      "court",
      "basketball",
      "clubhouse",
      "community amenities",
      "facility",
    ],
  },
  {
    id: "schedule-viewing",
    title: "Schedule a Viewing",
    category: "House Listing",
    href: "/house-listing",
    keywords: ["viewing", "viewng", "schedule viewing", "visit property", "schedule a viewing", "appointment"],
  },
  {
    id: "location",
    title: "Subdivision Location & Map",
    category: "Navigation",
    href: "/map",
    keywords: ["location", "locaton", "lokasyon", "map", "community map", "directions", "where is phase 5", "phase 5"],
    roleRequired: "authenticated",
  },
  {
    id: "monthly-dues",
    title: "Monthly Dues",
    category: "Resident Feature",
    href: "/my-dues",
    keywords: ["dues", "dus", "monthly dues", "hoa fee", "hoa dues", "billing", "pay dues", "gcash payment"],
    roleRequired: "resident",
  },
  {
    id: "my-history",
    title: "My Activity History",
    category: "Resident Feature",
    href: "/history",
    keywords: ["history", "my history", "my reservations", "past payments", "receipts", "transactions"],
    roleRequired: "resident",
  },
  {
    id: "announcements",
    title: "HOA Announcements",
    category: "Navigation",
    href: "/announcements",
    keywords: ["announcements", "news", "updates", "hoa news", "bulletin"],
    roleRequired: "authenticated",
  },
];

export interface SuggestionResult {
  target: SearchTarget;
  score: number;
  isDidYouMean?: boolean;
  matchedKeyword?: string;
}

export function findSmartSuggestions(
  query: string,
  userRole?: string | null
): { suggestions: SuggestionResult[]; didYouMean?: SearchTarget } {
  const q = query.toLowerCase().trim();
  if (!q) return { suggestions: [] };

  const validTargets = SYSTEM_SEARCH_TARGETS.filter((t) => {
    if (t.roleRequired === "authenticated" && !userRole) return false;
    if (t.roleRequired === "resident" && userRole === "non_resident") return false;
    if (t.roleRequired === "resident" && !userRole) return false;
    return true;
  });

  const scored: { target: SearchTarget; score: number; keyword: string }[] = [];

  for (const target of validTargets) {
    let maxScore = 0;
    let bestKeyword = target.title;

    // Check title match
    const titleScore = getStringSimilarity(q, target.title);
    if (titleScore > maxScore) {
      maxScore = titleScore;
      bestKeyword = target.title;
    }

    // Check keywords
    for (const kw of target.keywords) {
      const score = getStringSimilarity(q, kw);
      if (score > maxScore) {
        maxScore = score;
        bestKeyword = kw;
      }
    }

    if (maxScore >= 0.45) {
      scored.push({ target, score: maxScore, keyword: bestKeyword });
    }
  }

  scored.sort((a, b) => b.score - a.score);

  // Check if top match is a typo correction (score between 0.55 and 0.85 when no exact match exists)
  const exactOrPrefix = scored.some(
    (s) => s.target.title.toLowerCase().startsWith(q) || s.keyword.toLowerCase().startsWith(q)
  );

  let didYouMean: SearchTarget | undefined = undefined;
  if (!exactOrPrefix && scored.length > 0 && scored[0].score >= 0.55) {
    didYouMean = scored[0].target;
  }

  const suggestions = scored.slice(0, 5).map((s) => ({
    target: s.target,
    score: s.score,
    matchedKeyword: s.keyword,
  }));

  return { suggestions, didYouMean };
}
