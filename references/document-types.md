# Document types: structures that work

Each structure is a starting point. Drop a chapter that has nothing to say; never add one to look
complete. Chapter 1 is always the summary, the last chapter is always what happens next.

## Status report and roadmap (bilan, rapport d'avancement)

1. **Summary**: where we stand in one paragraph, 3 to 4 key figures, the requests.
2. **The whole picture**: what the parts are and how they fit (architecture figure, one table of parts with state and dependency).
3. **One chapter per project or workstream**: goal, what is done, what is missing, what it waits on (table with status chips).
4. **Risks and safeguards** when there are any: a table of risk, likelihood, impact, mitigation, owner.
5. **Roadmap**: the steps and what unlocks each (figure), then a table step, depends on, delivers. Dates only if they are real.
6. **Budget**: key figures, then a table item, per month, purpose, status.
7. **Compliance** when personal data, money or regulated activity is involved.
8. **What we need from you**: numbered requests by priority, then the decision log.

## Commercial proposal (proposition commerciale)

1. **Summary**: the client's problem in their words, what we propose, the price, the decision asked.
2. **What we understood**: context, goals, constraints. Proves we listened; the client should nod.
3. **What we propose**: the approach in phases (figure), what each phase delivers.
4. **Deliverables**: a table deliverable, description, acceptance criterion.
5. **Schedule**: phases and milestones (figure or table), what we need from the client and when.
6. **Team**: who does what, one line of relevant experience each.
7. **Price**: a table per phase or per deliverable, payment terms, what is not included.
8. **Why us**: three proofs (references, numbers, similar work). Short.
9. **Next steps and signatures.**

## Functional specification (cahier des charges)

1. **Summary**: the need, the scope of the release, the number of requirements by priority, the approval asked.
2. **Context**: users and systems around the product (context diagram), current pain with numbers.
3. **Users and journeys**: personas in a table; the main journey as a flow figure.
4. **Functional requirements**: one table per area. Columns: `ID` (EXF-001), requirement (one sentence, "The customer can..."), priority (MoSCoW chips: Must, Should, Could, Won't), acceptance criterion (measurable), dependency.
5. **Non-functional requirements**: `ENF-001`: performance, availability, security, accessibility, data, hosting, each with a measurable criterion.
6. **Data**: main entities and who owns them (table or ER diagram in Mermaid).
7. **Interfaces**: external systems, direction, protocol, frequency.
8. **Out of scope**: what this release will not do. Prevents half the disputes.
9. **Planning and acceptance**: milestones, how acceptance is run, who signs.
10. **Open questions and decisions**, then signatures.

Rules for requirements: one requirement per row; testable (a person can say pass or fail); no
solution words unless the solution is imposed; IDs never reused.

## Audit (security, SEO, accessibility, process)

1. **Summary**: verdict in one sentence, a score if there is a scale, the three findings that matter, the effort to fix.
2. **Scope and method**: what was examined, how, when, what was not.
3. **Findings**: a table finding, severity (chip), evidence, recommendation, effort. Sorted by severity.
4. **One section per area** for the findings that need explanation, with a figure or a capture.
5. **Action plan**: what to do first, second, later; owner and effort.
6. **Appendix**: raw evidence, tool output, glossary.

## Decision memo (note de décision)

Two to four pages. 1. **The decision asked** and the recommendation, first sentence. 2. **Options**:
a table option, benefit, cost, risk, reversibility. 3. **Why the recommendation.** 4. **What happens
once decided**: steps, owner, date.

## Procedure or guide (mode opératoire)

1. **Summary**: who it is for, what they will be able to do, how long it takes.
2. **Before you start**: access, tools, prerequisites, as a checklist.
3. **Steps**: numbered, one action per step, the expected result after each, captures as figures.
4. **When it goes wrong**: a table symptom, cause, fix.
5. **Contacts and references.**

## Meeting minutes for the record (compte rendu officiel)

Summary of decisions first (table decision, owner, date), then actions (table action, owner, due
date, status chip), then the discussion by topic, short. Attendees and date in the document
information.
