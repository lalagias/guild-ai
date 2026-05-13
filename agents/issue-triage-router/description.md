Classifies and routes GitHub or Linear issues automatically.

Give it an issue URL or reference. It fetches the issue, classifies it by kind
(bug, feature, docs, question), severity (sev1-sev4), and area, then takes
routing actions: posts a structured triage comment, adds labels when confidence
is medium or higher, and optionally dispatches a Cursor cloud agent for
high-severity bugs with a known target repo.

Stays quiet on low-confidence classifications — comments only, no labels, no
dispatch. Never removes existing labels or reassigns already-assigned issues.

Example inputs:

- "https://github.com/myorg/myrepo/issues/42"
- "Triage this: myorg/myrepo#42"
