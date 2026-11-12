# Significance backfill: tasks to paste (importance 7+)

How to run a batch (doc 15, Part A):

1. `uv run python tools/manage.py ai-reference`: writes `data/drafts/ai_prompt.txt` (the prompt) and `data/drafts/ai_reference.md`.
2. In the AI: paste `ai_prompt.txt` as the system prompt (or first message), **attach** `ai_reference.md`, then paste the batch's task below.
3. Save the reply as `data/drafts/incoming/<date>_<ai>_significance_b<N>.json` and tell Claude. Claude checks it, fixes it, loads it as proposed.
4. Review → Significance on the dashboard; tell Claude when it's approved (Claude exports and commits).

Done: batch 1 (2026-11-11), batch 2 (loaded 2026-11-11).

## Batch 3: 1803 to 1939

```
Write the significance ("Why it matters") for these 20 existing ids, following SIGNIFICANCE and
LESSONS FROM REVIEWED BATCHES. Only the ones you're sure of:
napoleonic-wars, battle-of-trafalgar, first-steam-railway, first-use-of-anesthesia, revolutions-of-1848,
british-raj, first-oil-well, american-civil-war, emancipation-proclamation, lincoln-assassination,
marconi-invents-radio, x-rays-discovered, russo-japanese-war, fall-of-qing-dynasty, world-war-1,
russian-revolution, indian-independence-movement, soviet-union, television-invented, great-depression
These pairs are linked; give each its own angle: american-civil-war / emancipation-proclamation,
russian-revolution / soviet-union, british-raj / indian-independence-movement.
```

## Batch 4: 1939 to 2023

```
Write the significance ("Why it matters") for these 16 existing ids, following SIGNIFICANCE and
LESSONS FROM REVIEWED BATCHES. Only the ones you're sure of:
world-war-2, the-holocaust, apartheid, death-of-stalin, civil-rights-movement,
contraceptive-pill-approved, jfk-assassination, six-day-war, death-of-mao, thatcher-becomes-pm,
iran-iraq-war, gorbachev-becomes-leader, apartheid-end, dolly-sheep-cloned, hong-kong-handover,
covid-19-pandemic
These pairs are linked; give each its own angle: apartheid / apartheid-end,
world-war-2 / the-holocaust, gorbachev-becomes-leader / death-of-stalin.
Several are sensitive or politically contested (the Holocaust, apartheid, the Six-Day War,
Thatcher): describe effects neutrally and precisely, and mark debated judgements as debated.
```
