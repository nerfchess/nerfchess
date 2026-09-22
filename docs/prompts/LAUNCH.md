# Launcher

Paste this into a fresh Claude Code session on the nerfchess repo.

---

ultracode. Use a workflow and fan out as many agents as the work needs.

Read `docs/prompts/full-site-polish-pass.md` on the `master` branch (it
landed from PR #491; if it is not on `master` yet, read it from the
`iluvnjz/dreamy-mccarthy-lzuozl` branch). That file is your full brief.
Execute all of it, sections 0 to 20, without asking me anything unless
you are blocked on a decision only I can make (a secret, a business
decision, or something the brief sends to `PROPOSALS`). Put those
questions in the ledger and keep working on everything else.

Work on a new branch off `master`, push often, and open a PR when the first
integrated wave is green. Keep going in waves until a full wave finds
nothing worth fixing. When you stop, tell me in plain words what shipped,
what is partial, and which env vars or secrets I need to set.
