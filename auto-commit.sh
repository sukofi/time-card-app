#!/bin/bash

# Auto-commit script for time card app
# This script watches for file changes and automatically commits them to GitHub

echo "Starting auto-commit script..."
echo "Watching for file changes in the project..."

# Function to commit and push changes
commit_and_push() {
    echo "Changes detected! Committing and pushing..."
    
    # Stage all changes
    git add -A
    
    # Check if there are changes to commit
    if git diff --cached --quiet; then
        echo "No changes to commit"
        return
    fi
    
    # Create commit with timestamp
    TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
    COMMIT_MESSAGE="Auto-commit: $(date '+%Y-%m-%d %H:%M:%S')"
    
    if git commit -m "$COMMIT_MESSAGE"; then
        echo "Committed changes: $COMMIT_MESSAGE"
        
        # Push to GitHub
        if git push origin master; then
            echo "Successfully pushed to GitHub"
        else
            echo "Failed to push to GitHub"
        fi
    else
        echo "Failed to commit changes"
    fi
}

# Watch for file changes (excluding .git directory and node_modules)
while true; do
    # Use fswatch if available, otherwise use inotifywait or fallback to polling
    if command -v fswatch >/dev/null 2>&1; then
        # macOS with fswatch
        fswatch -o . --exclude='.git' --exclude='node_modules' --exclude='dist' | while read num; do
            commit_and_push
        done
    elif command -v inotifywait >/dev/null 2>&1; then
        # Linux with inotifywait
        inotifywait -r -e modify,create,delete,move . --exclude='.git' --exclude='node_modules' --exclude='dist' && commit_and_push
    else
        # Fallback to polling every 30 seconds
        sleep 30
        if ! git diff --quiet; then
            commit_and_push
        fi
    fi
done
