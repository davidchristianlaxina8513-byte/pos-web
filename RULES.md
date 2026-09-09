# RULES.md

**Stack:** Expo SDK 57 + React Native + Supabase
**Platform:** mobile (Android, mobile-only)

> This file is a **lazy index** — `concern → playbook §`.
> Read only the § you need. Never load all playbooks eagerly.
> Detail lives in `playbooks/`. Expo/RN project guidance lives in `AGENTS.md`.
>
> Rows marked **(web-track)** point at advisory playbooks for the planned web
> migration (see `CONTEXT.md` → Product Decisions). They must not override
> Expo/RN guidance until the migration lands.

---

## Always-on Invariants

| Concern                          | Playbook                                             | Section                                    |
| -------------------------------- | ---------------------------------------------------- | ------------------------------------------ |
| `accessibility`                  | `playbooks/universal/accessibility.md`               | Semantic Structure                         |
| `accessibility`                  | `playbooks/universal/accessibility.md`               | Keyboard and Focus                         |
| `accessibility`                  | `playbooks/universal/accessibility.md`               | Forms and Authentication                   |
| `accessibility`                  | `playbooks/universal/accessibility.md`               | Accessibility Testing                      |
| `naming`                         | `playbooks/universal/coding-rules/naming.md`         | Naming                                     |
| `naming`                         | `playbooks/universal/coding-rules/naming.md`         | Functions                                  |
| `naming`                         | `playbooks/universal/coding-rules/naming.md`         | Imports                                    |
| `naming`                         | `playbooks/universal/coding-rules/naming.md`         | Constants                                  |
| `no-debug`                       | `playbooks/universal/coding-rules/hygiene.md`        | No Debug Code in Commits                   |
| `no-debug`                       | `playbooks/universal/coding-rules/hygiene.md`        | One Thing Per File                         |
| `errors`                         | `playbooks/universal/error-handling.md`              | Error Contract                             |
| `errors`                         | `playbooks/universal/error-handling.md`              | Boundary Handling                          |
| `errors`                         | `playbooks/universal/error-handling.md`              | Security Rules for Errors                  |
| `git-branches`                   | `playbooks/universal/git-conventions/branches.md`    | Branch Structure                           |
| `git-commits`                    | `playbooks/universal/git-conventions/commits.md`     | Commit Convention                          |
| `git-workflow`                   | `playbooks/universal/git-conventions/workflow.md`    | Daily Workflow                             |
| `observability`                  | `playbooks/universal/observability.md`               | Structured Events                          |
| `observability`                  | `playbooks/universal/observability.md`               | Health and Readiness                       |
| `observability`                  | `playbooks/universal/observability.md`               | Errors and Traces                          |
| `security-boundaries`            | `playbooks/universal/security.md`                    | Trust Boundaries                           |
| `security-boundaries`            | `playbooks/universal/security.md`                    | Authentication and Authorization           |
| `secret-safety`                  | `playbooks/universal/security.md`                    | Secrets and Data                           |
| `secret-safety`                  | `playbooks/universal/security.md`                    | Failure Safety                             |
| `typescript-strict`              | `playbooks/universal/typescript/boundaries.md`       | Strict Mode — Always On                    |
| `typescript-strict`              | `playbooks/universal/typescript/boundaries.md`       | No any                                     |
| `typescript-strict`              | `playbooks/universal/typescript/boundaries.md`       | Type vs Interface                          |
| `expo-sdk`                       | `AGENTS.md`                                          | Tech Stack                                 |
| `architecture`                   | `AGENTS.md`                                          | Architecture                               |
| `structure`                      | `AGENTS.md`                                          | Folder Structure                           |
| `styling-tokens`                 | `AGENTS.md`                                          | Styling Architecture (design-token system) |
| `supabase-transport`             | `AGENTS.md`                                          | API Transport (`src/api/`)                 |
| `supabase-runtime`               | `playbooks/capabilities/supabase/migrations.md`      | Local and Hosted Flow                      |
| `rls`                            | `playbooks/capabilities/supabase/rls.md`             | Grants and Policies                        |
| `docker`                         | `playbooks/capabilities/docker/overview.md`          | Dev vs Prod Differences                    |
| `docker`                         | `playbooks/capabilities/docker/overview.md`          | Dockerfiles                                |
| `makefile`                       | `playbooks/capabilities/devops/makefile/commands.md` | Core Rules                                 |
| `ci`                             | `playbooks/capabilities/ci/github-actions.md`        | Frontend CI                                |
| `pr`                             | `playbooks/devops/pr-template.md`                    | Template                                   |
| `web-platform` (web-track)       | `playbooks/platform/web.md`                          | Browser Boundary                           |
| `web-platform` (web-track)       | `playbooks/platform/web.md`                          | Navigation and Accessibility               |
| `architecture` (web-track)       | `playbooks/stack/nextjs/architecture.md`             | Profiles                                   |
| `architecture` (web-track)       | `playbooks/stack/nextjs/architecture.md`             | Dependency Direction                       |
| `structure` (web-track)          | `playbooks/stack/nextjs/structure.md`                | Canonical Reference Tree                   |
| `structure` (web-track)          | `playbooks/stack/nextjs/structure.md`                | Profile Differences                        |
| `structure` (web-track)          | `playbooks/stack/nextjs/structure.md`                | File Placement                             |
| `structure` (web-track)          | `playbooks/stack/nextjs/structure.md`                | API and Data Ownership                     |
| `structure` (web-track)          | `playbooks/stack/nextjs/structure.md`                | Architecture Cleanup                       |
| `runtime` (web-track)            | `playbooks/stack/nextjs/runtime.md`                  | Server and Client                          |
| `runtime` (web-track)            | `playbooks/stack/nextjs/runtime.md`                  | Caching and Mutations                      |
| `stack-security` (web-track)     | `playbooks/stack/nextjs/security.md`                 | Authorization                              |
| `stack-security` (web-track)     | `playbooks/stack/nextjs/security.md`                 | Sessions                                   |
| `stack-testing` (web-track)      | `playbooks/stack/nextjs/testing.md`                  | Test Layers                                |
| `supabase-next` (web-track)      | `playbooks/capabilities/supabase/nextjs.md`          | Clients and Proxy                          |
| `styling-ownership` (web-track)  | `playbooks/styling/ownership.md`                     | Component Ownership                        |
| `styling-ownership` (web-track)  | `playbooks/styling/ownership.md`                     | Dependency Direction                       |
| `styling-mode` (web-track)       | `playbooks/styling/tailwind/architecture.md`         | Primary Mode                               |
| `styling-mode` (web-track)       | `playbooks/styling/tailwind/architecture.md`         | File Structure                             |
| `styling-mode` (web-track)       | `playbooks/styling/tailwind/architecture.md`         | Browser Inspection                         |
| `styling-tokens` (web-track)     | `playbooks/styling/tailwind/tokens.md`               | Tailwind v4 Tokens                         |
| `styling-tokens` (web-track)     | `playbooks/styling/tailwind/tokens.md`               | Theme Boundary                             |
| `styling-components` (web-track) | `playbooks/styling/tailwind/components.md`           | Class Strategy                             |
| `styling-components` (web-track) | `playbooks/styling/tailwind/components.md`           | Common Button                              |
| `styling-responsive` (web-track) | `playbooks/styling/tailwind/responsive.md`           | Responsive and Accessible UI               |

---

## Conditional Workflows

| Concern               | Playbook                                  | Section             | When                                                               |
| --------------------- | ----------------------------------------- | ------------------- | ------------------------------------------------------------------ |
| `plan-reconciliation` | `playbooks/universal/product-planning.md` | Plan Reconciliation | The user supplies or substantially changes a specification or plan |

> Product onboarding (`playbooks/universal/product-planning.md` → Product
> Onboarding) is skipped while `CONTEXT.md` reports `Product status: complete`.

---

## Optional Concerns

| Concern       | Playbook                                     | Section                    | When                                          |
| ------------- | -------------------------------------------- | -------------------------- | --------------------------------------------- |
| `validation`  | `playbooks/universal/typescript/patterns.md` | Zod for Runtime Validation | Project validates external/runtime input      |
| `query`       | `playbooks/concerns/tanstack-query.md`       | § 3 Read Hook              | Client needs cached server state              |
| `query`       | `playbooks/concerns/tanstack-query.md`       | § 4 Mutation Hook          | Client needs cached server state              |
| `state`       | `playbooks/concerns/zustand.md`              | § 2 Store Setup            | Shared non-server UI state                    |
| `env`         | `playbooks/concerns/t3-env.md`               | Setup                      | Validating env vars at build time             |
| `url-state`   | `playbooks/concerns/nuqs.md`                 | § 1 Basic Usage            | Filter/search/pagination state belongs in URL |
| `safe-action` | `playbooks/concerns/next-safe-action.md`     | § 1 Setup                  | Type-safe server actions with auth middleware |
| `safe-action` | `playbooks/concerns/next-safe-action.md`     | § 2 Defining an Action     | Type-safe server actions with auth middleware |
| `dark-mode`   | `playbooks/concerns/next-themes.md`          | § 1 Provider Setup         | Project needs dark mode toggle                |

---

**How to use this file:**

1. Identify which concern your task touches.
2. Open only the listed playbook at the listed §.
3. Stop reading when the § ends.
4. Never read all playbooks eagerly — your context window is finite.
