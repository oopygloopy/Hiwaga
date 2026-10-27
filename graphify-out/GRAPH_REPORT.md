# Graph Report - Hiwaga-Capstone  (2026-10-28)

## Corpus Check
- 62 files · ~22,143 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: .css 2, .example 1, (none) 1)

## Summary
- 254 nodes · 345 edges · 43 communities (10 shown, 33 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c6a66395`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- package.json
- Overview.jsx
- Overview.jsx
- Supabase
- Changelog
- Changelog
- Writing Guidelines for Postgres References
- Section Definitions
- Supabase Postgres Best Practices
- React + Vite
- vite-env.d.ts
- advanced-full-text-search.md
- advanced-jsonb-indexing.md
- conn-idle-timeout.md
- conn-limits.md
- conn-pooling.md
- conn-prepared-statements.md
- data-batch-inserts.md
- data-n-plus-one.md
- data-pagination.md
- data-upsert.md
- lock-advisory.md
- lock-deadlock-prevention.md
- lock-short-transactions.md
- lock-skip-locked.md
- monitor-explain-analyze.md
- monitor-pg-stat-statements.md
- monitor-vacuum-analyze.md
- query-composite-indexes.md
- query-covering-indexes.md
- query-index-types.md
- query-missing-indexes.md
- query-partial-indexes.md
- schema-constraints.md
- schema-data-types.md
- schema-foreign-key-indexes.md
- schema-lowercase-identifiers.md
- schema-partitioning.md
- schema-primary-keys.md
- security-privileges.md
- security-rls-basics.md
- security-rls-performance.md
- _template.md

## God Nodes (most connected - your core abstractions)
1. `react` - 12 edges
2. `PaginationControls()` - 11 edges
3. `Records()` - 11 edges
4. `getProfileLabel()` - 11 edges
5. `DataTable()` - 9 edges
6. `Overview()` - 9 edges
7. `Section Definitions` - 9 edges
8. `UserModals()` - 8 edges
9. `Supabase` - 8 edges
10. `SearchableSelect()` - 7 edges

## Surprising Connections (you probably didn't know these)
- `Overview()` --calls--> `getProfileLabel()`  [EXTRACTED]
  src/Overview.jsx → src/utils/formatters.js
- `UserModals()` --calls--> `getProfileUuid()`  [EXTRACTED]
  src/UserModals.jsx → src/utils/formatters.js
- `DataTable()` --calls--> `formatCell()`  [EXTRACTED]
  src/DataTable.jsx → src/utils/formatters.js
- `DataTable()` --calls--> `getColumns()`  [EXTRACTED]
  src/DataTable.jsx → src/utils/formatters.js
- `Records()` --calls--> `DataTable()`  [EXTRACTED]
  src/Records.jsx → src/DataTable.jsx

## Import Cycles
- None detected.

## Communities (43 total, 33 thin omitted)

### Community 0 - "package.json"
Cohesion: 0.07
Nodes (40): dependencies, jspdf@^4.2.1, jspdf-autotable@^5.0.8, react@^19.2.8, react-dom@^19.2.8, recharts@^3.10.1, @supabase/supabase-js@^2.116.0, devDependencies (+32 more)

### Community 1 - "Overview.jsx"
Cohesion: 0.15
Nodes (11): App(), Overview, dashboardViews, Leaderboard, LearningProgression, Overview(), Questions, Records (+3 more)

### Community 2 - "Overview.jsx"
Cohesion: 0.17
Nodes (20): react, getScoreColor(), OverallStats(), DataTable(), Leaderboard(), PaginationControls(), columnLabels, Questions() (+12 more)

### Community 4 - "Supabase"
Cohesion: 0.11
Nodes (15): Fix suggestion, Source, What happened, Skill Feedback, Steps, Core Principles, Debugging, Making and Committing Schema Changes (+7 more)

### Community 5 - "Changelog"
Cohesion: 0.12
Nodes (16): [1.2.0](https://github.com/supabase/agent-skills/compare/v1.1.1...v1.2.0) (2026-06-02), [1.3.0](https://github.com/supabase/agent-skills/compare/v1.2.0...v1.3.0) (2026-06-05), [1.4.0](https://github.com/supabase/agent-skills/compare/v1.3.0...v1.4.0) (2026-07-10), [1.5.0](https://github.com/supabase/agent-skills/compare/supabase-postgres-best-practices-v1.4.0...supabase-postgres-best-practices-v1.5.0) (2026-07-30), [1.6.0](https://github.com/supabase/agent-skills/compare/supabase-postgres-best-practices-v1.5.0...supabase-postgres-best-practices-v1.6.0) (2026-07-30), Bug Fixes, Bug Fixes, Bug Fixes (+8 more)

### Community 6 - "Changelog"
Cohesion: 0.12
Nodes (15): [0.1.3](https://github.com/supabase/agent-skills/compare/v0.1.2...v0.1.3) (2026-06-02), [0.1.4](https://github.com/supabase/agent-skills/compare/v0.1.3...v0.1.4) (2026-06-05), [0.1.5](https://github.com/supabase/agent-skills/compare/v0.1.4...v0.1.5) (2026-07-10), [0.1.6](https://github.com/supabase/agent-skills/compare/v0.1.5...supabase-v0.1.6) (2026-07-30), [0.1.7](https://github.com/supabase/agent-skills/compare/v0.1.6...supabase-v0.1.7) (2026-08-12), Bug Fixes, Bug Fixes, Bug Fixes (+7 more)

### Community 7 - "Writing Guidelines for Postgres References"
Cohesion: 0.12
Nodes (15): 1. Concrete Transformation Patterns, 2. Error-First Structure, 3. Quantified Impact, 4. Self-Contained Examples, 5. Semantic Naming, Code Example Standards, Comments, Impact Level Guidelines (+7 more)

### Community 8 - "Section Definitions"
Cohesion: 0.20
Nodes (9): 1. Query Performance (query), 2. Connection Management (conn), 3. Security & RLS (security), 4. Schema Design (schema), 5. Concurrency & Locking (lock), 6. Data Access Patterns (data), 7. Monitoring & Diagnostics (monitor), 8. Advanced Features (advanced) (+1 more)

### Community 9 - "Supabase Postgres Best Practices"
Cohesion: 0.33
Nodes (5): How to Use, References, Rule Categories by Priority, Supabase Postgres Best Practices, When to Apply

### Community 11 - "React + Vite"
Cohesion: 0.50
Nodes (3): Expanding the ESLint configuration, React Compiler, React + Vite

## Knowledge Gaps
- **33 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Overview.jsx` to `package.json`, `Overview.jsx`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.06755260243632337 - nodes in this community are weakly interconnected._
- **Should `Supabase` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Should `Changelog` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `Changelog` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `Writing Guidelines for Postgres References` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._