# Cafe Elvira web app and DEV-only Supabase tooling.
NODE := node
SUPABASE := supabase
WEB_PORT ?= 3000
DEFAULT_DEV_SUPABASE_REF := ccqoegnvzancptqhmyoc
DEV_SUPABASE_REF ?= $(DEFAULT_DEV_SUPABASE_REF)
DEV_SUPABASE_REF_EXTRA ?=
comma := ,
ALLOWED_DEV_REFS := $(DEFAULT_DEV_SUPABASE_REF) $(subst $(comma), ,$(DEV_SUPABASE_REF_EXTRA)) $(if $(filter-out $(DEFAULT_DEV_SUPABASE_REF),$(DEV_SUPABASE_REF)),$(DEV_SUPABASE_REF))
LINKED_REF_FILE := supabase/.temp/project-ref

.PHONY: help setup run dev web-dev web-lan web-build share seed reset-dev migrate-dev migrate-prod typecheck lint format-check test build

help:
	@printf "  %-14s %s\n" "make setup" "Install root seed tooling and web dependencies"
	@printf "  %-14s %s\n" "make run" "Start the web app locally"
	@printf "  %-14s %s\n" "make dev" "Start Next.js locally"
	@printf "  %-14s %s\n" "make web-lan" "Start Next.js on LAN (port $(WEB_PORT))"
	@printf "  %-14s %s\n" "make share" "Share a production web build with a Cloudflare tunnel"
	@printf "  %-14s %s\n" "make seed" "Seed DEV database only"
	@printf "  %-14s %s\n" "make reset-dev" "Reset linked DEV database (destructive, guarded)"
	@printf "  %-14s %s\n" "make migrate-dev" "Apply migrations to linked DEV project"
	@printf "  %-14s %s\n" "make migrate-prod" "Apply migrations to linked PROD project"
	@printf "  %-14s %s\n" "make typecheck" "Typecheck web app"
	@printf "  %-14s %s\n" "make lint" "Lint web app"
	@printf "  %-14s %s\n" "make format-check" "Check web formatting"
	@printf "  %-14s %s\n" "make test" "Run web unit tests"
	@printf "  %-14s %s\n" "make build" "Build web app"

setup:
	npm install
	npm --prefix web install

run dev web-dev:
	npm --prefix web run dev

web-lan:
	npm --prefix web run dev -- --hostname 0.0.0.0 --port $(WEB_PORT)

web-build build:
	npm --prefix web run build

typecheck:
	npm --prefix web run typecheck

lint:
	npm --prefix web run lint

format-check:
	npm --prefix web run format:check

test:
	npm --prefix web run test

share:
	powershell -NoProfile -ExecutionPolicy Bypass -File scripts/demo-phone.ps1

seed:
	DEV_SUPABASE_REF_EXTRA="$(DEV_SUPABASE_REF_EXTRA)" DEV_SUPABASE_REF="$(DEV_SUPABASE_REF)" $(NODE) scripts/seed.cjs

reset-dev:
	@if [ ! -f "$(LINKED_REF_FILE)" ]; then \
	  echo "error: not linked to a Supabase project"; exit 1; \
	fi; \
	LINKED_REF=$$(cat "$(LINKED_REF_FILE)"); \
	case " $(ALLOWED_DEV_REFS) " in \
	  *" $$LINKED_REF "*) ;; \
	  *) echo "REFUSED: linked project is $$LINKED_REF, expected DEV"; exit 1;; \
	esac; \
	echo "WARNING: this rebuilds the linked DEV database $$LINKED_REF"; \
	read -r -p "Type DEV to confirm: " CONFIRM; \
	if [ "$$CONFIRM" != "DEV" ]; then echo "Aborted"; exit 1; fi; \
	$(SUPABASE) db reset --linked

migrate-dev migrate-prod:
	$(SUPABASE) db push
