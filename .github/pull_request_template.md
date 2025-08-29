# Pull Request

## Description
Brief description of what this PR accomplishes and why it's needed.

## Type of Change
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📚 Documentation update
- [ ] 🎨 Code style update (formatting, renaming)
- [ ] ♻️ Refactoring (no functional changes)

## Changes Made
- List specific changes made in this PR
- Be concise but comprehensive
- Include any architectural decisions

## UI Integration Verification (Required for Frontend Components)
**📱 UI Integration Checklist**
- [ ] Component is imported and integrated into target page/layout
- [ ] Component is accessible via intended user navigation route
- [ ] Manual browser test performed - component renders correctly
- [ ] No broken imports or missing dependencies
- [ ] Component follows Material-UI design patterns
- [ ] Integration tests added/updated to verify component accessibility
- [ ] QA can access feature through documented navigation path

**Navigation Path**: (e.g., Dashboard → Profile → Notification Preferences)

## Testing
- [ ] Unit tests added/updated and passing
- [ ] Integration tests added/updated and passing
- [ ] Manual testing performed
- [ ] Screenshots provided (for UI changes)

**Test Commands Run:**
```bash
# List commands used for testing
npm run test
npm run lint
```

## Screenshots (For UI Changes)
<!-- Please include screenshots showing the feature in context -->
**Before:**
<!-- Screenshot of UI before changes -->

**After:**  
<!-- Screenshot of UI after changes -->

**Mobile View:** (if applicable)
<!-- Screenshot of mobile responsive design -->

## Definition of Done Verification
I confirm that this PR meets the following criteria:

**Code Quality:**
- [ ] Code follows project coding standards
- [ ] No new lint errors or warnings
- [ ] JSDoc documentation added for public APIs
- [ ] No console errors in browser (for frontend changes)

**Functionality:**
- [ ] All acceptance criteria met
- [ ] Feature works as expected in manual testing
- [ ] Error cases handled gracefully
- [ ] Performance considerations addressed

**Integration:**
- [ ] Feature accessible through normal user navigation
- [ ] No breaking changes to existing functionality
- [ ] Database migrations included (if applicable)
- [ ] API documentation updated (if applicable)

## Dependencies
- [ ] No new dependencies added
- [ ] OR: New dependencies pre-approved and documented
- [ ] All dependencies security checked

## Deployment Notes
<!-- Any special deployment instructions or considerations -->

## Related Issues
Closes #[issue number]
Relates to #[issue number]

---

## Review Checklist (For Reviewers)

**Code Review:**
- [ ] Code is well-structured and follows patterns
- [ ] Logic is clear and well-commented
- [ ] Security considerations addressed
- [ ] Performance implications considered

**UI Integration Review:**
- [ ] Navigation path verified manually
- [ ] Component renders correctly in target location
- [ ] Responsive design verified
- [ ] Accessibility considerations met

**Testing Review:**
- [ ] Adequate test coverage
- [ ] Tests are meaningful and not just for coverage
- [ ] Manual testing scenarios reasonable

## Post-Merge Actions
- [ ] Update documentation (if needed)
- [ ] Notify QA team of changes and navigation paths
- [ ] Update related tickets/issues
- [ ] Monitor for any deployment issues