# ...existing code...
# Makefile for FastAPI project using 'uv' (universe/venv helper) and ruff
# Cross-platform color output detection (colors only on Unix-like shells)
ifeq ($(OS),Windows_NT)
    # Windows: No ANSI colors in standard cmd/PowerShell
    BLUE :=
    GREEN :=
    YELLOW :=
    RED :=
    NC :=
else
    # Unix/Linux/macOS: Use ANSI colors for nicer output
    BLUE := \033[0;34m
    GREEN := \033[0;32m
    YELLOW := \033[0;33m
    RED := \033[0;31m
    NC := \033[0m
endif

# Phony targets are not files
.PHONY: help install i sync requirements add dev d run update u remove r lint format fix type test cov clean litecli lock

help: ## Show this help
	@awk 'BEGIN {FS = ":.*##"; printf "\nUsage:\n  make \033[36m<target>\033[0m\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2 } /^##@/ { printf "\n\033[1m%s\033[0m\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

# Sync the environment to lockfile (installs packages)
sync: ## Sync the environment
	@echo "$(YELLOW)🔄 Syncing dependencies...$(NC)"
	@uv sync
	@echo "$(GREEN)✅ Sync complete$(NC)"

install: sync ## Alias for sync (install deps)

# Add a production package and re-sync, then export requirements.txt
add: ## Add production package (make add pkg=fastapi)
	@echo "$(YELLOW)➕ Adding package: $(pkg)...$(NC)"
	@uv add $(pkg)
	@uv sync
	@uv export --format requirements-txt --no-hashes > requirements.txt
	@echo "$(GREEN)✅ Package added and requirements exported$(NC)"

# Alias for add
i: add ## Alias for add

# Add a development package, sync and export both requirements files
dev: ## Add development package (make dev pkg=pytest)
	@echo "$(YELLOW)➕ Adding dev package: $(pkg)...$(NC)"
	@uv add --dev $(pkg)
	@uv sync
	@uv export --format requirements-txt --no-hashes --dev > requirements-dev.txt
	@uv export --format requirements-txt --no-hashes > requirements.txt
	@echo "$(GREEN)✅ Dev package added and requirements exported$(NC)"

# Alias for dev
d: dev ## Alias for dev

# Run the FastAPI app with uvicorn in reload mode for development
run: ## Run dev server (hot-reload)
	@echo "$(YELLOW)🚀 Starting FastAPI dev server...$(NC)"
	uv run uvicorn main:app --reload

# Update packages; pass pkg to update a single package
update: ## Update specific package (make update pkg=fastapi) or all (make update)
	@if [ -z "$(pkg)" ]; then \
		echo "$(YELLOW)⬆️  Updating all packages...$(NC)"; \
		uv lock --upgrade; \
		uv sync; \
	else \
		echo "$(YELLOW)⬆️  Updating package: $(pkg)$(NC)"; \
		uv lock --upgrade-package $(pkg); \
		uv sync; \
	fi
	@uv export --format requirements-txt --no-hashes > requirements.txt
	@uv export --format requirements-txt --no-hashes --dev > requirements-dev.txt
	@echo "$(GREEN)✅ Update completed and requirements files generated$(NC)"

# Alias for update
u: update ## Alias for update

# Remove a package, re-sync and regenerate requirements files
remove: ## Remove package (make remove pkg=package-name)
	@echo "$(RED)➖ Removing package: $(pkg)...$(NC)"
	@uv remove $(pkg)
	@uv sync
	@uv export --format requirements-txt --no-hashes > requirements.txt
	@uv export --format requirements-txt --no-hashes --dev > requirements-dev.txt
	@echo "$(GREEN)✅ Package removed and requirements exported$(NC)"

# Alias for remove
r: remove ## Alias for remove

# Lint the repository with ruff
lint: ## Lint code with ruff
	@echo "$(YELLOW)🔍 Linting...$(NC)"
	uv run ruff check .

# Format code with ruff
format: ## Format code with ruff
	@echo "$(YELLOW)✨ Formatting...$(NC)"
	uv run ruff format .

# Fix issues with ruff then format
fix: ## Auto-fix lint issues then format
	@echo "$(YELLOW)🛠 Fixing lint issues...$(NC)"
	uv run ruff check . --fix
	uv run ruff format .
	@echo "$(GREEN)✅ Fixes applied$(NC)"

# Type check with mypy
type: ## Type check with mypy
	@echo "$(YELLOW)🔍 Type checking...$(NC)"
	uv run mypy .
	@echo "$(GREEN)✅ Type check complete$(NC)"

# Run tests with pytest (add pytest to dev-deps if missing)
test: ## Run tests with pytest
	@echo "$(YELLOW)🧪 Running tests...$(NC)"
	uv run pytest -v
	@echo "$(GREEN)✅ Tests complete$(NC)"

# Run tests with coverage (add pytest-cov to dev-deps if missing)
cov: ## Run tests with coverage report
	@echo "$(YELLOW)🧪 Running tests with coverage...$(NC)"
	uv run pytest --cov=app --cov-report=term-missing  # Adjust 'app' to your src dir
	@echo "$(GREEN)✅ Coverage report generated$(NC)"

# Clean common build/test/artifact directories and files
clean: ## Clean caches and artifacts
	@echo "$(RED)🧹 Cleaning...$(NC)"
	rm -rf __pycache__ .pytest_cache .ruff_cache .venv .mypy_cache requirements.txt requirements-dev.txt
	find . -type f -name "*.pyc" -delete
	uv cache clean
	@echo "$(GREEN)✅ Clean complete$(NC)"

# Open a sqlite database with litecli (pass db=path); note: for MySQL, consider mycli instead
litecli: ## Run litecli with a database file (make litecli db=file.db)
	uv run litecli $(db)

# Lock dependencies without upgrading
lock: ## Update uv.lock (after pyproject.toml changes)
	@echo "$(YELLOW)🔒 Locking dependencies...$(NC)"
	uv lock
	@echo "$(GREEN)✅ Lockfile updated$(NC)"