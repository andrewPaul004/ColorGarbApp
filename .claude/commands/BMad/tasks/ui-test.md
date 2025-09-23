# /ui-test Task

When this command is used, execute the following task:

<!-- Powered by BMAD™ Core -->

# ui-test

Execute focused Playwright testing for UI changes in a story. This task invokes the playwright-test-maintainer agent to run cross-browser tests and provide comprehensive test execution results.

## Inputs

```yaml
required:
  - story_id: '{epic}.{story}' # e.g., "1.3"
  - story_path: '{devStoryLocation}/{epic}.{story}.*.md' # Path from core-config.yaml
  - story_title: '{title}' # If missing, derive from story file H1
```

## Prerequisites

- Story file exists and contains File List with UI-related changes
- Playwright is properly configured in the project
- UI changes have been implemented and are ready for testing

## UI Testing Process

### 1. Analyze Story for UI Changes

**Detect UI changes by analyzing:**
- File patterns: `*.tsx`, `*.jsx`, `*.vue`, `*.css`, `*.scss`, `*.less` files in File List
- Component changes: React/Vue/Angular component modifications
- Style changes: CSS, styling library, or theme modifications
- Acceptance criteria mentioning: UI, interface, visual, responsive, browser, user interaction

### 2. Invoke Playwright Test Maintainer Agent

**Execute playwright-test-maintainer with comprehensive instructions:**

```typescript
// Agent invocation with detailed requirements
const playwrightResults = await Task.invoke('playwright-test-maintainer', {
  description: 'Comprehensive UI testing for story',
  prompt: `
    Story: ${story_id} - ${story_title}

    UI Changes Analysis:
    - Modified Files: ${uiChangedFiles}
    - Affected Components: ${affectedComponents}
    - Acceptance Criteria: ${uiAcceptanceCriteria}

    Required Actions:
    1. **Diff Analysis**: Review code changes to understand UI workflow impact
    2. **Test Plan Update**: Update existing Playwright test coverage based on changes
    3. **Test Execution**: Run comprehensive test suite including:
       - Cross-browser testing (Chromium, Firefox, WebKit)
       - Responsive design validation
       - User workflow regression testing
       - Accessibility checks where applicable
    4. **Artifact Generation**:
       - Generate HTML report with detailed results
       - Capture videos for failed tests
       - Screenshots for visual validation
       - Network logs for debugging
    5. **Results Summary**: Provide comprehensive summary including:
       - HTML report path and artifacts locations
       - Pass/fail counts by browser
       - Critical UI regressions or failures
       - Cross-browser compatibility issues
       - Performance degradation observations
       - Specific action items for any failures
       - Recommendations for additional test coverage gaps

    Focus Areas:
    - User workflows impacted by the changes: ${workflowsAffected}
    - New functionality requiring test coverage
    - Regression testing for existing features
    - Cross-browser compatibility validation

    Return format should include:
    - Execution summary with pass/fail metrics
    - HTML report and artifacts paths
    - Critical findings requiring immediate attention
    - Detailed action items with priorities
    - Test coverage recommendations
  `,
  subagent_type: 'playwright-test-maintainer'
});
```

### 3. Process and Validate Results

**Validate playwright-test-maintainer output:**
- Confirm HTML report was generated successfully
- Verify artifacts are accessible and complete
- Check that all required browsers were tested
- Validate that critical failures are properly documented

## Output: UI Testing Summary

**Create comprehensive summary for story stakeholders:**

```markdown
# UI Testing Results for Story ${story_id}

## Test Execution Summary

**Browsers Tested:** Chromium, Firefox, WebKit
**Test Execution Date:** [Date/Time]
**HTML Report:** [path to playwright-report/index.html]
**Test Artifacts:** [path to test-results directory]

## Results Overview

| Browser | Total Tests | Passed | Failed | Duration |
|---------|-------------|--------|--------|----------|
| Chromium | X | X | X | Xs |
| Firefox | X | X | X | Xs |
| WebKit | X | X | X | Xs |

## Critical Findings

### ❌ Test Failures (Priority: High)
- [Test Name]: [Failure reason and browser(s) affected]
- [Test Name]: [Failure reason and browser(s) affected]

### ⚠️ Cross-Browser Issues (Priority: Medium)
- [Issue description]: [Browsers affected and visual differences]

### 📈 Performance Observations
- [Any significant performance degradations noted]

### ✅ Successful Validations
- [Key workflows that passed testing]
- [New functionality properly validated]

## Action Items

### Immediate (Blocking)
- [ ] Fix [specific test failure] - affects [browsers]
- [ ] Resolve [critical UI regression] - impacts [user workflow]

### Near-term (Recommended)
- [ ] Address [cross-browser inconsistency] in [component]
- [ ] Optimize [performance issue] in [workflow]

### Future Enhancements
- [ ] Add test coverage for [identified gap]
- [ ] Consider [accessibility improvement]

## Test Coverage Assessment

**Areas Well Covered:**
- [List of workflows/features with solid test coverage]

**Coverage Gaps Identified:**
- [Areas needing additional test coverage]
- [Edge cases not currently tested]

## Recommendations

1. **Test Automation**: [Suggestions for improving test reliability]
2. **Performance**: [Recommendations for UI performance improvements]
3. **Accessibility**: [Suggestions for accessibility testing expansion]
4. **Coverage**: [Areas where additional tests would be valuable]

## Files and Artifacts

**Generated Artifacts:**
- HTML Report: `[full path to HTML report]`
- Test Videos: `[path to video recordings]`
- Screenshots: `[path to screenshot captures]`
- Network Logs: `[path to network debugging logs]`

**Story Files Analyzed:**
[List of UI files that were considered in testing scope]
```

## Integration Notes

This task is designed to:
- Work standalone for focused UI testing needs
- Integrate seamlessly with the main `review-story` task
- Provide artifacts that can be referenced in QA gate decisions
- Generate evidence for quality gate documentation

## Error Handling

**If playwright-test-maintainer fails:**
- Document the failure reason
- Provide alternative manual testing recommendations
- Still generate a summary with available information
- Flag the issue for developer attention

**If no UI changes detected:**
- Document that no UI changes were found
- Recommend standard regression testing if needed
- Provide guidance on when UI testing would be beneficial

## Completion Criteria

Task is complete when:
1. Playwright tests have been executed across all browsers
2. HTML report and artifacts are successfully generated
3. Comprehensive summary is created with actionable results
4. All critical findings are clearly documented
5. Action items are prioritized and assigned appropriate urgency levels