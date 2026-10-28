

## Quick Reference

### Most Used Commands
```bash
# Check status
git status

# Pull latest
git pull origin main

# Create branch
git checkout -b feature/name

# Save changes
git add .
git commit -m "type: description"

# Push changes
git push origin branch-name

# Update dependencies
npm install

# Reset database
node setup.js

# Start server
node server.js
```

---

## Common Git Commands

### Checking Status
```bash
# See what changed
git status

# See what specific changes were made
git diff

# See commit history
git log --oneline
```

### Undoing Changes

```bash
# Undo changes to a file (before commit)
git checkout -- filename.js

# Undo last commit (keeps changes)
git reset --soft HEAD~1

# Undo last commit (removes changes)
git reset --hard HEAD~1

# Discard all local changes
git reset --hard origin/main
```

### Stashing (Temporary Save)

```bash
# Save current work without committing
git stash

# List stashed changes
git stash list

# Restore stashed changes
git stash pop

# Discard stashed changes
git stash drop
```

### Branch Management

```bash
# List all branches
git branch -a

# Switch to branch
git checkout branch-name

# Create and switch to new branch
git checkout -b new-branch-name

# Delete local branch
git branch -d branch-name

# Delete remote branch
git push origin --delete branch-name
```

---


## Daily Workflow
### Morning - Starting Work

```bash
# 1. Make sure you're on main branch
git checkout main

# 2. Pull latest changes
git pull origin main

# 3. Update dependencies if needed
cd backend
npm install

# 4. If schema changed, reset database
node setup.js

# 5. Create your feature branch
git checkout -b feature/your-feature-name

# 6. Start server and begin coding
node server.js
```

### During Work - Saving Progress

```bash
# Save frequently (doesn't push to remote)
git add .
git commit -m "feat: working on user profile page"
```

### Evening - Pushing Your Work

```bash
# 1. Make sure all changes are committed
git status

# 2. Pull latest main to check for conflicts
git checkout main
git pull origin main

# 3. Go back to your branch
git checkout feature/your-feature-name

# 4. Merge main into your branch
git merge main

# 5. Resolve any conflicts if they exist
# (Your IDE will show conflicts - fix them)

# 6. Push your branch
git push origin feature/your-feature-name

# 7. Create Pull Request on GitHub/GitLab
```

---

## Pull Request Checklist

Before creating a PR, make sure:

- [ ] Code runs without errors
- [ ] Tested all changes manually
- [ ] No console errors in browser
- [ ] Database operations work
- [ ] All tests pass (if applicable)
- [ ] No sensitive data (passwords, keys) in code
- [ ] Comments added for complex logic
- [ ] README updated if needed
- [ ] Commit messages are clear
- [ ] No unnecessary files committed

---

##  Merge Conflict Resolution

If you get conflicts:

```bash
# 1. Files with conflicts will be marked
git status
# Shows: "both modified: backend/server.js"

# 2. Open the file in your editor
# Look for conflict markers:
<<<<<<< HEAD (your changes)
your code here
=======
their code here
>>>>>>> main (incoming changes)

# 3. Decide what to keep:
# Option A: Keep your changes (remove their part)
# Option B: Keep their changes (remove your part)
# Option C: Keep both (merge manually)

# 4. Remove conflict markers (<<<<, ====, >>>>)

# 5. Test that it works

# 6. Mark as resolved
git add backend/server.js
git commit -m "fix: resolve merge conflict in server.js"

# 7. Continue with your work
```

## Scenario-Based Workflows

### Scenario 1: Starting New Feature

```bash
git checkout main
git pull origin main
git checkout -b feature/user-authentication
# Make changes...
git add .
git commit -m "feat: add user login functionality"
git push origin feature/user-authentication
# Create Pull Request
```

### Scenario 2: Fixing Bug

```bash
git checkout main
git pull origin main
git checkout -b bugfix/photo-upload-error
# Fix the bug...
git add .
git commit -m "fix: resolve photo upload memory leak"
git push origin bugfix/photo-upload-error
# Create Pull Request
```

### Scenario 3: Updating Documentation

```bash
git checkout main
git pull origin main
git checkout -b docs/api-endpoints
# Update docs...
git add .
git commit -m "docs: document feedback API endpoints"
git push origin docs/api-endpoints
# Create Pull Request
```

### Scenario 4: Emergency Production Fix

```bash
# Critical bug in production
git checkout main
git pull origin main
git checkout -b hotfix/database-connection
# Fix immediately...
git add .
git commit -m "hotfix: fix database connection pool exhaustion"
git push origin hotfix/database-connection
# Create URGENT Pull Request
# After merge, pull main and delete hotfix branch
```

### Scenario 5: Collaborating on Same Feature

```bash
# Person A creates branch
git checkout -b feature/admin-dashboard
git push origin feature/admin-dashboard

# Person B joins the feature
git fetch origin
git checkout feature/admin-dashboard

# Both work and push frequently
git pull origin feature/admin-dashboard  # Get others' changes
# Make your changes...
git add .
git commit -m "feat: add user statistics to dashboard"
git pull origin feature/admin-dashboard  # Check for new changes
git push origin feature/admin-dashboard

# When feature is complete, create PR from feature branch to main
```

### Never Commit:
- ❌ `node_modules/` folder
- ❌ `.env` file with secrets
- ❌ Personal configuration files
- ❌ Database files (*.db, *.sqlite)
- ❌ Log files (*.log)
- ❌ Upload folders with user data
- ❌ SSL certificates (production)
- ❌ API keys or passwords

---

##  Code Review Checklist

When reviewing someone else's Pull Request:

### Code Quality
- [ ] Code follows project style guide
- [ ] No unnecessary comments
- [ ] No debugging code (console.log)
- [ ] Variable names are descriptive
- [ ] Functions are small and focused

### Functionality
- [ ] Feature works as described
- [ ] No obvious bugs
- [ ] Handles edge cases
- [ ] Error handling is proper

### Performance
- [ ] No obvious performance issues
- [ ] Database queries are efficient
- [ ] No memory leaks

### Security
- [ ] No SQL injection vulnerabilities
- [ ] User input is validated
- [ ] Sensitive data is not exposed
- [ ] Authentication is proper

### Testing
- [ ] New code is tested
- [ ] Existing tests still pass
- [ ] Manual testing was done



---

##  When to Ask for Help

Ask for help if:
- 🔴 You have merge conflicts you can't resolve
- 🔴 You accidentally committed sensitive data
- 🔴 You deleted important code
- 🔴 Git commands are giving errors you don't understand
- 🔴 You need to undo multiple commits
- 🔴 Your branch is far behind main


---

##  Learning Resources

- [Git Official Documentation](https://git-scm.com/doc)
- [GitHub Guides](https://guides.github.com/)
- [Git Cheat Sheet](https://education.github.com/git-cheat-sheet-education.pdf)
- [Learn Git Branching (Interactive)](https://learngitbranching.js.org/)

---

**Remember:** 
- Commit often (locally)
- Push daily
- Pull before starting work
- Create branches for features
- Don't work directly on main

