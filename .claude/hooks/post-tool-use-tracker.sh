#!/bin/bash

# Claude Code Post-Tool-Use Hook
# Tracks edited files and identifies affected repositories/components

# Read hook input from stdin
INPUT=$(cat)

# Extract tool information
TOOL_NAME=$(echo "$INPUT" | grep -o '"tool":"[^"]*"' | head -1 | cut -d'"' -f4)
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | cut -d'"' -f4)

# Only process Edit, MultiEdit, and Write tools
if [[ ! "$TOOL_NAME" =~ ^(Edit|MultiEdit|Write)$ ]]; then
    exit 0
fi

# Skip if no file path (shouldn't happen, but defensive)
if [[ -z "$FILE_PATH" ]]; then
    exit 0
fi

# Skip markdown files (documentation, not code)
if [[ "$FILE_PATH" =~ \.md$ ]]; then
    exit 0
fi

# Create cache directory
CACHE_DIR="${CLAUDE_PROJECT_DIR}/.claude/cache"
mkdir -p "$CACHE_DIR"

# Log the edited file with timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
echo "[$TIMESTAMP] $FILE_PATH" >> "$CACHE_DIR/edited-files.log"

# Detect which repository/component was affected
detect_repo() {
    local path="$1"

    # Frontend variations
    if [[ "$path" =~ (frontend|client|web|app|ui)/ ]]; then
        echo "frontend"
    # Backend variations
    elif [[ "$path" =~ (backend|server|api|src|services)/ ]]; then
        echo "backend"
    # Database
    elif [[ "$path" =~ (database|db|prisma|migrations)/ ]]; then
        echo "database"
    # Packages (monorepo)
    elif [[ "$path" =~ packages/([^/]+) ]]; then
        echo "package:${BASH_REMATCH[1]}"
    # Examples
    elif [[ "$path" =~ examples/ ]]; then
        echo "examples"
    # Root-level files
    else
        echo "root"
    fi
}

REPO=$(detect_repo "$FILE_PATH")
echo "$REPO" >> "$CACHE_DIR/affected-repos.txt"

# Deduplicate affected repos
sort -u "$CACHE_DIR/affected-repos.txt" -o "$CACHE_DIR/affected-repos.txt"

# Detect build command for the affected repo
get_build_command() {
    local repo="$1"
    local repo_path=""

    # Map repo to actual directory path
    case "$repo" in
        frontend|backend|database)
            repo_path="$repo"
            ;;
        package:*)
            local pkg="${repo#package:}"
            repo_path="packages/$pkg"
            ;;
        root|examples)
            repo_path="."
            ;;
    esac

    # Look for package.json
    local pkg_json="${CLAUDE_PROJECT_DIR}/${repo_path}/package.json"
    if [[ -f "$pkg_json" ]]; then
        # Check if build script exists
        if grep -q '"build"' "$pkg_json"; then
            # Detect package manager
            if [[ -f "${CLAUDE_PROJECT_DIR}/${repo_path}/pnpm-lock.yaml" ]]; then
                echo "cd $repo_path && pnpm build"
            elif [[ -f "${CLAUDE_PROJECT_DIR}/${repo_path}/yarn.lock" ]]; then
                echo "cd $repo_path && yarn build"
            else
                echo "cd $repo_path && npm run build"
            fi
        fi
    fi

    # Special case: Prisma database changes
    if [[ "$repo" == "database" ]] && [[ -f "${CLAUDE_PROJECT_DIR}/prisma/schema.prisma" ]]; then
        echo "npx prisma generate && npx prisma db push"
    fi
}

# Detect TypeScript check command
get_tsc_command() {
    local repo="$1"
    local repo_path=""

    # Map repo to actual directory path
    case "$repo" in
        frontend|backend|database)
            repo_path="$repo"
            ;;
        package:*)
            local pkg="${repo#package:}"
            repo_path="packages/$pkg"
            ;;
        root|examples)
            repo_path="."
            ;;
    esac

    # Look for tsconfig.json
    local tsconfig="${CLAUDE_PROJECT_DIR}/${repo_path}/tsconfig.json"
    if [[ -f "$tsconfig" ]]; then
        echo "cd $repo_path && npx tsc --noEmit"
    fi

    # Special handling for Vite/React projects
    if [[ -f "${CLAUDE_PROJECT_DIR}/${repo_path}/vite.config.ts" ]]; then
        echo "cd $repo_path && npx tsc --noEmit"
    fi
}

# Generate build and tsc commands
BUILD_CMD=$(get_build_command "$REPO")
TSC_CMD=$(get_tsc_command "$REPO")

# Append to commands cache (deduplicate later)
if [[ -n "$BUILD_CMD" ]]; then
    echo "$BUILD_CMD" >> "$CACHE_DIR/commands.txt"
fi

if [[ -n "$TSC_CMD" ]]; then
    echo "$TSC_CMD" >> "$CACHE_DIR/commands.txt"
fi

# Deduplicate commands
if [[ -f "$CACHE_DIR/commands.txt" ]]; then
    sort -u "$CACHE_DIR/commands.txt" -o "$CACHE_DIR/commands.txt"
fi

exit 0
