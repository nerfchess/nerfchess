# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

## 5. Workflow: Pull Requests

**Every change ships as a pull request.**

- Never commit directly to `master`. Work on a feature branch.
- When a change is complete (committed and pushed), always open a PR for it — don't wait to be asked.
- One PR per logical change, with a clear title and a body describing what changed and why.

## 6. Use the Project Skills

The skills in `.claude/skills/` are part of this project's workflow. Use them whenever they apply — don't wait for the user to invoke them:

- **brainstorming** before designing any new feature or behavior change.
- **writing-plans** for multi-step work, then **subagent-driven-development** or **dispatching-parallel-agents** to execute — prefer subagents for independent tasks (strongly preferred in this project).
- **test-driven-development** when implementing features or bugfixes.
- **systematic-debugging** for any bug or unexpected behavior, before proposing fixes.
- **frontend-design** when building or reshaping UI; **webapp-testing** to verify UI changes in a real browser.
- **verification-before-completion** before claiming anything works, and **requesting-code-review** before merging.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
