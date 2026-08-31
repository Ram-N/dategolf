# date-LINKS Authoring Guide

**For AI agents and human contributors adding entries to `src/data/datelinks.json`.**

---

## What You Are Writing

Each entry in `datelinks.json` is a set of mnemonic memory aids for one historical event in the DatePick quiz. The aids appear on the reveal screen after a student answers, grouped into short thematic sections. A student who already knows the date skips them; a diligent student reads what helps.

Your job: help the student anchor a year in memory by connecting it to things they already know.

---

## The File: `src/data/datelinks.json`

Location: `src/data/datelinks.json`

It is a flat JSON object. Every key is an **event ID** (see below). Every value is an object with one field, `groups`, which is an array of group objects.

### Full schema

```json
{
  "<event-id>": {
    "groups": [
      {
        "label": "<group label>",
        "items": [
          "<memory aid paragraph>",
          "<memory aid paragraph>"
        ]
      }
    ]
  }
}
```

**Rules:**
- Top-level keys are event IDs — strings, no spaces, kebab-case
- `groups` is an array of 1–3 objects
- Each group has exactly two fields: `label` (string) and `items` (array of strings)
- `items` holds 1–4 short paragraphs — plain prose, no markdown, no bullet symbols
- Groups are optional — include only the ones that have something genuinely useful to say
- Order groups as: Look Back → Year of [YEAR] → Look Ahead (when all three exist)

---

## Finding the Event ID

The event ID must exactly match the `id` field in `src/data/events.json`. Look it up — do not guess.

Examples:

| Event name | Event ID |
|---|---|
| Marconi demonstrates wireless telegraphy | `marconi-wireless-telegraphy` |
| Invention of the Wheel | `invention-of-the-wheel` |
| Invention of Sumerian Writing | `sumerian-writing` |
| Code of Hammurabi Established | `code-of-hammurabi` |
| Great Pyramid of Giza Built | `egyptian-pyramids-built` |

To find an ID for any event, search `events.json` for the event name and copy the `"id"` value verbatim.

---

## The Three Group Labels

You may use any or all of these. Use only the ones that offer real mnemonic value.

### 1. `"Look Back"`

Connect the event's year to something **earlier** that the student is more likely to know.
- A predecessor technology, movement, or person
- A cause-and-effect chain ending at this year
- A "count forward from X" anchor

**Formula**: *"You probably know [earlier event] happened in [year]. [This event] came [N] years later."*

**Good for**: Scientific discoveries with precursors, political events with clear causes, inventions that build on earlier ones.

**Avoid**: Obscure earlier events the student is just as unlikely to know.

---

### 2. `"Year of [YEAR]"`

Replace `[YEAR]` with the actual year number (e.g., `"Year of 1895"`, `"Year of 1969"`). For BCE events use `"Year of 3500 BCE"`.

Make this year feel **distinctive and memorable** by linking it to other events or facts from the same year or a tight cluster of years.

- Other famous events from the same year ("X and Y both happened in [year]")
- A "same year" pairing that forms a sticky mental image
- A numeric trick or pattern in the year itself ("exactly halfway between X and Y")
- What was happening culturally, politically, or scientifically at that moment

**Formula**: *"[Year] was also the year [other memorable event]. Pairing them makes [year] stick."*

**Good for**: Years with 2+ notable simultaneous events, years with a memorable number pattern.

**Avoid**: Coincidences so obscure they create more to remember, not less.

---

### 3. `"Look Ahead"`

Connect the event's year to something **later** the student is more likely to know.

- A famous downstream consequence (and how many years later it was)
- A "subtract N years from [famous event]" anchor
- A round-number or century anchor ("just 5 years before 1900")

**Formula**: *"You probably know [later event] happened in [year]. Subtract [N] years → [this year]."*

**Good for**: Events that caused something famous, events that sit near a round century, inventions whose later milestone is well-known.

**Avoid**: Later events that are nearly as obscure as the target year itself.

---

## Writing Each Item (Paragraph)

Each string in `items` is one self-contained memory aid. Think of it as a single paragraph a tutor would say out loud.

**Length**: 1–3 sentences. If you need more, split into two items.

**Tone**: Direct, concrete, conversational. No jargon, no hedging.

**Structure that works well**:
- State the anchor fact first, then bridge to the target year
- Use arrows (`→`) to show a sequence
- Use explicit subtraction/addition ("subtract 17 years → 1895")
- Bold or quote the target year inline if it helps clarity (plain text only — no markdown bold)

**What makes a good item:**
- Gives the student a **concrete calculation or image**, not just a vague association
- Uses an anchor the student is **very likely to already know**
- Is **falsifiable** — the dates mentioned must be correct
- Stands alone — does not depend on reading another item first

**What makes a bad item:**
- "1895 was an important year for science." — too vague, no anchor
- Requires knowing an equally obscure fact to be useful
- Repeats the same anchor already used in a different item

---

## How Many Groups and Items

**Groups**: Include 1, 2, or 3 groups. Do not include a group unless you have at least one genuinely useful item for it. An empty or weak group is worse than no group.

**Items per group**: 2–3 is the sweet spot. More than 4 is too many.

**Minimum viable entry**: One group (`"Look Back"` or `"Look Ahead"`) with 2 items. That is enough to ship.

---

## Complete Example

Event: **Marconi demonstrates wireless telegraphy, 1895**
Event ID: `marconi-wireless-telegraphy`

```json
"marconi-wireless-telegraphy": {
  "groups": [
    {
      "label": "Look Back",
      "items": [
        "Count forward from Hertz: Heinrich Hertz proved electromagnetic waves exist in 1887–88. Marconi turns that pure theory into a practical device about 7-8 years later, in 1895.",
        "Sequential Tech Link: Hertz (1887) → Marconi (1895). Eight years from 'waves exist' to 'send a message with them.'"
      ]
    },
    {
      "label": "Year of 1895",
      "items": [
        "1895 was the birth year of two mass-communication technologies: wireless radio (Marconi) and cinema (Lumière brothers). Both born the same year.",
        "The '1-8-9-5' bridge trick: Röntgen also discovered X-rays in 1895. Pair 'invisible waves' (X-rays) with 'invisible signals' (radio) — both in 1895."
      ]
    },
    {
      "label": "Look Ahead",
      "items": [
        "Turn of the Century Anchor: 1895 = exactly 5 years before 1900. A late-Victorian invention, not a 1930s one.",
        "Marconi → Atlantic → 1901: 1895 = local demo. Six years later, 1901 = transatlantic signal.",
        "Titanic anchor: Wireless saved survivors in 1912. Subtract ~17 years → 1895, when the technology was first demonstrated."
      ]
    }
  ]
}
```

---

## Minimal Example (one group only)

Event: **Code of Hammurabi, 1754 BCE**
Event ID: `code-of-hammurabi`

```json
"code-of-hammurabi": {
  "groups": [
    {
      "label": "Look Ahead",
      "items": [
        "Hammurabi's code predates Roman law (450 BCE) by over 1,300 years. If you know Roman law as 'ancient,' Hammurabi is ancient to the Romans.",
        "Alphabet anchor: The Phoenician alphabet (around 1600–1050 BCE) came after Hammurabi. Written law came before widely accessible writing."
      ]
    }
  ]
}
```

---

## How to Add a New Entry (Workflow for an AI Agent)

1. **Get the event name and year** from the user or from a DatePick question.
2. **Look up the event ID** — search `src/data/events.json` for the name, copy the `"id"` field exactly.
3. **Check if an entry already exists** — search `datelinks.json` for that ID. If yes, add to or update it rather than replacing.
4. **Draft groups** — decide which of the three group types have useful anchors. Start with the strongest.
5. **Write items** — 2–3 per group, concrete, anchor-first.
6. **Verify all dates in your items are accurate** — wrong dates are worse than no aid.
7. **Append the new key** to `datelinks.json`, preserving valid JSON (commas between entries, no trailing comma after the last entry).
8. **Do not modify** `events.json`, `src/engine/`, `src/stores/`, or `src/types/datepick.ts`.

---

## JSON Syntax Reminders

- Entries are separated by commas. The **last entry has no trailing comma**.
- Strings use double quotes. Apostrophes inside strings are fine (`'`). Escape actual double quotes as `\"`.
- Em dashes (`—`) and Unicode characters (e.g., `é`, `è`) are valid in JSON strings.

**Multi-entry file structure:**

```json
{
  "first-event-id": {
    "groups": [ ... ]
  },
  "second-event-id": {
    "groups": [ ... ]
  }
}
```

---

## What Not to Do

- Do not add a `"label"` value other than `"Look Back"`, `"Year of [YEAR]"`, or `"Look Ahead"`. The UI expects these exact patterns.
- Do not use markdown inside item strings (no `**bold**`, no `- bullet`).
- Do not invent an event ID — it must match `events.json` exactly.
- Do not create entries for events that are not in `events.json` — they will never be shown.
- Do not add more than 3 groups per event.
- Do not pad items with filler. If you cannot think of a strong anchor, omit that group.
