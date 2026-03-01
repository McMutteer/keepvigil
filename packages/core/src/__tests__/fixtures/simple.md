## Summary

Added user authentication with JWT tokens.

## Changes

- Added login endpoint
- Added middleware for token validation
- Updated user schema

## Test Plan

- [ ] Run `npm run build` and verify no errors
- [x] Login with valid credentials returns 200
- [ ] Login with invalid password returns 401
- [ ] Protected route without token returns 403
- [x] Token expires after 24 hours

## Notes

This is behind the `auth` feature flag.
