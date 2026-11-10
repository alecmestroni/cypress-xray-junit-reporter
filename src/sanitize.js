// Sanitization of the content written to the report (and therefore uploaded to Xray / stored as CI artifact).

const REDACTED = "[REDACTED]"

// Names of headers / fields whose value is a secret. Matched as a whole word followed by ":" or "=",
// e.g. `Authorization: Bearer abc`, `"password": "abc"`, `?token=abc`
const SECRET_KEYS = [
  "authorization",
  "proxy-authorization",
  "x-api-key",
  "api[-_]?key",
  "x-auth-token",
  "access[-_]?token",
  "refresh[-_]?token",
  "id[-_]?token",
  "auth[-_]?token",
  "token",
  "client[-_]?secret",
  "secret",
  "password",
  "passwd",
  "pwd",
]

// value: quoted string, auth scheme + credentials, or a bare value up to a delimiter
const VALUE = `(?:"(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|(?:Bearer|Basic|Digest|Token)\\s+[^\\s"',;&}\\]]+|[^\\s"',;&}\\]]+)`

const DEFAULT_PATTERNS = [
  // Cookie / Set-Cookie: the value holds several cookies separated by ";", redact the whole value
  // (quoted value, or everything up to the end of the line)
  {
    regex: /(["']?)\b((?:set-)?cookie)\b\1(\s*[:=]\s*)(?:"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|[^\r\n"'}]+)/gi,
    replace: (match, quote, key, separator) => `${quote}${key}${quote}${separator}${REDACTED}`,
  },
  // key: value / key=value / "key": "value"
  {
    regex: new RegExp(`(["']?)\\b(${SECRET_KEYS.join("|")})\\b\\1(\\s*[:=]\\s*)${VALUE}`, "gi"),
    replace: (match, quote, key, separator) => `${quote}${key}${quote}${separator}${REDACTED}`,
  },
  // credentials not preceded by a known key: at least 12 characters and at least one digit or "+/=",
  // so that ordinary words ("Basic authentication") are not redacted
  {
    regex: /\b(Bearer|Basic)\s+(?=[A-Za-z0-9\-._~+/]*[0-9+/=])[A-Za-z0-9\-._~+/]{12,}=*/g,
    replace: (match, scheme) => `${scheme} ${REDACTED}`,
  },
  // JSON Web Tokens
  { regex: /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]*/g, replace: () => REDACTED },
  // credentials in URLs: https://user:password@host
  { regex: /\b([a-z][a-z0-9+.-]*:\/\/[^\s:/@]+):[^\s@/]+@/gi, replace: (match, prefix) => `${prefix}:${REDACTED}@` },
]

// A redactPatterns entry: RegExp, string (source of the regex) or { pattern, flags } (e.g. { pattern: "secret", flags: "i" }).
// An invalid entry stops the reporter with a clear error: silently skipping it would leak what it should redact.
function toRegExp(entry) {
  if (entry instanceof RegExp) {
    return entry.flags.includes("g") ? entry : new RegExp(entry.source, entry.flags + "g")
  }
  const isObject = entry !== null && typeof entry === "object"
  const source = isObject ? entry.pattern : entry
  const flags = isObject && entry.flags ? String(entry.flags) : ""
  if (typeof source !== "string" || source === "") {
    throw new Error(`cypress-xray-junit-reporter: invalid redactPatterns entry ${JSON.stringify(entry)}: expected a RegExp, a string or { pattern, flags }`)
  }
  try {
    return new RegExp(source, flags.includes("g") ? flags : flags + "g")
  } catch (error) {
    throw new Error(`cypress-xray-junit-reporter: invalid redactPatterns entry ${JSON.stringify(entry)}: ${error.message}`)
  }
}

/**
 * Builds the redaction function from the reporter options.
 * @param {boolean} redactSecrets - apply the built-in patterns (default true)
 * @param {Array<string|RegExp|{pattern: string, flags?: string}>} redactPatterns - additional patterns, every match is replaced with [REDACTED]
 * @returns {(text: string) => string}
 */
function createRedactor(redactSecrets, redactPatterns) {
  const patterns = redactSecrets ? [...DEFAULT_PATTERNS] : []
  const extra = Array.isArray(redactPatterns) ? redactPatterns : redactPatterns ? [redactPatterns] : []
  extra.forEach((pattern) => patterns.push({ regex: toRegExp(pattern), replace: () => REDACTED }))

  return function redact(text) {
    if (!text || typeof text !== "string") {
      return text
    }
    return patterns.reduce((result, { regex, replace }) => result.replace(regex, replace), text)
  }
}

/**
 * Escapes Jira wiki markup, so that text coming from tests (e.g. error messages quoting the page under test)
 * cannot inject links, images, macros or formatting in Xray comments.
 */
function escapeJiraMarkup(text) {
  if (!text) {
    return text
  }
  return String(text).replace(/[\\{}[\]!|*_^~+\-?#]/g, (char) => `\\${char}`)
}

module.exports = { REDACTED, createRedactor, escapeJiraMarkup }
