# Claude workflow setup

Date: 2026-07-04

## What exists now

- `.claude/skills/` has 19 vendored skills: the obra/superpowers set (brainstorming, writing-plans, TDD, systematic-debugging, subagent-driven-development, dispatching-parallel-agents, verification-before-completion, code review skills), Anthropic's webapp-testing and frontend-design, and three anti-AI-slop design skills (hallmark, ui-ux-pro-max, redesign-existing-projects). Merged via PRs #84–#87.
- `CLAUDE.md` = Karpathy guidelines + workflow rules: every change ships as a PR (never commit to master), use the vendored skills proactively, prefer subagent-driven execution, use the anti-slop skills for all visual work. `EXAMPLES.md` at repo root has wrong-vs-right examples.
- `.claude/settings.json` allowlists `mcpvault` MCP tools (PRs #88/#89) — the user's local Obsidian vault server for local CLI sessions.
- `vault/` (this folder) is the cross-session memory; works in cloud sessions too, where mcpvault doesn't reach.

## Owner preferences

- Wants everything to work without using a terminal — prefer doing setup via PRs and chat.
- Biggest UI concern: the site looking "AI-generated". Use hallmark/ui-ux-pro-max/redesign-existing-projects for any visual work.
- Likes subagent-based execution.
