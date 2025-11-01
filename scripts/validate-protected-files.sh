#!/bin/bash

# Protected Files Validation Script
# Prevents modification of critical system files
# Checks per-package protected-files configuration

DIFF_CMD=${1:-"git diff --cached --name-only"}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Get list of changed files
CHANGED_FILES=$($DIFF_CMD)

if [[ -z "$CHANGED_FILES" ]]; then
  echo "✅ No files changed."
  exit 0
fi

# Packages to check
PACKAGES=("backend" "web" "mobile" "shared")

ERRORS=0
PROTECTED_CHANGES=()

# Process each package
for PACKAGE in "${PACKAGES[@]}"; do
  PACKAGE_DIR="$REPO_ROOT/packages/$PACKAGE"
  PROTECTED_FILE="$PACKAGE_DIR/protected-files"
  
  # Skip if package directory doesn't exist
  if [[ ! -d "$PACKAGE_DIR" ]]; then
    continue
  fi
  
  # Skip if no protected-files file, or it's empty
  if [[ ! -s "$PROTECTED_FILE" ]]; then
    continue
  fi
  
  # Read protected paths (skip comments and empty lines)
  PROTECTED_PATTERNS=$(grep -v '^#' "$PROTECTED_FILE" | grep -v '^$' || true)
  
  if [[ -z "$PROTECTED_PATTERNS" ]]; then
    continue
  fi
  
  # Check each protected pattern
  while IFS= read -r PATTERN; do
    # Skip empty lines
    [[ -z "$PATTERN" ]] && continue
    
    # Trim whitespace
    PATTERN=$(echo "$PATTERN" | xargs)
    [[ -z "$PATTERN" ]] && continue
    
    # Build full path pattern (changed files are relative to repo root)
    PACKAGE_PREFIX="packages/$PACKAGE/"
    FULL_PATTERN="$PACKAGE_PREFIX$PATTERN"
    
    # Check if any changed files exactly match this pattern
    # Use fixed-string matching for exact path comparison
    MATCHING_FILES=$(echo "$CHANGED_FILES" | grep -F "$FULL_PATTERN" | grep -E "^$FULL_PATTERN$" || true)
    
    if [[ -n "$MATCHING_FILES" ]]; then
      while IFS= read -r MATCHED_FILE; do
        [[ -z "$MATCHED_FILE" ]] && continue
        # Avoid duplicates
        if [[ ! " ${PROTECTED_CHANGES[@]} " =~ " ${MATCHED_FILE} " ]]; then
          PROTECTED_CHANGES+=("$MATCHED_FILE")
          ((ERRORS++))
        fi
      done <<< "$MATCHING_FILES"
    fi
  done <<< "$PROTECTED_PATTERNS"
done

# Report results
if [[ $ERRORS -gt 0 ]]; then
  echo ""
  echo "❌ BLOCKED: You attempted to modify protected files:"
  echo ""
  for FILE in "${PROTECTED_CHANGES[@]}"; do
    echo "   - $FILE"
  done
  echo ""
  echo "💡 Protected files cannot be modified directly."
  echo "   If you need to update these files, please:"
  echo "   1. Discuss with the team lead"
  echo "   2. Create a separate PR for review"
  echo "   3. Update the package's protected-files if the file should no longer be protected"
  echo ""
  exit 1
else
  echo "✅ No protected file changes detected."
  exit 0
fi
