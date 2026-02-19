# br (beads_rust) Agent Guide

`br` is the issue/task tracker for this project. Issues live in
`.beads/issues.jsonl` (git-tracked) and a local SQLite DB. The JSONL file is the
source of truth for collaboration. Use `--quiet` or `--json` when calling
commands as an agent.

## Essential Workflow

```
1. br show <id>              # read the task
2. br update <id> --claim    # mark in_progress + assign to self
3. ... do the work ...
4. br close <id> -r "reason" # mark closed with a reason
5. br sync --flush-only      # export DB → JSONL (commit JSONL with your code changes)
```

**Always close with `-r` / `--reason`** — a one-sentence summary of what was done.

## Reading Issues

```bash
br show ol-3d6               # full detail on one issue
br list                      # open issues (default: ≤50)
br list -a                   # include closed
br ready                     # unblocked, not deferred — best list for "what to do next"
br search "river"            # full-text search
br count --by status         # quick summary
```

## Creating Issues

```bash
# Standard create
br create "Title" -t task -p 2 -d "Description text"

# Quick capture (prints ID only — good for capturing discovered work)
br q "Found a bug in river generation"

# Types: task, bug, feature, epic, chore, docs, question
# Priority: 0=critical, 1=high, 2=normal, 3=low, 4=backlog
```

## Updating Issues

```bash
br update ol-123 --claim                     # atomic: assign + set in_progress
br update ol-123 -s in_progress              # change status only
br update ol-123 --add-label "needs-review"  # add label
br update ol-123 --add-label "needs-details" # 
br update ol-123 --description "new desc"    # update description
```

## When a task description is not clear enough

If a task description is not clear enough, don't attempt to complete the task by
making assumptions. Instead, add a label "needs-details" and add a comment to
the task asking for further details. You can then defer the task for later.

```bash
br comments add ol-123 "Request for clarification" # add a comment
br update ol-123 --add-label "needs-details"       # add label
br defer ol-123                                    # defer for later
```

## Closing Issues

```bash
br close ol-123 -r "Extracted into RiverGenerator class"
br close ol-123 --suggest-next --json   # returns newly unblocked IDs
br close ol-123 --force                 # close even if blockers remain open
```

## Epics

Create an epic and child tasks when there is a large piece of work that is
related.

```bash
# Create epic
br create "Title" -t epic -p 2 -d "Description of epic"

# Create child issues
br create "Child 1" --parent <epic-id> -t task -p 2 -d "Description"
```

## Dependencies

```bash
br dep add ol-456 ol-123           # ol-456 depends on (is blocked by) ol-123
br dep add ol-456 ol-123 -t related  # loose relationship, not a blocker
br dep tree ol-456                  # visualize full dependency tree
br dep cycles                       # check for circular deps
```

Dependency types: `blocks` (default), `parent-child`, `discovered-from`, `related`

When you discover new work while implementing a task, capture it with:
```bash
br q "Edge case in X" --deps discovered-from:ol-123
```

## Syncing (JSONL ↔ DB)

```bash
br sync --flush-only    # DB → JSONL (do this before committing)
br sync --import-only   # JSONL → DB (after pulling changes)
br sync --status        # check sync state without modifying anything
```

**`br sync` never runs git commands.** Commit the JSONL yourself alongside your code.

## JSON / Machine-Readable Output

Add `--json` to any command for structured output. Useful when reading issue lists programmatically.

```bash
br ready --json --limit 5
br show ol-123 --json
br close ol-123 --suggest-next --json   # returns {"closed": "...", "unblocked": [...]}
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 3 | Issue not found |
| 4 | Validation error |
| 5 | Dependency cycle |

## Common Mistakes to Avoid

- **Don't forget `br sync --flush-only`** before committing — otherwise the JSONL file lags the DB.
- **Don't skip `--reason` on close** — makes the changelog and history useless.
- With br output — use `--json` and parse it.
- `br update` with no `--claim` does NOT change status — use `--claim` or `-s in_progress` explicitly.
- `br list` excludes closed issues by default; use `-a` / `--all` to include them.
