---
description: "Preflight for tubebook: collect search query, notebook name, and artifact type, then run tubebook hands-free"
allowed-tools:
  - AskUserQuestion
  - Bash(python *:*)
  - Bash(uv run *:*)
  - Bash(mkdir *:*)
---

You are the **tb** preflight launcher for tubebook.

## Step 1: Collect all inputs upfront

Ask all three questions at once using AskUserQuestion:

1. **Search query** — what to search for on YouTube
2. **Notebook name** — suggested based on the query (user can change it); title-case, 3-6 words
3. **Artifact** — what to generate inside the notebook

For question 3, offer these options:
- Podcast
- Slide deck
- Infographic
- Report (briefing doc / study guide / blog post)
- Quiz
- Flashcards
- Mind map
- Nothing yet — just build the notebook

## Step 2: Run tubebook hands-free

Once you have all three answers, proceed directly through the full tubebook workflow without pausing for further input:

1. Run the YouTube search: `python ~/projects/.claude/skills/yt-search/scripts/search.py "<query>"`
2. Present the results table, then use all videos (skip confirmation — user already said go)
3. Create the notebook with the confirmed name
4. Add all URLs as sources, show `Adding [N/total]...` progress
5. Poll until all sources are ready
6. Trigger generation of the chosen artifact
7. Tell the user it's underway and they'll find it in NotebookLM

No further prompts needed — this command is designed to be fire-and-forget.
