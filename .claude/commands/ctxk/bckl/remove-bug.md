# Remove Fixed Bugs from Backlog
<!-- Template Version: 3 | ContextKit: 0.2.0 | Updated: 2025-10-18 -->

> [!WARNING]
> **👩‍💻 FOR DEVELOPERS**: Do not edit the content above the developer customization section - changes will be overwritten during ContextKit updates.
>
> For project-specific customizations, use the designated section at the bottom of this file.
>
> Found a bug or improvement for everyone? Please report it: https://github.com/FlineDev/ContextKit/issues

## Description
Remove fixed or resolved bugs from the backlog database. Identifies target bug through search and calls database removal operations defined in Bugs-Backlog.md.

## Parameters
- `description` (required): The bug description or ID (e.g., "login crash" or "BUG-001")

## Execution Flow (main)

### Phase 0: Check Customization

0. **Read the "👩‍💻 DEVELOPER CUSTOMIZATIONS" section**
   - Use `Grep` tool to find the start of the section
   - Read everything below that line contained in this document til the end of the file
   - Make sure to consider what was said there with high priority
   - If anything conflicts with the rest of the workflow, prioritize the "developer customizations"

### Phase 1: Setup & Infrastructure Check

1. **Check Bug Infrastructure**
   - Use `Glob` tool to verify: `Glob Context/Backlog Bugs-Backlog.md`
   - If Bugs-Backlog.md missing:
     ```
     ❌ Bug backlog not found!

     Expected: Context/Backlog/Bugs-Backlog.md
     Run /ctxk:proj:init to setup ContextKit backlog system first.
     ```
     → END (exit with error)

### Phase 2: Bug Identification

2. **Parse User Input**
   - Extract search term from command parameter
   - If no description provided: ERROR "Description required: /ctxk:bckl:remove-bug 'search term or BUG-001'"

3. **Search Existing Backlog**
   - Use `Read` tool to read Bugs-Backlog.md: `Read Context/Backlog/Bugs-Backlog.md`
   - Search Priority Index and Bug Details sections for matches
   - **Perfect ID match**: If input exactly matches "BUG-###" format and exists, skip to confirmation
   - **Partial matches**: Search titles and descriptions for keywords

4. **Present Search Results**
   - If no matches found:
     - Display message: "🐛 No matching bugs found for: '[search term]'. Check Context/Backlog/Bugs-Backlog.md for available bugs. Use exact ID like 'BUG-001' or keywords from the bug title."
     → END (no matches)

   - If single match found: Skip to confirmation step
   - If multiple matches found:
     - Display matches in chat:
       ```
       ════════════════════════════════════════════════════════════════
       🔍 SEARCH RESULTS - Multiple Bugs Found
       ════════════════════════════════════════════════════════════════

       Multiple bugs match "[search term]":

       A) [BUG-001] Login crashes on iOS 18.2 (Critical, Simple fix)
       B) [BUG-003] Login validation error (High, Medium effort)
       C) [BUG-007] Login button alignment (Low, Simple fix)

       ════════════════════════════════════════════════════════════════
       ```
     - Use AskUserQuestion tool with dynamically generated options based on search results:
       ```json
       {
         "questions": [
           {
             "question": "Which bug do you want to remove?",
             "header": "Select Bug",
             "options": [
               {
                 "label": "[BUG-001] Login crash",
                 "description": "Login crashes on iOS 18.2 (Critical, Simple fix)"
               },
               {
                 "label": "[BUG-003] Validation",
                 "description": "Login validation error (High, Medium effort)"
               },
               {
                 "label": "[BUG-007] Button align",
                 "description": "Login button alignment (Low, Simple fix)"
               }
             ],
             "multiSelect": false
           }
         ]
       }
       ```
     - Wait for user selection
     - Note: "New search" option available via "Other" selection

### Phase 3: Confirmation & Removal

5. **Confirm Removal Intent**
   - Display selected bug details in chat:
     ```
     ────────────────────────────────────────────────────────────────
     🗑️ CONFIRM REMOVAL - Are you sure?
     ────────────────────────────────────────────────────────────────

     Bug: [BUG-###] [Title]
     Severity: [Critical/High/Medium/Low]
     Priority Score: [Score from backlog]
     Effort: [Simple/Medium/Complex/Major]
     Source: [Who reported it]
     Status: This will be permanently removed from the backlog

     ────────────────────────────────────────────────────────────────
     ```
   - Use AskUserQuestion tool with these parameters:
     ```json
     {
       "questions": [
         {
           "question": "🗑️ Are you sure you want to remove bug [BUG-###] ([Title])?",
           "header": "Confirm?",
           "options": [
             {
               "label": "Yes, remove",
               "description": "Permanently remove this bug from the backlog"
             },
             {
               "label": "No, cancel",
               "description": "Keep this bug in the backlog and exit"
             }
           ],
           "multiSelect": false
         }
       ]
     }
     ```
   - Wait for user response
   - If user selects "No, cancel": Cancel and exit gracefully

6. **Execute REMOVE_FIXED Operation**
   - **Call REMOVE_FIXED operation from Bugs-Backlog.md** with:
     - Confirmed bug ID
     - Resolution status (fixed/resolved/duplicate/won't-fix)
   - The backlog file handles all database cleanup operations
   - Preserve operation result for success message

7. **Display Removal Confirmation**
   ```
   ✅ Bug removed successfully!

   🗑️ Removed: [BUG-###] [Title]
   📊 Database operations: REMOVE_FIXED executed
   🧹 Cleaned: Priority Index, Metadata Tables, and Bug Details

   📋 Updated backlog status:
   • Total active bugs: [Remaining count]
   • Critical bugs remaining: [Critical count]
   • Next highest priority: [Next bug if any]

   🐛 Backlog is now updated and ready for continued development!
   ```

## Search Strategy Details

### ID-Based Search
- **Exact match**: "BUG-001" → Direct match if exists
- **Partial ID**: "001" → Search for "BUG-001"
- **Case insensitive**: "bug-001" → Matches "BUG-001"

### Keyword Search
- **Title matching**: Search bug titles for keywords
- **Description content**: Search context and triage notes
- **Severity matching**: Search by "critical", "high", "medium", "low"
- **Source matching**: Search source attribution fields
- **Multi-word**: "login crash" → Matches titles containing both words

### Search Results Priority
1. **Exact ID matches** (highest priority)
2. **Title keyword matches** (high priority)
3. **Severity level matches** (medium-high priority)
4. **Description content matches** (medium priority)
5. **Source attribution matches** (lower priority)

## Error Conditions

- **"Bugs-Backlog.md missing"** → Run `/ctxk:proj:init` to setup infrastructure
- **"No description provided"** → Show usage: `/ctxk:bckl:remove-bug "search term"`
- **"No matching bugs found"** → Suggest checking backlog file or using different keywords
- **"User cancelled removal"** → Graceful exit without changes
- **"Database operation failed"** → Check Bugs-Backlog.md structure and REMOVE_FIXED operation

## Validation Gates

**Prerequisites:**
- Bug backlog infrastructure exists and is readable?
- User provided meaningful search term or ID?
- Bugs-Backlog.md contains REMOVE_FIXED operation?

**Processing:**
- Search identified at least one matching bug?
- User confirmed removal of correct bug?
- REMOVE_FIXED operation executed successfully?

**Output:**
- Bug removed from all backlog database sections?
- Critical bug count updated if applicable?
- Database integrity maintained after removal?

## Integration Points

- **Database Operations**: Uses REMOVE_FIXED method documented in Bugs-Backlog.md self-managing database
- **Search & Discovery**: Flexible search across ID, title, description, severity, and source fields
- **User Safety**: Confirmation step prevents accidental removals
- **Status Tracking**: Updates overall backlog metrics and critical bug counts after removal

════════════════════════════════════════════════════════════════════════════════
👩‍💻 DEVELOPER CUSTOMIZATIONS - EDITABLE SECTION
════════════════════════════════════════════════════════════════════════════════

This section is preserved during ContextKit migrations and updates.
Add project-specific instructions, examples, and overrides below.

## Custom Search Patterns

<!-- Add project-specific search keyword patterns -->

## Removal Confirmation Overrides

<!-- Modify confirmation flow if needed for project -->

## Database Operation Customizations

<!-- Override REMOVE_FIXED behavior if needed -->