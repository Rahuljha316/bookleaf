/**
 * BookLeaf Knowledge Base
 *
 * Source of truth: FULLSTACK-ASSIGNMENT1 (1).docx (1) (1).pdf
 *
 * This module encodes all support-relevant policies and workflows extracted
 * from the assignment PDF. It is the single authoritative location for KB
 * content — do NOT duplicate this information in prompt strings or other files.
 *
 * Usage:
 *   getRelevantKBSections(subject, description, conversationText)
 *   → returns a focused subset of KB sections as a formatted string
 *     for inclusion in an AI prompt, avoiding unnecessary token usage.
 */

// ─── Knowledge Base Sections ──────────────────────────────────────────────────

/**
 * Each section has:
 *  - id: stable identifier used in relevance matching
 *  - title: human-readable heading
 *  - keywords: terms that signal relevance when found in ticket text
 *  - content: the policy text to inject into the AI prompt
 */
interface KBSection {
  id: string;
  title: string;
  keywords: string[];
  content: string;
}

const KB_SECTIONS: KBSection[] = [
  {
    id: 'company_overview',
    title: 'Company Overview',
    keywords: [
      'publishing package', 'standard free', 'bestseller breakthrough',
      'publishing plan', 'package upgrade', 'company overview', 'about bookleaf',
    ],
    content: `BookLeaf Publishing is a self-publishing company operating in India and the US.
Publishing packages offered:
  - Standard Free: no upfront cost.
  - Bestseller Breakthrough: premium paid package with marketing and distribution add-ons.
BookLeaf handles cover design, typesetting, ISBN assignment, printing, distribution, and royalty management.
In-house printing facility and warehouse are located in Delhi. Print partners include Repro India and Epitome Books.`,
  },

  {
    id: 'royalty_policy',
    title: 'Royalty Policy',
    keywords: [
      'royalty', 'royalties', 'payment', 'payout', 'paid', 'unpaid', 'pending',
      'money', 'earnings', 'income', 'revenue', 'sales', 'copies sold', 'amount',
      'low royalty', 'not received', 'not paid', "haven't received",
    ],
    content: `BookLeaf Royalty Policy:
  - Split: 80% of net profit per book goes to the author; 20% to BookLeaf.
  - Net profit formula: MRP minus printing cost, platform commission (Amazon/Flipkart), and shipping charges.
  - Calculation cycle: Royalties are calculated quarterly (every 3 months).
  - Payment window: Paid within 45 days after the quarter ends.
    Quarter end dates: 31 March, 30 June, 30 September, 31 December.
  - Minimum payout threshold: ₹1,000. If accumulated royalties are below ₹1,000 they roll over to the next quarter.
  - Payment method: Bank transfer to the account linked in the author's dashboard. Authors must ensure bank details are up to date.
  - Authors can view a detailed royalty breakdown (sales per platform) in their dashboard.
  - If a payment is genuinely overdue after the 45-day window, escalate to the finance team with a 48-hour resolution timeline.`,
  },

  {
    id: 'isbn_policy',
    title: 'ISBN & Metadata Policy',
    keywords: [
      'isbn', 'metadata', 'imprint', 'barcode', 'duplicate isbn', 'wrong isbn',
      'different isbn', 'book description', 'update description', 'amazon description',
      'metadata update',
    ],
    content: `BookLeaf ISBN & Metadata Policy:
  - Every book published through BookLeaf receives a unique ISBN assigned by BookLeaf.
  - ISBNs are registered under BookLeaf's publisher imprint.
  - If an author wants an ISBN under their own imprint, they must obtain it independently (BookLeaf cannot issue one under a third-party imprint).
  - ISBN errors (duplicate ISBN, wrong book linked, mismatched ISBN on platforms) are treated as HIGH-PRIORITY issues and must be escalated to the production team immediately with a 48-hour resolution timeline.
  - Metadata updates (book description, author bio, keywords): can be submitted through the author dashboard or by emailing the BookLeaf team. Changes typically reflect on platforms within 3–5 business days.`,
  },

  {
    id: 'printing_quality',
    title: 'Printing & Quality',
    keywords: [
      'print', 'printing', 'quality', 'blurry', 'misprint', 'binding', 'defect',
      'defective', 'damaged', 'color', 'alignment', 'misaligned', 'pages',
      'author copies', 'reprint', 'physical copy', 'book copy',
    ],
    content: `BookLeaf Printing & Quality Policy:
  - Standard print turnaround: 5–7 business days from order confirmation.
  - In-house printing handles most orders. Overflow or specific format requirements go to Repro India or Epitome Books.
  - Quality issues (misprints, binding defects, blurry images, color inconsistency, page misalignment):
      1. Apologise sincerely.
      2. Ask the author to share photos/evidence of the defective copies.
      3. Once verified, BookLeaf arranges a FREE reprint.
      4. Reprint timeline: 5–7 business days after verification.
  - Authors should not be asked to pay for defects that are BookLeaf's responsibility.`,
  },

  {
    id: 'distribution_availability',
    title: 'Distribution & Availability',
    keywords: [
      'amazon', 'flipkart', 'available', 'unavailable', 'out of stock',
      'not available', 'listed', 'listing', 'distribution', 'platform', 'sold out',
      'currently unavailable', 'stock sync',
    ],
    content: `BookLeaf Distribution & Availability Policy:
  - Books are listed on: Amazon India, Flipkart, Amazon US, Amazon UK, and the BookLeaf Store.
  - New listings typically go live within 7–10 business days after publication is complete.
  - If a book shows as "Currently Unavailable" or "Out of Stock" on a platform:
      - This is typically a stock sync issue between BookLeaf's inventory system and the platform.
      - BookLeaf's team can trigger a re-sync with the distribution team.
      - Expected resolution: 24–48 hours for the listing to go live again.
  - If a book has never appeared on a platform, check whether the 7–10 business day window has elapsed since publication.`,
  },

  {
    id: 'production_stages',
    title: 'Book Production Stages',
    keywords: [
      'production stage', 'production progress', 'typesetting', 'editing',
      'cover design', 'proofreading', 'proofread', 'when will', 'manuscript',
      'book production', 'production timeline', 'production delay',
    ],
    content: `BookLeaf Book Production Stages (in order):
  1. Manuscript Received
  2. Editing (if the author opted for editing service)
  3. Cover Design
  4. Typesetting
  5. Proofreading
  6. ISBN Assignment
  7. Printing
  8. Distribution Setup
  9. Published & Live

Authors receive email updates at each stage transition.

Common delay points:
  - Cover Design: often delayed waiting for author approval of the cover proof.
  - Proofreading: may take additional time if revision rounds are needed.

When responding to production delay questions:
  - Check the actual current production status of the book.
  - If delayed, be honest about the reason (e.g., awaiting author approval).
  - Provide a specific updated timeline — never an open-ended "soon".
  - Frame delays collaboratively, never blaming the author even if they caused the delay.`,
  },

  {
    id: 'communication_tone',
    title: 'Communication Tone Guidelines',
    keywords: [],  // Always included as a base section
    content: `BookLeaf Communication Tone Guidelines:
  - Always be empathetic and professional. Authors are our partners, not customers to be managed.
  - Acknowledge the author's concern before jumping to solutions.
  - Be specific: include actual numbers, dates, and statuses wherever possible rather than vague reassurances.
  - If something is BookLeaf's fault (delayed royalties, ISBN error), own it directly — no corporate deflection.
  - If the issue requires escalation or investigation, give a clear timeline (e.g., "Our team will look into this and get back to you within 48 hours") rather than open-ended promises.
  - Always end with a clear next step for the author and/or the BookLeaf team.
  - IMPORTANT: If specific ticket data (payout date, production stage, royalty figures) is not available in the ticket context, ask the author for clarification or state that you will check and follow up — do NOT invent numbers or dates.`,
  },
];

// The communication tone section is always included; it is the baseline.
const ALWAYS_INCLUDED_SECTION_IDS = new Set(['communication_tone']);

// ─── Relevance Selection ──────────────────────────────────────────────────────

/**
 * Returns a formatted string of Knowledge Base sections relevant to the given
 * ticket context.
 *
 * Strategy (simple keyword matching — no embeddings needed for a small KB):
 *  - The communication_tone section is always included.
 *  - Other sections are included when at least one of their keywords appears
 *    in the combined ticket text (case-insensitive).
 *  - If no optional section matches, include all sections as a safe fallback
 *    (the ticket may be unusual or the subject very brief).
 *
 * Token cost awareness: for a small KB like this, sending all sections is
 * reasonable. For a large KB, only matched sections are sent.
 *
 * @param subject  - Ticket subject line
 * @param description - Ticket description text
 * @param conversationText - Concatenated public message text (optional)
 * @param category - Ticket category (optional)
 */
export function getRelevantKBSections(
  subject: string,
  description: string,
  conversationText?: string,
  category?: string,
): string {
  const categoryStr = category ?? '';
  const haystack = [subject, description, conversationText ?? '', categoryStr]
    .join(' ')
    .toLowerCase();

  const matched: KBSection[] = [];
  const optional: KBSection[] = [];

  for (const section of KB_SECTIONS) {
    if (ALWAYS_INCLUDED_SECTION_IDS.has(section.id)) {
      matched.push(section);
      continue;
    }
    optional.push(section);

    // Direct mapping from ticket category
    const categoryMatches =
      (categoryStr === 'Royalty & Payments' && section.id === 'royalty_policy') ||
      (categoryStr === 'ISBN & Metadata Issues' && section.id === 'isbn_policy') ||
      (categoryStr === 'Printing & Quality' && section.id === 'printing_quality') ||
      (categoryStr === 'Distribution & Availability' && section.id === 'distribution_availability') ||
      (categoryStr === 'Book Status & Production Updates' && section.id === 'production_stages');

    const keywordMatches = section.keywords.some((kw) => haystack.includes(kw.toLowerCase()));

    if (categoryMatches || keywordMatches) {
      matched.push(section);
    }
  }

  // Safety fallback: if nothing optional matched, include all sections.
  // This avoids leaving the AI without any policy context for unusual queries.
  const sectionsToInclude =
    matched.length === 1 // only tone section matched
      ? [...matched, ...optional]
      : matched;

  return sectionsToInclude
    .map((s) => `### ${s.title}\n${s.content}`)
    .join('\n\n');
}

/**
 * Returns the full Knowledge Base as a formatted string.
 * Used when the ticket context is too broad to filter.
 */
export function getFullKnowledgeBase(): string {
  return KB_SECTIONS.map((s) => `### ${s.title}\n${s.content}`).join('\n\n');
}

