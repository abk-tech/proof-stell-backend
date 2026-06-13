import { Injectable, Logger } from "@nestjs/common"
import type {
  AccessibilityIssue,
  AccessibilityReport,
  ImageWithAltText,
  IssueSeverity,
  SemanticContent,
  ValidationResult,
  WCAGGuideline,
} from "./accessibility.interface"

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WCAG_BASE_URL = "https://www.w3.org/WAI/WCAG21/Understanding"

/**
 * Alt-text patterns that are considered non-descriptive (decorative filenames,
 * generic labels, etc.).  Case-insensitive matching.
 */
const NON_DESCRIPTIVE_ALT_PATTERNS = [
  /^image\d*$/i,
  /^photo\d*$/i,
  /^img\d*$/i,
  /^picture\d*$/i,
  /^graphic\d*$/i,
  /^icon\d*$/i,
  /^logo\d*$/i,
  /^untitled\d*$/i,
  /^screenshot\d*$/i,
  /^dsc\d+$/i,
  /^img_\d+$/i,
]

/** Characters that suggest alt text was auto-generated from a filename. */
const FILENAME_EXTENSION_PATTERN = /\.(png|jpg|jpeg|gif|webp|svg|bmp|avif)$/i

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/avif",
  "image/bmp",
])

const ALT_TEXT_MIN_LENGTH = 5
const ALT_TEXT_MAX_LENGTH = 150

const WCAG_GUIDELINES: Record<string, WCAGGuideline> = {
  "1.1.1": {
    criterion: "1.1.1",
    level: "A",
    title: "Non-text Content",
    description: "All non-text content that is presented to the user has a text alternative.",
    reference: `${WCAG_BASE_URL}/non-text-content`,
  },
  "1.3.1": {
    criterion: "1.3.1",
    level: "A",
    title: "Info and Relationships",
    description: "Information, structure, and relationships conveyed through presentation can be programmatically determined.",
    reference: `${WCAG_BASE_URL}/info-and-relationships`,
  },
  "2.4.6": {
    criterion: "2.4.6",
    level: "AA",
    title: "Headings and Labels",
    description: "Headings and labels describe topic or purpose.",
    reference: `${WCAG_BASE_URL}/headings-and-labels`,
  },
  "4.1.2": {
    criterion: "4.1.2",
    level: "A",
    title: "Name, Role, Value",
    description: "For all UI components, the name and role can be programmatically determined.",
    reference: `${WCAG_BASE_URL}/name-role-value`,
  },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildIssueSummary(issues: AccessibilityIssue[]): Record<IssueSeverity, number> {
  const summary: Record<IssueSeverity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  }
  for (const issue of issues) {
    summary[issue.severity] = (summary[issue.severity] ?? 0) + 1
  }
  return summary
}

function wcagMeta(
  criterion: string,
): Pick<AccessibilityIssue, "wcagCriterion" | "wcagLevel" | "wcagReference"> {
  const guideline = WCAG_GUIDELINES[criterion]
  if (!guideline) return {}
  return {
    wcagCriterion: guideline.criterion,
    wcagLevel: guideline.level,
    wcagReference: guideline.reference,
  }
}

function isNonDescriptiveAltText(altText: string): boolean {
  const trimmed = altText.trim()
  return (
    NON_DESCRIPTIVE_ALT_PATTERNS.some((pattern) => pattern.test(trimmed)) ||
    FILENAME_EXTENSION_PATTERN.test(trimmed)
  )
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Injectable()
export class AccessibilityService {
  private readonly logger = new Logger(AccessibilityService.name)

  // ── Image validation ────────────────────────────────────────────────────

  /**
   * Validates an image object against WCAG 1.1.1 (Non-text Content).
   *
   * Handles the full range of cases:
   * - Decorative images (should have empty alt="")
   * - Missing or empty alt text
   * - Non-descriptive / filename-derived alt text
   * - Alt text that is too short or too long
   * - Invalid MIME types
   * - Missing dimensions (which affects CLS, not strictly WCAG but best practice)
   */
  validateImageAltText(image: ImageWithAltText, path: string): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = []

    // 1. URL is required
    if (!image.url || image.url.trim() === "") {
      issues.push({
        code: "IMAGE_MISSING_URL",
        message: "Image is missing a URL.",
        path: `${path}.url`,
        severity: "critical",
        suggestion: "Provide a valid, non-empty URL for the image.",
      })
      // No point validating further without a URL
      return issues
    }

    // 2. MIME type check (when provided)
    if (image.mimeType && !ALLOWED_IMAGE_MIME_TYPES.has(image.mimeType)) {
      issues.push({
        code: "UNSUPPORTED_IMAGE_MIME_TYPE",
        message: `Image MIME type '${image.mimeType}' is not a standard web image format.`,
        path: `${path}.mimeType`,
        severity: "medium",
        context: { url: image.url, mimeType: image.mimeType },
        suggestion: "Use a standard web image format such as JPEG, PNG, WebP, or SVG.",
      })
    }

    // 3. Decorative image must have explicit empty alt text
    if (image.isDecorative) {
      if (image.altText !== "") {
        issues.push({
          code: "DECORATIVE_IMAGE_SHOULD_HAVE_EMPTY_ALT",
          message: "Decorative images must have an empty alt attribute (alt='') so screen readers skip them.",
          path: `${path}.altText`,
          severity: "medium",
          context: { url: image.url, altText: image.altText },
          ...wcagMeta("1.1.1"),
          suggestion: 'Set altText to an empty string ("") for decorative images.',
        })
      }
      // No further alt-text rules apply to decorative images
      return issues
    }

    // 4. Non-decorative images require descriptive alt text
    const altText = image.altText

    if (altText === undefined || altText === null) {
      issues.push({
        code: "MISSING_ALT_TEXT",
        message: "Image is missing the alt attribute entirely.",
        path: `${path}.altText`,
        severity: "critical",
        context: { url: image.url },
        ...wcagMeta("1.1.1"),
        suggestion: "Add a descriptive alt attribute, or set isDecorative=true for presentational images.",
      })
      return issues
    }

    const trimmed = altText.trim()

    if (trimmed === "") {
      issues.push({
        code: "EMPTY_ALT_TEXT",
        message: "Image has an empty alt attribute but is not marked as decorative.",
        path: `${path}.altText`,
        severity: "high",
        context: { url: image.url },
        ...wcagMeta("1.1.1"),
        suggestion: "Either provide a meaningful description or set isDecorative=true.",
      })
      return issues
    }

    if (trimmed.length < ALT_TEXT_MIN_LENGTH) {
      issues.push({
        code: "ALT_TEXT_TOO_SHORT",
        message: `Alt text is only ${trimmed.length} character(s); it should be at least ${ALT_TEXT_MIN_LENGTH}.`,
        path: `${path}.altText`,
        severity: "low",
        context: { url: image.url, altText: trimmed },
        ...wcagMeta("1.1.1"),
        suggestion: "Provide a concise but descriptive alt text of at least 5 characters.",
      })
    }

    if (trimmed.length > ALT_TEXT_MAX_LENGTH) {
      issues.push({
        code: "ALT_TEXT_TOO_LONG",
        message: `Alt text is ${trimmed.length} characters; it should not exceed ${ALT_TEXT_MAX_LENGTH}. Consider using a longdesc or figure caption instead.`,
        path: `${path}.altText`,
        severity: "low",
        context: { url: image.url, altText: trimmed.substring(0, 50) + "…" },
        ...wcagMeta("1.1.1"),
        suggestion: "Keep alt text concise. For complex images, use a visible caption or longdesc.",
      })
    }

    if (isNonDescriptiveAltText(trimmed)) {
      issues.push({
        code: "NON_DESCRIPTIVE_ALT_TEXT",
        message: "Alt text appears to be auto-generated from a filename or is a generic placeholder.",
        path: `${path}.altText`,
        severity: "medium",
        context: { url: image.url, altText: trimmed },
        ...wcagMeta("1.1.1"),
        suggestion: "Replace the alt text with a description of what the image depicts.",
      })
    }

    // 5. Dimensions best-practice (not strict WCAG but affects CLS)
    if (!image.width || !image.height) {
      issues.push({
        code: "IMAGE_MISSING_DIMENSIONS",
        message: "Image is missing width or height attributes, which can cause layout shift.",
        path: `${path}`,
        severity: "info",
        context: { url: image.url },
        suggestion: "Provide explicit width and height to prevent Cumulative Layout Shift (CLS).",
      })
    }

    return issues
  }

  // ── Semantic content validation ─────────────────────────────────────────

  /**
   * Validates semantic content against WCAG 1.3.1, 2.4.6, and 4.1.2.
   */
  validateSemanticContent(content: SemanticContent, path: string): AccessibilityIssue[] {
    const issues: AccessibilityIssue[] = []

    // 1. Empty content check
    const hasVisibleContent = content.content && content.content.trim() !== ""
    const hasAriaLabel = content.ariaLabel && content.ariaLabel.trim() !== ""
    const isHiddenFromAT = content.ariaHidden === true

    if (!hasVisibleContent && !hasAriaLabel && !isHiddenFromAT) {
      issues.push({
        code: "EMPTY_CONTENT",
        message: `'${content.type}' element has no visible text or aria-label.`,
        path: `${path}.content`,
        severity: "medium",
        ...wcagMeta("1.3.1"),
        suggestion: `Provide visible text or an aria-label for this ${content.type} element.`,
      })
    }

    // 2. Heading-specific rules
    if (content.type === "heading") {
      if (!content.level || content.level < 1 || content.level > 6) {
        issues.push({
          code: "INVALID_HEADING_LEVEL",
          message: `Heading has an invalid level: ${content.level ?? "(none)"}. Must be between 1 and 6.`,
          path: `${path}.level`,
          severity: "high",
          context: { content: content.content, level: content.level },
          ...wcagMeta("2.4.6"),
          suggestion: "Set the heading level to a number between 1 (most important) and 6.",
        })
      }
    }

    // 3. Interactive element label checks (button / link)
    if (content.type === "button" || content.type === "link") {
      const hasAccessibleName =
        hasVisibleContent || hasAriaLabel || (content.labelledBy && content.labelledBy.trim() !== "")

      if (!hasAccessibleName && !isHiddenFromAT) {
        issues.push({
          code: "INTERACTIVE_ELEMENT_MISSING_LABEL",
          message: `'${content.type}' element has no accessible name (no visible text, aria-label, or aria-labelledby).`,
          path: `${path}.content`,
          severity: "critical",
          context: { content: content.content },
          ...wcagMeta("4.1.2"),
          suggestion: `Add visible text, an aria-label, or an aria-labelledby pointing to a labelling element.`,
        })
      }

      // Links must have an href-equivalent in the data
      if (content.type === "link" && !content.content.trim() && !hasAriaLabel) {
        issues.push({
          code: "EMPTY_LINK",
          message: "Link element has no descriptive text, making it unusable by screen reader users.",
          path: `${path}.content`,
          severity: "high",
          ...wcagMeta("4.1.2"),
          suggestion: "Provide descriptive link text that conveys the destination or action.",
        })
      }
    }

    // 4. Form input must be associated with a label
    if (content.type === "input") {
      const hasLabel =
        hasAriaLabel ||
        (content.labelledBy && content.labelledBy.trim() !== "") ||
        (content.ariaDescribedBy && content.ariaDescribedBy.trim() !== "")

      if (!hasLabel) {
        issues.push({
          code: "INPUT_MISSING_LABEL",
          message: "Form input is not associated with a label.",
          path: `${path}`,
          severity: "critical",
          ...wcagMeta("4.1.2"),
          suggestion: "Associate a <label> element via labelledBy, or add an aria-label attribute.",
        })
      }
    }

    // 5. Language attribute check (when provided but invalid)
    if (content.lang !== undefined) {
      const langPattern = /^[a-z]{2,3}(-[A-Z]{2,3})?$/
      if (!langPattern.test(content.lang)) {
        issues.push({
          code: "INVALID_LANG_ATTRIBUTE",
          message: `Language tag '${content.lang}' does not appear to be a valid BCP 47 language tag.`,
          path: `${path}.lang`,
          severity: "low",
          context: { lang: content.lang },
          suggestion: "Use a valid BCP 47 language tag, e.g. 'en', 'fr', or 'pt-BR'.",
        })
      }
    }

    return issues
  }

  // ── Batch / composite helpers ───────────────────────────────────────────

  /**
   * Validates an array of images and returns a consolidated ValidationResult.
   */
  validateImages(images: ImageWithAltText[], basePath = "images"): ValidationResult {
    const issues = images.flatMap((img, i) =>
      this.validateImageAltText(img, `${basePath}[${i}]`),
    )
    return {
      isValid: issues.every((i) => i.severity !== "critical" && i.severity !== "high"),
      issues,
      summary: buildIssueSummary(issues),
    }
  }

  /**
   * Validates an array of semantic content blocks and returns a consolidated ValidationResult.
   */
  validateContentBlocks(blocks: SemanticContent[], basePath = "content"): ValidationResult {
    const issues = blocks.flatMap((block, i) =>
      this.validateSemanticContent(block, `${basePath}[${i}]`),
    )
    return {
      isValid: issues.every((i) => i.severity !== "critical" && i.severity !== "high"),
      issues,
      summary: buildIssueSummary(issues),
    }
  }

  // ── Report processing ───────────────────────────────────────────────────

  /**
   * Ingests an accessibility report (e.g., from a CI/CD pipeline), logs it,
   * and returns a structured summary.
   */
  processAccessibilityReport(report: AccessibilityReport): ValidationResult {
    this.logger.log(
      `Accessibility report received — ID: ${report.reportId} | URL: ${report.url} | Tool: ${report.tool} | Issues: ${report.issues.length}`,
    )

    if (report.score !== undefined) {
      const level = report.score >= 90 ? "log" : report.score >= 70 ? "warn" : "error"
      this.logger[level](`Accessibility score: ${report.score}/100`)
    }

    const summary = buildIssueSummary(report.issues)

    for (const [severity, count] of Object.entries(summary)) {
      if (count > 0) {
        const logFn = severity === "critical" || severity === "high" ? "error" : "warn"
        this.logger[logFn](`  ${severity.toUpperCase()}: ${count} issue(s)`)
      }
    }

    for (const issue of report.issues) {
      const logFn = issue.severity === "critical" || issue.severity === "high" ? "error" : "warn"
      this.logger[logFn](
        `[${issue.severity.toUpperCase()}] ${issue.code} — ${issue.message} (path: ${issue.path})${
          issue.wcagCriterion ? ` [WCAG ${issue.wcagCriterion}]` : ""
        }`,
      )
    }

    const result: ValidationResult = {
      isValid: summary.critical === 0 && summary.high === 0,
      issues: report.issues,
      summary,
    }

    // Extend here: persist to DB, fire webhook, alert on-call, etc.
    // await this.reportRepository.save({ ...report, summary });
    // if (!result.isValid) await this.alertService.notify(report);

    return result
  }

  // ── Reference data ──────────────────────────────────────────────────────

  /**
   * Returns a structured map of WCAG 2.1 guidelines relevant to backend data.
   */
  getWCAGGuidelines(): Record<string, WCAGGuideline> {
    return { ...WCAG_GUIDELINES }
  }

  /**
   * Returns a plain-text summary of WCAG 2.1 principles (backwards-compatible).
   */
  getWCAGGuidelinesSummary(): string {
    const lines: string[] = ["WCAG 2.1 Guidelines (backend-relevant subset):"]
    for (const g of Object.values(WCAG_GUIDELINES)) {
      lines.push(`  ${g.criterion} [${g.level}] — ${g.title}: ${g.description}`)
      lines.push(`    Reference: ${g.reference}`)
    }
    return lines.join("\n")
  }
}