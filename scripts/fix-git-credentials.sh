#!/bin/bash
# Fix Git Credentials for Workflow File Pushes
# This script helps resolve the OAuth token issue when pushing workflow files

set -e

REPO_DIR="/Users/grandinharrison/Desktop/claude-code-projects/claude-chaos-express"
cd "$REPO_DIR"

echo "🔍 Diagnosing Git credential issue..."
echo ""

# Check current remote
CURRENT_REMOTE=$(git remote get-url origin)
echo "Current remote: $CURRENT_REMOTE"
echo ""

if [[ "$CURRENT_REMOTE" == https://* ]]; then
    echo "❌ Remote is using HTTPS (this is the problem)"
    echo ""
    echo "GitHub blocks OAuth tokens from modifying workflow files."
    echo "Even if your token has 'workflow' permissions, OAuth tokens cannot push workflow files."
    echo ""
    echo "Solutions:"
    echo ""
    echo "1️⃣  Switch to SSH (Recommended - permanent fix):"
    echo "   - Generate SSH key: ssh-keygen -t ed25519 -C 'your_email@example.com'"
    echo "   - Add to GitHub: cat ~/.ssh/id_ed25519.pub | pbcopy"
    echo "   - Then run: git remote set-url origin git@github.com:grandinh/claude-chaos-express.git"
    echo ""
    echo "2️⃣  Use Personal Access Token (PAT) instead of OAuth:"
    echo "   - Remove OAuth token: security delete-internet-password -s github.com"
    echo "   - Create PAT at: https://github.com/settings/tokens"
    echo "   - PAT must have 'workflow' scope"
    echo "   - Git will prompt for token on next push"
    echo ""
    echo "3️⃣  Manual push (temporary workaround):"
    echo "   - Push manually with your own credentials"
    echo ""
    
    read -p "Would you like to switch to SSH now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Check for existing SSH key
        if [ -f ~/.ssh/id_ed25519.pub ] || [ -f ~/.ssh/id_rsa.pub ]; then
            echo "✅ Found existing SSH key"
            if [ -f ~/.ssh/id_ed25519.pub ]; then
                echo "Public key:"
                cat ~/.ssh/id_ed25519.pub
                echo ""
                echo "Copy this key and add it to GitHub: https://github.com/settings/keys"
                read -p "Press Enter after adding the key to GitHub..."
            fi
        else
            echo "📝 Generating new SSH key..."
            read -p "Enter your GitHub email: " GITHUB_EMAIL
            ssh-keygen -t ed25519 -C "$GITHUB_EMAIL" -f ~/.ssh/id_ed25519 -N ""
            echo ""
            echo "✅ SSH key generated!"
            echo ""
            echo "Public key (copied to clipboard):"
            cat ~/.ssh/id_ed25519.pub | pbcopy
            cat ~/.ssh/id_ed25519.pub
            echo ""
            echo "📋 Key copied to clipboard. Add it to GitHub:"
            echo "   https://github.com/settings/keys"
            echo ""
            read -p "Press Enter after adding the key to GitHub..."
        fi
        
        # Test SSH connection
        echo "🔐 Testing SSH connection..."
        if ssh -T git@github.com 2>&1 | grep -q "successfully authenticated"; then
            echo "✅ SSH connection successful!"
            echo ""
            echo "🔄 Switching remote to SSH..."
            git remote set-url origin git@github.com:grandinh/claude-chaos-express.git
            echo "✅ Remote switched to SSH!"
            echo ""
            echo "🚀 You can now push workflow files without issues."
        else
            echo "❌ SSH connection failed. Please check your SSH key setup."
            exit 1
        fi
    fi
else
    echo "✅ Remote is already using SSH"
fi

