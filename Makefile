.DEFAULT_GOAL := help
.PHONY: help up down logs api-shell db-shell migrate makemigration fmt lint test \
        check check-api check-web smoke gen-api api-image web-image \
        tf tf-fmt tf-validate tf-plan tf-apply gcp-start gcp-stop gcp-status gcp-urls

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

# ── Local dev stack (docker compose) ──────────────────────────────────────────
up: ## Build and start the full stack (db + api + web)
	docker compose up --build

down: ## Stop the stack
	docker compose down

logs: ## Tail api logs
	docker compose logs -f api

api-shell: ## Open a shell in the running api container
	docker compose exec api bash

db-shell: ## Open a psql shell
	docker compose exec db psql -U crafton -d crafton

migrate: ## Apply DB migrations (alembic upgrade head)
	docker compose exec api alembic upgrade head

makemigration: ## Autogenerate a migration: make makemigration m="message"
	docker compose exec api alembic revision --autogenerate -m "$(m)"

# ── Quality gates ─────────────────────────────────────────────────────────────
fmt: ## Auto-format + autofix Python (ruff) in Docker
	docker compose run --rm --no-deps api sh -c "pip install -q -e '.[dev]' && ruff check --fix . && ruff format ."

lint: ## Lint + type-check the backend (ruff + mypy) in Docker
	docker compose run --rm --no-deps api sh -c "pip install -q -e '.[dev]' && ruff check . && mypy app"

test: ## Run backend tests (pytest) in Docker
	docker compose run --rm --no-deps api sh -c "pip install -q -e '.[dev]' && pytest -q"

check: ## Full gate: lint + type-check + tests for api and web (Docker, no local install)
	./scripts/check.sh

check-api: ## Quality gate for the backend only
	./scripts/check.sh api

check-web: ## Quality gate for the frontend only
	./scripts/check.sh web

smoke: ## Boot db+api and verify the api /readyz responds (end-to-end smoke test)
	@docker compose up -d --wait db
	@docker compose up -d api
	@echo "Waiting for api /readyz ..."
	@for i in $$(seq 1 30); do \
		if curl -sf http://localhost:58000/readyz >/dev/null 2>&1; then \
			echo "✓ /readyz OK"; curl -s http://localhost:58000/readyz; echo; exit 0; \
		fi; \
		sleep 2; \
	done; \
	echo "✗ /readyz did not come up in time"; docker compose logs --tail=40 api; exit 1

gen-api: ## Regenerate the web typed API client from the running api's OpenAPI
	@curl -sf http://localhost:58000/openapi.json -o web/openapi.snapshot.json \
		&& echo "wrote web/openapi.snapshot.json — run 'npm run gen:api' in web/ to regenerate types"

# ── Container images (what CI builds; handy for local verification) ────────────
api-image: ## Build the api Cloud Run image locally
	docker build --platform=linux/amd64 -t crafton-api:local ./api

web-image: ## Build the web Cloud Run image locally
	docker build --platform=linux/amd64 -t crafton-web:local ./web

# ── Terraform (containerized — no local install needed) ───────────────────────
# Runs in the official hashicorp/terraform image. Override the version with:
#   make tf-validate TF_VERSION=x.y.z
TF_VERSION ?= 1.9.8
TF_ROOT    := infra/terraform
# The dev root config lives in environments/dev and references ../../modules, so
# the WHOLE tree is mounted and the working dir is set to the dev env inside it.
TF_ENV     := environments/dev
TF_IMAGE   := hashicorp/terraform:$(TF_VERSION)
# fmt walks the whole tree (modules + environments).
TF_FMT_RUN := docker run --rm -v $(CURDIR)/$(TF_ROOT):/work -w /work $(TF_IMAGE)
TF_RUN     := docker run --rm -v $(CURDIR)/$(TF_ROOT):/work -w /work/$(TF_ENV) $(TF_IMAGE)
# Credential-mounting variant for commands that talk to GCP (plan/apply).
# Uses Application Default Credentials: run `gcloud auth application-default login` first.
TF_RUN_GCP := docker run --rm -v $(CURDIR)/$(TF_ROOT):/work -w /work/$(TF_ENV) \
	-v $(HOME)/.config/gcloud:/root/.config/gcloud \
	-e GOOGLE_APPLICATION_CREDENTIALS=/root/.config/gcloud/application_default_credentials.json \
	$(TF_IMAGE)

tf-fmt: ## Format all terraform files under infra/terraform
	$(TF_FMT_RUN) fmt -recursive

tf-validate: ## Validate the dev terraform config (no cloud credentials needed)
	$(TF_RUN) init -backend=false -input=false
	$(TF_RUN) validate

tf: ## Run any terraform command against the dev config: make tf cmd="plan"
	@mkdir -p $(HOME)/.config/gcloud
	$(TF_RUN_GCP) $(cmd)

tf-plan: ## Show the terraform plan against the dev project
	@mkdir -p $(HOME)/.config/gcloud
	$(TF_RUN_GCP) plan

tf-apply: ## Apply terraform to the dev project (auto-approved)
	@mkdir -p $(HOME)/.config/gcloud
	$(TF_RUN_GCP) apply -auto-approve

# ── Cloud dev env start/stop (Cloud SQL is the only idle cost) ─────────────────
# Cloud Run already scales to zero; these toggle the Cloud SQL instance via the
# sql_stopped variable. For a stop that survives a plain `make tf-apply`, also set
# sql_stopped=true in terraform.tfvars.
GCP_PROJECT  ?= crafton-dev-500709
SQL_INSTANCE ?= crafton-dev

gcp-stop: ## Stop the cloud dev env (parks Cloud SQL to cut idle cost)
	@mkdir -p $(HOME)/.config/gcloud
	$(TF_RUN_GCP) apply -auto-approve -var=sql_stopped=true

gcp-start: ## Start the cloud dev env (resumes Cloud SQL)
	@mkdir -p $(HOME)/.config/gcloud
	$(TF_RUN_GCP) apply -auto-approve -var=sql_stopped=false

gcp-status: ## Show the cloud dev env's Cloud SQL state
	@gcloud sql instances describe $(SQL_INSTANCE) --project=$(GCP_PROJECT) \
		--format='table(state, settings.activationPolicy, ipAddresses[0].ipAddress)' \
		2>/dev/null || echo "could not reach Cloud SQL (check gcloud auth / project)"

gcp-urls: ## List the deployed Cloud Run service URLs
	@gcloud run services list --project=$(GCP_PROJECT) --region=asia-northeast1 \
		--format='table(metadata.name, status.url)' \
		2>/dev/null || echo "could not reach Cloud Run (check gcloud auth / project)"
