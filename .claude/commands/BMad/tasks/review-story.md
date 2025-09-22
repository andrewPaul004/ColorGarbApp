# /review-story Task

When this command is used, execute the following task:

<!-- Powered by BMAD™ Core -->

# review-story

Perform a comprehensive test architecture review with quality gate decision. This adaptive, risk-aware review creates both a story update and a detailed gate file.

## Inputs

```yaml
required:
  - story_id: '{epic}.{story}' # e.g., "1.3"
  - story_path: '{devStoryLocation}/{epic}.{story}.*.md' # Path from core-config.yaml
  - story_title: '{title}' # If missing, derive from story file H1
  - story_slug: '{slug}' # If missing, derive from title (lowercase, hyphenated)
```

## Prerequisites

- Story status must be "Review"
- Developer has completed all tasks and updated the File List
- All automated tests are passing

## Review Process - Adaptive Test Architecture

### 1. Risk Assessment (Determines Review Depth)

**Auto-escalate to deep review when:**

- Auth/payment/security files touched
- No tests added to story
- Diff > 500 lines
- Previous gate was FAIL/CONCERNS
- Story has > 5 acceptance criteria
- UI changes detected (auto-trigger playwright-test-maintainer)

### 2. UI Change Detection & Playwright Integration

**Detect UI changes by analyzing:**
- File patterns: `*.tsx`, `*.jsx`, `*.vue`, `*.css`, `*.scss`, `*.less` files in File List
- Component changes: React/Vue/Angular component modifications
- Style changes: CSS, styling library, or theme modifications
- Acceptance criteria mentioning: UI, interface, visual, responsive, browser, user interaction

**When UI changes detected, immediately invoke playwright-test-maintainer agent:**

```typescript
// Pseudo-code for agent invocation
const playwrightResults = await Task.invoke('playwright-test-maintainer', {
  description: 'UI testing for story changes',
  prompt: `
    Story: ${story_id} - ${story_title}

    UI changes detected in: ${uiChangedFiles}

    Please:
    1. Analyze the code diff to understand UI workflow changes
    2. Update existing Playwright test plan based on the changes
    3. Run relevant Playwright specs across all browsers (Chromium, Firefox, WebKit)
    4. Generate comprehensive HTML report with artifacts
    5. Return summary including:
       - HTML report path and artifacts locations
       - Cross-browser test results summary
       - Any critical UI regressions or failures
       - Specific action items for failing tests
       - Recommendations for additional test coverage

    Focus on testing the workflows affected by these changes: ${affectedWorkflows}
  `,
  subagent_type: 'playwright-test-maintainer'
});
```

**Integration requirements:**
- Wait for playwright-test-maintainer completion before proceeding
- Include Playwright results in QA Results section
- Factor UI test results into gate decision (FAIL if critical UI regressions)
- Add Playwright artifacts to evidence section of gate file

### 3. Comprehensive Analysis

**A. Requirements Traceability**

- Map each acceptance criteria to its validating tests (document mapping with Given-When-Then, not test code)
- Identify coverage gaps
- Verify all requirements have corresponding test cases

**B. Code Quality Review**

- Architecture and design patterns
- Refactoring opportunities (and perform them)
- Code duplication or inefficiencies
- Performance optimizations
- Security vulnerabilities
- Best practices adherence

**C. Test Architecture Assessment**

- Test coverage adequacy at appropriate levels
- Test level appropriateness (what should be unit vs integration vs e2e)
- Test design quality and maintainability
- Test data management strategy
- Mock/stub usage appropriateness
- Edge case and error scenario coverage
- Test execution time and reliability

**UI Change Detection & Playwright Integration**

When story involves UI changes (detected by file patterns or acceptance criteria):
1. **Automatically invoke playwright-test-maintainer agent** to:
   - Update test plan based on code diff analysis
   - Run relevant Playwright specs across browsers
   - Generate HTML report with artifacts (videos, screenshots)
   - Return comprehensive test execution summary
2. **Integrate Playwright results** into QA assessment:
   - Include HTML report path in QA Results
   - Summarize cross-browser test results
   - Document any UI regression findings
   - Add action items for test failures or gaps

**D. Non-Functional Requirements (NFRs)**

- Security: Authentication, authorization, data protection
- Performance: Response times, resource usage
- Reliability: Error handling, recovery mechanisms
- Maintainability: Code clarity, documentation

**E. Testability Evaluation**

- Controllability: Can we control the inputs?
- Observability: Can we observe the outputs?
- Debuggability: Can we debug failures easily?

**F. Technical Debt Identification**

- Accumulated shortcuts
- Missing tests
- Outdated dependencies
- Architecture violations

### 4. Active Refactoring

- Refactor code where safe and appropriate
- Run tests to ensure changes don't break functionality
- Document all changes in QA Results section with clear WHY and HOW
- Do NOT alter story content beyond QA Results section
- Do NOT change story Status or File List; recommend next status only

### 5. Standards Compliance Check

- Verify adherence to `docs/coding-standards.md`
- Check compliance with `docs/unified-project-structure.md`
- Validate testing approach against `docs/testing-strategy.md`
- Ensure all guidelines mentioned in the story are followed

### 6. Acceptance Criteria Validation

- Verify each AC is fully implemented
- Check for any missing functionality
- Validate edge cases are handled

### 7. Documentation and Comments

- Verify code is self-documenting where possible
- Add comments for complex logic if missing
- Ensure any API changes are documented

## Output 1: Update Story File - QA Results Section ONLY

**CRITICAL**: You are ONLY authorized to update the "QA Results" section of the story file. DO NOT modify any other sections.

**QA Results Anchor Rule:**

- If `## QA Results` doesn't exist, append it at end of file
- If it exists, append a new dated entry below existing entries
- Never edit other sections

After review and any refactoring, append your results to the story file in the QA Results section:

```markdown
## QA Results

### Review Date: [Date]

### Reviewed By: Quinn (Test Architect)

### Code Quality Assessment

[Overall assessment of implementation quality]

### Refactoring Performed

[List any refactoring you performed with explanations]

- **File**: [filename]
  - **Change**: [what was changed]
  - **Why**: [reason for change]
  - **How**: [how it improves the code]

### Compliance Check

- Coding Standards: [✓/✗] [notes if any]
- Project Structure: [✓/✗] [notes if any]
- Testing Strategy: [✓/✗] [notes if any]
- All ACs Met: [✓/✗] [notes if any]

### Improvements Checklist

[Check off items you handled yourself, leave unchecked for dev to address]

- [x] Refactored user service for better error handling (services/user.service.ts)
- [x] Added missing edge case tests (services/user.service.test.ts)
- [ ] Consider extracting validation logic to separate validator class
- [ ] Add integration test for error scenarios
- [ ] Update API documentation for new error codes

### UI Testing Results (Playwright)

[Include if UI changes detected - automatically populated by playwright-test-maintainer agent]

**Test Execution Summary:**
- Cross-browser test results (Chromium/Firefox/WebKit)
- HTML Report: [path to generated HTML report]
- Test Artifacts: [paths to videos, screenshots, network logs]

**Critical Findings:**
- [Any failing UI tests or regressions]
- [Cross-browser compatibility issues]
- [Performance degradation in UI workflows]

**Action Items:**
- [Specific test failures requiring developer attention]
- [Recommended test coverage improvements]
- [UI-specific technical debt identified]

### Security Review

[Any security concerns found and whether addressed]

### Performance Considerations

[Any performance issues found and whether addressed]

### Files Modified During Review

[If you modified files, list them here - ask Dev to update File List]

### Gate Status

Gate: {STATUS} → qa.qaLocation/gates/{epic}.{story}-{slug}.yml
Risk profile: qa.qaLocation/assessments/{epic}.{story}-risk-{YYYYMMDD}.md
NFR assessment: qa.qaLocation/assessments/{epic}.{story}-nfr-{YYYYMMDD}.md

# Note: Paths should reference core-config.yaml for custom configurations

### Recommended Status

[✓ Ready for Done] / [✗ Changes Required - See unchecked items above]
(Story owner decides final status)
```

## Output 2: Create Quality Gate File

**Template and Directory:**

- Render from `../templates/qa-gate-tmpl.yaml`
- Create directory defined in `qa.qaLocation/gates` (see `bmad-core/core-config.yaml`) if missing
- Save to: `qa.qaLocation/gates/{epic}.{story}-{slug}.yml`

Gate file structure:

```yaml
schema: 1
story: '{epic}.{story}'
story_title: '{story title}'
gate: PASS|CONCERNS|FAIL|WAIVED
status_reason: '1-2 sentence explanation of gate decision'
reviewer: 'Quinn (Test Architect)'
updated: '{ISO-8601 timestamp}'

top_issues: [] # Empty if no issues
waiver: { active: false } # Set active: true only if WAIVED

# Extended fields (optional but recommended):
quality_score: 0-100 # 100 - (20*FAILs) - (10*CONCERNS) or use technical-preferences.md weights
expires: '{ISO-8601 timestamp}' # Typically 2 weeks from review

evidence:
  tests_reviewed: { count }
  risks_identified: { count }
  trace:
    ac_covered: [1, 2, 3] # AC numbers with test coverage
    ac_gaps: [4] # AC numbers lacking coverage
  playwright_testing:
    ui_changes_detected: true|false
    html_report_path: 'path/to/playwright-report/index.html'
    artifacts_path: 'path/to/test-results'
    browsers_tested: ['chromium', 'firefox', 'webkit']
    test_results:
      total_tests: { count }
      passed: { count }
      failed: { count }
      critical_failures: [{ test: 'test name', reason: 'failure reason' }]

nfr_validation:
  security:
    status: PASS|CONCERNS|FAIL
    notes: 'Specific findings'
  performance:
    status: PASS|CONCERNS|FAIL
    notes: 'Specific findings'
  reliability:
    status: PASS|CONCERNS|FAIL
    notes: 'Specific findings'
  maintainability:
    status: PASS|CONCERNS|FAIL
    notes: 'Specific findings'

recommendations:
  immediate: # Must fix before production
    - action: 'Add rate limiting'
      refs: ['api/auth/login.ts']
  future: # Can be addressed later
    - action: 'Consider caching'
      refs: ['services/data.ts']
```

### Gate Decision Criteria

**Deterministic rule (apply in order):**

If risk_summary exists, apply its thresholds first (≥9 → FAIL, ≥6 → CONCERNS), then NFR statuses, then top_issues severity.

1. **Risk thresholds (if risk_summary present):**
   - If any risk score ≥ 9 → Gate = FAIL (unless waived)
   - Else if any score ≥ 6 → Gate = CONCERNS

2. **Test coverage gaps (if trace available):**
   - If any P0 test from test-design is missing → Gate = CONCERNS
   - If security/data-loss P0 test missing → Gate = FAIL

3. **Playwright UI test results (if UI changes detected):**
   - If any critical UI regression or cross-browser failure → Gate = FAIL
   - If minor UI issues or test gaps identified → Gate = CONCERNS

4. **Issue severity:**
   - If any `top_issues.severity == high` → Gate = FAIL (unless waived)
   - Else if any `severity == medium` → Gate = CONCERNS

5. **NFR statuses:**
   - If any NFR status is FAIL → Gate = FAIL
   - Else if any NFR status is CONCERNS → Gate = CONCERNS
   - Else → Gate = PASS

- WAIVED only when waiver.active: true with reason/approver

Detailed criteria:

- **PASS**: All critical requirements met, no blocking issues
- **CONCERNS**: Non-critical issues found, team should review
- **FAIL**: Critical issues that should be addressed
- **WAIVED**: Issues acknowledged but explicitly waived by team

### Quality Score Calculation

```text
quality_score = 100 - (20 × number of FAILs) - (10 × number of CONCERNS)
Bounded between 0 and 100
```

If `technical-preferences.md` defines custom weights, use those instead.

### Suggested Owner Convention

For each issue in `top_issues`, include a `suggested_owner`:

- `dev`: Code changes needed
- `sm`: Requirements clarification needed
- `po`: Business decision needed

## Key Principles

- You are a Test Architect providing comprehensive quality assessment
- You have the authority to improve code directly when appropriate
- Always explain your changes for learning purposes
- Balance between perfection and pragmatism
- Focus on risk-based prioritization
- Provide actionable recommendations with clear ownership

## Blocking Conditions

Stop the review and request clarification if:

- Story file is incomplete or missing critical sections
- File List is empty or clearly incomplete
- No tests exist when they were required
- Code changes don't align with story requirements
- Critical architectural issues that require discussion

## Completion

After review:

1. Update the QA Results section in the story file
2. Create the gate file in directory from `qa.qaLocation/gates`
3. Recommend status: "Ready for Done" or "Changes Required" (owner decides)
4. If files were modified, list them in QA Results and ask Dev to update File List
5. Always provide constructive feedback and actionable recommendations
