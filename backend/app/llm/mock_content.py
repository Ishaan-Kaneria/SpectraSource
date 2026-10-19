"""Plausible sample deliverables for the offline mock provider.

Everything is derived from the text inside the prompt's <source> tags with simple,
deterministic heuristics (sentences, CVE IDs, product versions, severity words), so demos
look real without a model or network. Builders are keyed by the Pydantic schema title."""

import hashlib
import re
from collections import Counter
from collections.abc import Callable, Iterable
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

# ---------- prompt parsing ----------

_PARAMS = {"audience": "Target audience", "tone": "Tone", "detail": "Level of detail", "objective": "Communication objective"}


@dataclass(frozen=True)
class Brief:
    """The operator parameters the mock pays attention to."""

    audience: str = "general public"
    tone: str = "professional"
    detail: int = 1  # 0 brief, 1 medium, 2 detailed
    objective: str = "inform"


def parse_prompt(user: str) -> tuple[str, Brief]:
    """Split a generator prompt into the exact source text and the operator parameters."""
    start, end = user.find("<source>"), user.rfind("</source>")
    if start == -1 or end < start:
        return user, Brief()
    head, body = user[:start], user[start + len("<source>") : end]
    body = body[1:] if body.startswith("\n") else body
    body = body[:-1] if body.endswith("\n") else body
    found = {}
    for key, label in _PARAMS.items():
        m = re.search(rf"^- {label}: (.+)$", head, re.M)
        if m and m.group(1).strip():
            found[key] = m.group(1).strip()
    detail = {"brief": 0, "medium": 1, "detailed": 2}.get(found.pop("detail", ""), 1)
    return body, Brief(detail=detail, **found)


# ---------- source analysis ----------

_MARKER = re.compile(r"^\s*(?:\[[^\]\n]*\]|Operator context:)\s*$", re.M | re.I)
_BULLET = re.compile(r"^\s*(?:[-*•]|\d{1,2}[.)])\s+")
_SPLIT = re.compile(r"(?<=[.!?])\s+(?=[\"'(\[]?[A-Z0-9])")
_CVE = re.compile(r"\bCVE-\d{4}-\d{4,7}\b", re.I)
_PRODUCT = re.compile(r"\b((?:[a-z]?[A-Z][\w+-]*\s+){0,2}[a-z]?[A-Z][\w+-]*)\s+(?:version\s+|v)?(\d+(?:\.\d+)+)\b")
_FIX_CONTEXT = re.compile(r"\b(?:upgrad|updat|migrat|mov)\w*\s+to\s+$|\b(?:fixed|patched|resolved|addressed)\s+in\s+$", re.I)
_CVSS = re.compile(r"\bCVSS(?:\s*v?\d(?:\.\d)?)?[^0-9]{0,20}(\d{1,2}\.\d)", re.I)
_URL = re.compile(r"https?://[^\s<>\"')\]]+")
_STAT = re.compile(r"(?<![\w.,-])(\d+(?:\.\d+)?%|(?:\d{1,3}(?:,\d{3})+|\d+)\+?)((?:\s+[a-z][a-z-]*){0,3})")
_SECURITY = re.compile(r"vulnerab|exploit|malware|ransomware|phishing|breach|cyber|attack|intrusion|backdoor|botnet|ddos", re.I)
_IMPACT = re.compile(
    r"\b(?:allow\w*|could|may|might|enabl\w+|leads? to|result\w* in|impact\w*|attackers?|exfiltrat\w*"
    r"|disrupt\w*|compromis\w*|steal\w*|theft|loss|outage|damage\w*|expos\w+|risks?)\b",
    re.I,
)
_STRONG = re.compile(r"\b(?:could|may|might|leads? to|result\w* in|impact\w*|theft|loss|outage)\b", re.I)
_ACTION = re.compile(
    r"^(?:patch|update|upgrade|apply|install|disable|restrict|block|monitor|review|enable|rotate|reset|report"
    r"|avoid|ensure|check|verify|use|back up)\b|\b(?:should|must|(?:are|is) (?:urged|advised|encouraged)|recommend\w*)\b",
    re.I,
)
_SEVERITY = (
    ("Critical", r"\bcritical\b(?!\s+(?:infrastructure|sectors?|services))"),
    ("High", r"\bhigh[- ](?:severity|risk|impact)\b|\bseverity(?: rating)?(?: of|:)? high\b|\bsevere\b"),
    ("Medium", r"\b(?:medium|moderate)(?:[- ](?:severity|risk))?\b"),
    ("Low", r"\blow[- ](?:severity|risk|impact)\b"),
)
_ORGS = ("CERT-In", "NCIIPC", "CISA", "NCSC", "ENISA", "NIST", "MeitY", "CERT-EU", "ACSC", "FBI", "NSA")
_SECTORS = (
    (r"\bgovernment|\bministr|public sector", "Government departments"),
    (r"\bhealth|\bhospital", "Healthcare providers"),
    (r"\bbank|\bfinanc", "Banks and financial institutions"),
    (r"\benergy|\bpower grid|\butilit", "Energy and utilities"),
    (r"\btelecom", "Telecom operators"),
    (r"\beducation|\buniversit|\bschool", "Education institutions"),
    (r"critical infrastructure", "Critical infrastructure operators"),
    (r"\bsmall business|\bm?smes?\b", "Small and medium businesses"),
    (r"\bcitizens|\bconsumers|\bend users|\bhome users", "Members of the public"),
)
_NOT_PRODUCT = set(
    "the a an in on at of for and or to version versions release update patch before after prior through from until "
    "since section table figure page chapter step install upgrade apply run use deploy affects affected including".split()
)
_FIX_VERBS = {"install", "upgrade", "update", "apply", "deploy"}
_STOP = set(
    "about above after again also among another because been before being below between both but cannot could does "
    "doing down during each from further have having here into itself just more most must only other over same should "
    "some such than that their them then there these they this those through under until very were what when where "
    "which while will with within without would your yours reports report reported said says according including "
    "allowing using used make made many much like well ensure based january february march april june july august "
    "september october november december monday tuesday wednesday thursday friday saturday sunday".split()
)
_GENERIC = ("The submitted material contains little readable text.", "Confirm details against the original source before publishing.")


@dataclass(frozen=True)
class Source:
    """Facts pulled out of the source text."""

    sentences: list[str]
    title: str
    headline: str  # the title without an "Advisory XYZ:" style prefix
    cves: list[str]
    products: list[str]  # affected ones, e.g. "Example VPN 4.2"
    product_names: list[str]  # "Example VPN"
    orgs: list[str]
    severity: str
    cvss: str | None
    security: bool
    stats: list[tuple[str, str]]  # ("3,000", "internet-facing devices")
    urls: list[str]
    sectors: list[str]
    keywords: list[str]
    digest: str

    @property
    def body(self) -> list[str]:
        """Sentences after the title, or whatever there is."""
        return self.sentences[1:] or self.sentences or list(_GENERIC)

    def sent(self, i: int) -> str:
        pool = self.sentences or list(_GENERIC)
        return pool[min(i, len(pool) - 1)]

    @property
    def subject(self) -> str:
        return (self.products or self.cves or [_words(self.headline, 5)])[0]

    def mention(self, needle: str) -> str:
        """The first body sentence that mentions `needle`, else the title."""
        return next((s for s in self.body if needle.lower() in s.lower()), self.sent(0))

    def impacts(self, used: int = 0, n: int = 2, repeat: bool = True) -> list[str]:
        """Up to `n` impact sentences after the first `used` (falling back to those if `repeat`),
        strongest wording first."""
        pool = [s for s in self.sentences if _IMPACT.search(s)]
        fresh = [s for s in pool if s not in self.sentences[:used]] or (pool if repeat else [])
        chosen = sorted(fresh, key=lambda s: -len(_STRONG.findall(s)))[:n]
        return [s for s in fresh if s in chosen]


def _dedupe(items: Iterable[Any]) -> list[Any]:
    """Drop empties and (case-insensitive) repeats, keeping first-seen order."""
    out: dict[Any, Any] = {}
    for x in items:
        if x:
            out.setdefault(x.lower() if isinstance(x, str) else x, x)
    return list(out.values())


def _sentences(text: str) -> list[str]:
    chunks: list[str] = []
    for para in re.split(r"\n\s*\n", text):
        lines = [ln.strip() for ln in para.splitlines() if ln.strip()]
        wrapped = sum(ln[-1] in ".!?:" for ln in lines[:-1]) * 2 < len(lines) - 1
        if len(lines) > 1 and wrapped and not any(_BULLET.match(ln) for ln in lines):
            lines = [" ".join(lines)]  # prose wrapped across lines, e.g. from a PDF
        for line in lines:
            chunks += [s.strip(" #>*") for s in _SPLIT.split(_BULLET.sub("", line))]
    chunks = [c for c in chunks if c]
    return _dedupe([c for c in chunks if len(c.split()) >= 3] or chunks)[:200]


def _products(text: str) -> list[tuple[str, str]]:
    """(name, version) pairs, skipping fixed versions such as "upgrade to Example VPN 4.3"."""
    out = []
    for m in _PRODUCT.finditer(text):
        words, dropped = m.group(1).split(), set()
        while words and words[0].lower() in _NOT_PRODUCT:
            dropped.add(words.pop(0).lower())
        fixed = dropped & _FIX_VERBS or _FIX_CONTEXT.search(text[max(0, m.start() - 30) : m.start()])
        if words and not fixed and words[-1] not in ("CVE", "CVSS"):
            out.append((" ".join(words), m.group(2)))
    return _dedupe(out)


def _stats(text: str) -> list[tuple[str, str]]:
    out = []
    for m in _STAT.finditer(text):
        num, words = m.group(1), m.group(2).split()
        while words and words[0] in ("of", "the", "a", "an"):
            words.pop(0)
        while words and (words[-1] in _STOP or len(words[-1]) < 4 or words[-1].endswith(("ing", "ed"))):
            words.pop()
        words = words[:2]
        if num.endswith("%") or (words and not re.fullmatch(r"(?:19|20)\d\d", num)):
            out.append((num, " ".join(words)))
    return _dedupe(out)[:6]


def _keywords(text: str) -> list[str]:
    counts: Counter[str] = Counter()
    first: dict[str, str] = {}
    for w in re.findall(r"\b[A-Za-z][A-Za-z-]{3,}\b", text):
        if w.lower() not in _STOP:
            counts[w.lower()] += 1
            first.setdefault(w.lower(), w)
    return [first[k] for k, _ in counts.most_common(8)]


def _severity(lower: str, cvss: str | None, security: bool) -> str:
    for label, pattern in _SEVERITY:
        if re.search(pattern, lower):
            return label
    if cvss:
        score = float(cvss)
        return "Critical" if score >= 9 else "High" if score >= 7 else "Medium" if score >= 4 else "Low"
    return "Medium" if security else "Informational"


def _headline(title: str) -> str:
    _, sep, tail = title.rpartition(": ")
    return _cap(tail) if sep and len(tail.split()) >= 3 else title


def analyse(text: str) -> Source:
    """Pull sentences, entities and a severity out of the raw source."""
    clean = _MARKER.sub("", text)[:20_000]
    sentences = _sentences(clean)
    title = _clip(sentences[0].rstrip(".!?:;"), 100) if sentences else "Briefing on the submitted material"
    products = _products(clean)
    cvss = next((c for c in _CVSS.findall(clean) if float(c) <= 10), None)
    cves = _dedupe(c.upper() for c in _CVE.findall(clean))
    security = bool(cves or _SECURITY.search(clean))
    orgs = [o for o in _ORGS if re.search(rf"(?<![\w-]){re.escape(o)}(?![\w-])", clean)]
    return Source(
        sentences=sentences,
        title=title,
        headline=_headline(title),
        cves=cves,
        products=[f"{n} {v}" for n, v in products],
        product_names=_dedupe(n for n, _ in products),
        orgs=sorted(orgs, key=clean.find),
        severity=_severity(clean.lower(), cvss, security),
        cvss=cvss,
        security=security,
        stats=_stats(clean),
        urls=_dedupe(u.rstrip(".,;") for u in _URL.findall(clean)),
        sectors=[label for pattern, label in _SECTORS if re.search(pattern, clean, re.I)],
        keywords=_keywords(clean),
        digest=hashlib.sha256(text.encode()).hexdigest(),
    )


# ---------- shared phrasing ----------


def _clip(text: str, n: int) -> str:
    """Shorten to at most `n` characters on a word boundary."""
    text = " ".join(text.split())
    if len(text) <= n:
        return text
    return text[: n - 1].rsplit(" ", 1)[0].rstrip(",;:-") + "…"


def _bullet(text: str, n: int = 110) -> str:
    """A slide bullet: no full stop, and cut at a clause boundary rather than mid-phrase when long."""
    text = " ".join(text.split()).rstrip(".")
    if len(text) <= n:
        return text
    punct = [m.start() for m in re.finditer(r",\s|;\s|\s\(|\s-\s", text[:n]) if m.start() >= 40]
    conj = [m.start() for m in re.finditer(r"\s(?:and|which|that|allowing|because|while)\s", text[:n]) if m.start() >= 40]
    return text[: punct[-1]] if punct else text[: conj[0]] if conj else _clip(text, n)


def _words(text: str, n: int) -> str:
    return " ".join(text.split()[:n]).rstrip(".,;:")


def _full(text: str) -> str:
    text = text.strip()
    return text if not text or text[-1] in ".!?…" else text + "."


def _join(items: list[str]) -> str:
    return items[0] if len(items) == 1 else ", ".join(items[:-1]) + " and " + items[-1]


def _an(word: str) -> str:
    return f"{'an' if word[:1].lower() in 'aeiou' else 'a'} {word}"


def _cap(text: str) -> str:
    return text[:1].upper() + text[1:]


def _aud(b: Brief) -> str:
    a = b.audience.strip() or "general public"
    return f"the {a}" if a.lower().startswith(("general", "public")) else a


def _pick(table: tuple[tuple[str, str], ...], text: str, default: str) -> str:
    return next((v for k, v in table if k in text.lower()), default)


_LEADS = (("urgent", "Urgent update"), ("alarm", "Urgent update"), ("formal", "Official notice"),
          ("friendly", "Quick heads-up"), ("casual", "Quick heads-up"), ("reassur", "Good to know"),
          ("technical", "Technical update"))  # fmt: skip
_ACT = "Act today: check your systems against the steps above and confirm when they are done."
_SAVE = "Save this and share it with your team so everyone knows what to look out for."
_CTAS = (("persua", _ACT), ("action", _ACT), ("educat", _SAVE), ("awareness", _SAVE),
         ("reassur", "Questions? Reach out to your security or communications team; help is available."))  # fmt: skip
_MUSIC = (("urgent", "Low, pulsing synth bed at a steady tempo; calm but urgent voiceover in short sentences."),
          ("friendly", "Light acoustic track; warm, conversational voiceover."),
          ("casual", "Light acoustic track; warm, conversational voiceover."),
          ("formal", "Restrained orchestral ambience; measured, authoritative narration."))  # fmt: skip
_PALETTES = {
    "Critical": ["#991B1B", "#FCA5A5", "#0F172A", "#F8FAFC"],
    "High": ["#9A3412", "#FDBA74", "#1C1917", "#FFF7ED"],
    "Medium": ["#1E3A8A", "#FCD34D", "#0F172A", "#F8FAFC"],
    "Low": ["#065F46", "#6EE7B7", "#0F172A", "#F0FDF4"],
    "Informational": ["#1E40AF", "#93C5FD", "#0F172A", "#F8FAFC"],
}
_STAT_ICONS = (("device", "server"), ("system", "server"), ("server", "server"), ("user", "users"), ("people", "users"),
               ("citizen", "users"), ("organi", "users"), ("attack", "shield-alert"), ("incident", "shield-alert"))  # fmt: skip


def _lead(b: Brief) -> str:
    return _pick(_LEADS, b.tone, "Important update")


def _cta(src: Source, b: Brief) -> str:
    who = f"who run {src.product_names[0]}" if src.product_names else "who need to know"
    return _pick(_CTAS, b.objective, f"Share this with colleagues {who} and follow official channels for updates.")


def _facts(src: Source) -> list[str]:
    facts = [f"Severity: {src.severity}" + (f" (CVSS {src.cvss})" if src.cvss else "")] if src.security else []
    facts += [f"Affected: {', '.join(src.products[:3])}"] if src.products else []
    facts += [f"Tracked as: {', '.join(src.cves[:3])}"] if src.cves else []
    return facts + ([f"Reported by: {src.orgs[0]}"] if src.orgs else [])


def _known(src: Source) -> str:
    """One-line statement of the key facts for a tweet, or "" when there are none."""
    sev = f"{src.severity}, CVSS {src.cvss}" if src.cvss else src.severity
    if src.products:
        tags = "; ".join(src.cves[:2] + ([sev] if src.security else []))
        verb = "is" if len(src.products) == 1 else "are"
        return f"{_join(src.products[:2])} {verb} affected" + (f" ({tags})." if tags else ".")
    if src.cves:
        return f"Tracked as {_join(src.cves[:2])} (severity: {sev})."
    return f"Severity is assessed as {sev}." if src.security else ""


def _affected(src: Source, b: Brief) -> list[str]:
    return (src.products + src.sectors) or [_cap(b.audience)]


def _impact(src: Source, used: int) -> str:
    text = " ".join(_full(_clip(s, 220)) for s in src.impacts(used))
    return text or f"The source does not quantify the impact. Treat this as {src.severity.lower()} severity until more is known."


def _implications(src: Source, b: Brief, used: int) -> list[str]:
    out = [_full(_clip(s, 200)) for s in src.impacts(used, repeat=False)]
    urgent = src.severity in ("Critical", "High")
    if src.security:
        out.append("Exposed systems face a realistic risk of compromise until fixes are applied." if urgent
                   else "The issue warrants review, but the source does not describe it as urgent.")  # fmt: skip
    elif urgent:
        out.append("Delays in acting on this information could put people or services at risk.")
    out.append("Plans and messaging may need to change as new information arrives.")
    out.append(f"Communications to {_aud(b)} should stay {b.tone} and consistent with official guidance.")
    return _dedupe(out)


def _recommendations(src: Source, b: Brief, n: int) -> list[str]:
    recs = [_full(_clip(s, 180)) for s in src.sentences if _ACTION.search(s)]
    if src.products:
        recs.append(f"Identify every system running {src.products[0]} and confirm the version in use.")
    if src.products or src.cves:
        recs.append(f"Apply the vendor's fix or official mitigation for {(src.cves or src.products)[0]} as soon as it is available.")
    if src.security and src.severity in ("Critical", "High"):
        recs.append(f"Treat this as a {src.severity.lower()}-priority change and track it to closure.")
    if src.security:
        recs.append("Monitor logs for signs of exploitation and preserve evidence if compromise is suspected.")
    if src.orgs:
        recs.append(f"Report suspected incidents to {src.orgs[0]} and follow its updates.")
    recs += [
        f"Make sure {_aud(b)} know what has changed and what is expected of them.",
        "Nominate an owner to track follow-up actions and report progress.",
        "Share updates through official channels only, with one consistent message.",
        "Set a date to confirm the actions above are complete.",
        "Review this guidance again when new information is published.",
        "Record decisions and actions taken for later review.",
    ]
    return _dedupe(recs)[:n]


def _hashtags(src: Source, n: int) -> list[str]:
    tags = ["CyberSecurity"] if src.security else []
    tags += ["PatchNow"] if src.cves or src.products else []
    tags += [re.sub(r"[^A-Za-z0-9]", "", p) for p in src.product_names[:2]]
    tags += [o.replace("-", "") for o in src.orgs[:1]] + (["InfoSec"] if src.security else [])
    tags += [k[0].upper() + k[1:].replace("-", "") for k in src.keywords] + ["PublicAwareness"]
    return [f"#{t}" for t in _dedupe(tags)[:n]]


# ---------- builders, one per schema ----------


def video(src: Source, b: Brief) -> dict[str, Any]:
    label = f"{src.severity.upper()}: {src.subject}" if src.security else _words(src.headline, 6)
    groups = ([f"anyone running {_join(src.products[:2])}"] if src.products else []) + [s.lower() for s in src.sectors[:2]]
    plan = [
        ("Bold title card on a dark background; an alert badge animates in", f"{_lead(b)}. {_full(src.headline)}", label),
        ("Motion graphic that builds the key facts line by line", " ".join(src.body[:2]), src.cves[0] if src.cves else "What happened"),
        ("Simple diagram showing how the issue reaches systems and people", " ".join(_implications(src, b, used=3)[:2]),
         "Why it matters"),
        ("Icon grid of the affected groups", f"Those affected include {_join(groups)}." if groups else f"This matters for {_aud(b)}.",
         "Who is affected"),
        ("Animated checklist that ticks off each step", " ".join(_recommendations(src, b, 2)), "What to do"),
        ("End card with the publisher's logo and where to find official updates", _cta(src, b), "Stay informed"),
    ]  # fmt: skip
    durations = [6, 12, 10, 12, 12, 8]
    if b.detail < 2:
        del plan[3]
        durations = [8, 14, 14, 14, 10]
    scenes = [
        {"number": i, "duration_seconds": d, "visual": v, "narration": _speakable(n, d), "on_screen_text": t}
        for i, ((v, n, t), d) in enumerate(zip(plan, durations), 1)
    ]
    palette = _PALETTES[src.severity]
    return {
        "title": src.title,
        "logline": f"A {sum(durations)}-second {b.tone} explainer for {_aud(b)}: {_full(_clip(src.headline, 120))}",
        "script": "\n\n".join(s["narration"] for s in scenes),
        "storyboard": scenes,
        "subtitles": _subtitles(scenes),
        "visual_recommendations": [
            f"Use the {src.severity.lower()} palette ({palette[0]} on {palette[3]}) consistently across cards",
            "Keep on-screen text to six words or fewer and hold each card for at least two seconds",
            "Burn in subtitles for viewers watching without sound",
            f"Show {src.products[0]} by name and version so viewers can check their own systems"
            if src.products else "Prefer simple icons and real screenshots over stock footage",
            "Export 16:9 for YouTube and LinkedIn plus a 9:16 cut for Shorts and Reels",
        ][: 3 + b.detail],
        "music_and_tone": _pick(_MUSIC, b.tone, f"Understated ambient track under the voice; {b.tone} narration at an even pace."),
    }


def _speakable(text: str, seconds: int) -> str:
    """Trim narration to about 2.6 spoken words per second, at a sentence end where possible."""
    limit, out = int(seconds * 2.6), []
    for s in _SPLIT.split(text):
        if len(" ".join(out + [s]).split()) > limit:
            break
        out.append(s)
    return " ".join(out) if out else _full(" ".join(text.split()[:limit]).rstrip(",;:"))


def _subtitles(scenes: list[dict[str, Any]]) -> list[dict[str, str]]:
    """SRT-style cues inside each scene's time window, timed by text length."""
    cues, t = [], 0
    for scene in scenes:
        chunks = _chunks(scene["narration"], 84)
        span, total, done, start = scene["duration_seconds"] * 1000, max(1, sum(map(len, chunks))), 0, t
        for chunk in chunks:
            done += len(chunk)
            end = t + round(span * done / total)
            cues.append({"start": _ts(start), "end": _ts(end), "text": chunk})
            start = end
        t += span
    return cues


def _chunks(text: str, n: int) -> list[str]:
    """Subtitle lines of at most `n` characters, balanced within each sentence."""
    out: list[str] = []
    for sentence in _SPLIT.split(text):
        target = len(sentence) / max(1, -(-len(sentence) // n))
        line = ""
        for w in sentence.split():
            if line and (len(line) + 1 + len(w) > n or len(line) >= target):
                out.append(line)
                line = w
            else:
                line = f"{line} {w}".strip()
        out += [line] if line else []
    return out or [text]


def _ts(ms: int) -> str:
    return f"{ms // 3_600_000:02d}:{ms // 60_000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def linkedin(src: Source, b: Brief) -> dict[str, Any]:
    details = _facts(src) or [_clip(s, 140) for s in src.body[1 + b.detail : 3 + b.detail]]
    parts = [" ".join(src.body[: 1 + b.detail])]
    parts += ["Key details:\n" + "\n".join(f"- {d}" for d in details)] if details else []
    parts.append("What to do now:\n" + "\n".join(f"- {r}" for r in _recommendations(src, b, 2 + b.detail)))
    return {
        "hook": f"{_lead(b)} for {_aud(b)}: {_full(_clip(src.headline, 160))}",
        "body": "\n\n".join(parts),
        "call_to_action": _cta(src, b),
        "hashtags": _hashtags(src, 4 + (b.detail > 0)),
    }


def twitter(src: Source, b: Brief) -> dict[str, Any]:
    tags = _hashtags(src, 3)
    bodies = [
        f"{_lead(b)}: {_full(src.headline)} A short thread for {_aud(b)}.",
        f"What we know: {_known(src)} {src.body[0]}",
        "Why it matters: " + " ".join(_implications(src, b, used=2)[:2]),
        "What to do: " + " ".join(_recommendations(src, b, 2)),
        f"{_cta(src, b)} {' '.join(tags[:2])}",
    ]
    if b.detail == 0:
        del bodies[2]
    n = len(bodies)
    tweets = [f"{i}/{n} " + _clip(body, 280 - len(f"{i}/{n} ")) for i, body in enumerate(bodies, 1)]
    return {"tweets": [{"text": t} for t in tweets], "hashtags": tags}


def advisory(src: Source, b: Brief) -> dict[str, Any]:
    affected = _affected(src, b)
    if src.products:
        scope = f"{_join(src.products)}, as named in the source. Other versions may also be affected; confirm with the vendor."
    else:
        scope = f"The source identifies the following as affected: {', '.join(affected)}."
    if src.security:
        status = (f"Review logs for unusual activity involving {src.subject}, alert on unexpected administrative access, "
                  "and preserve evidence before remediation if compromise is suspected.")  # fmt: skip
    else:
        status = "This advisory reflects the source at the time of writing and will be updated as more is known."
    sections = [
        ("Description", " ".join(_full(_clip(s, 300)) for s in src.body[: 2 + b.detail])),
        ("Impact", _impact(src, used=3)),
        ("Affected products" if src.products else "Scope", scope),
        ("Detection and monitoring" if src.security else "Status", status),
    ]
    refs = src.urls[:2] + [f"https://nvd.nist.gov/vuln/detail/{c}" for c in src.cves[:2]]
    refs += [f"{o} publication cited in the source" for o in src.orgs[:1]]
    refs += [f"Source document submitted to SpectraSource (SHA-256 {src.digest[:16]}…)", "SpectraSource audit log for this job"]
    return {
        "title": src.title,
        "advisory_id": f"SS-{datetime.now(timezone.utc).year}-{int(src.digest[:8], 16) % 10_000:04d}",
        "severity": src.severity,
        "summary": _clip(" ".join(_full(s) for s in src.body[:2]), 420),
        "affected": affected,
        "sections": [{"heading": h, "content": c} for h, c in sections[: 3 + (b.detail > 0)]],
        "recommendations": _recommendations(src, b, 4 + b.detail),
        "references": _dedupe(refs)[: 2 + (b.detail > 0)],
    }


def infographic(src: Source, b: Brief) -> dict[str, Any]:
    recs = _recommendations(src, b, 4)
    stats = [(label.capitalize() or "Key figure", num, src.mention(num), _pick(_STAT_ICONS, label, "bar-chart-3"))
             for num, label in src.stats]  # fmt: skip
    pool = []
    if src.security and src.severity != "Informational":
        pool.append(("Severity", f"CVSS {src.cvss}" if src.cvss else src.severity, src.mention(src.cvss or src.severity), "shield-alert"))
    pool += stats[:1]
    pool += [("Tracked as", src.cves[0], src.mention(src.cves[0]), "bug")] if src.cves else []
    pool += [("Affected", _clip(src.products[0], 24), src.mention(src.products[0]), "server")] if src.products else []
    pool += stats[1:2]
    if src.sectors:
        who = f"{len(src.sectors)} sectors" if len(src.sectors) > 1 else _clip(src.sectors[0], 24)
        pool.append(("Who is affected", who, ", ".join(src.sectors), "users"))
    pool += stats[2:]
    pool += [("Key theme", _cap(k), src.mention(k), ic) for k, ic in zip(src.keywords, ("info", "file-text", "users"))]
    pool += [("Note", "Note", s, "info") for s in _GENERIC] * 2
    sections = pool[:3] + [("What to do", f"{len(recs)} steps", recs[0], "list-checks")]
    palette = _PALETTES[src.severity]
    return {
        "title": _bullet(src.headline, 80),
        "subtitle": f"Key facts for {_aud(b)}",
        "key_message": f"{src.severity} severity. {recs[0]}" if src.security else _full(_clip(src.body[0], 160)),
        "sections": [
            {"heading": h, "key_stat_or_fact": st, "supporting_text": _full(_clip(t, 160)), "icon_suggestion": ic}
            for h, st, t, ic in sections
        ],
        "layout_recommendation": f"Portrait 1080x1350 poster: headline banner in {palette[0]}, key message strip, "
        "a 2x2 grid of stat cards with icons, and a call-to-action footer.",
        "color_palette": palette,
        "call_to_action": _cta(src, b),
    }


def executive_summary(src: Source, b: Brief) -> dict[str, Any]:
    recs = _recommendations(src, b, 3 + (b.detail > 0))
    implications = _implications(src, b, used=2)[: 2 + (b.detail > 0)]
    facts = [s for s in src.body[1:] if not (_ACTION.search(s) or _URL.search(s))]
    points = [_full(_clip(s, 200)) for s in facts] + [_full(f) for f in _facts(src)] + [_full(src.sent(0))]
    return {
        "title": f"Executive briefing: {_clip(src.headline, 90)}",
        "bottom_line": f"{_full(_clip(src.body[0], 220))} Priority for {_aud(b)}: {recs[0]}",
        "key_points": [p for p in _dedupe(points) if p not in implications][: 3 + b.detail],
        "implications": implications,
        "recommended_actions": recs,
    }


def presentation(src: Source, b: Brief) -> dict[str, Any]:
    k, aud = 2 + b.detail, _aud(b)
    recs = _recommendations(src, b, k + 1)
    bullets = lambda items: [_bullet(x) for x in items[:k]] or [_bullet(src.headline)]  # noqa: E731
    badge = f" and a {src.severity.lower()} severity badge" if src.security else ""
    slides = [
        ("Overview", bullets(src.body), f"Open with the headline and why it matters to {aud}. {_full(src.headline)}",
         f"Full-bleed title slide with one bold statement{badge}"),
        ("Key facts", bullets(_facts(src) + src.body[k:]), "Stick to what the source states and flag anything still unconfirmed.",
         "Three fact cards with icons (shield-alert, server, bug)" if src.security else "Three fact cards with simple icons"),
        ("Why it matters", bullets(_implications(src, b, used=1 + k)), f"Connect the facts to consequences for {aud}.",
         "Cause-and-effect diagram from issue to impact"),
        ("Who is affected", bullets(_affected(src, b)), "Ask the room which of these groups they are responsible for.",
         "Icon grid of affected groups (users, server, building)"),
        ("Recommended actions", [_bullet(r) for r in recs], "Assign an owner and a date to each action before moving on.",
         "Numbered checklist with a tick icon per step"),
        ("Key takeaways", [_bullet(src.headline), _bullet(recs[0]), _bullet(_cta(src, b))],
         f"Close in {_an(b.tone)} tone and invite questions.", "Closing slide with contact details and a link to the full advisory"),
    ]  # fmt: skip
    if b.detail == 0:
        del slides[3]
    return {
        "title": src.title,
        "subtitle": f"{_cap(_an(b.tone))} briefing for {aud}" + (f" · {src.severity} severity" if src.security else ""),
        "slides": [{"title": t, "bullets": bl, "speaker_notes": nt, "visual_suggestion": v} for t, bl, nt, v in slides],
    }


BUILDERS: dict[str, Callable[[Source, Brief], dict[str, Any]]] = {
    "VideoPackage": video,
    "LinkedInPost": linkedin,
    "TwitterThread": twitter,
    "Advisory": advisory,
    "Infographic": infographic,
    "ExecutiveSummary": executive_summary,
    "Presentation": presentation,
}


def build(schema_title: str, user: str) -> dict[str, Any] | None:
    """Sample content for a known schema, or None so the caller can fall back."""
    builder = BUILDERS.get(schema_title)
    if builder is None:
        return None
    source, brief = parse_prompt(user)
    return builder(analyse(source), brief)
