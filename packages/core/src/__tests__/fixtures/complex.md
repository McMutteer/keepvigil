## Summary

Full checkout flow with Stripe integration.

## Test Plan

- [ ] Run `npm run build` to verify compilation
- [ ] Run `npm test` to verify existing tests pass
- [ ] POST /api/checkout creates a Stripe session
  and returns a 201 with session URL
- [x] Manual: Verify the loading spinner animation is smooth
- [ ] Navigate to https://localhost:3000/checkout and verify
  the form renders correctly on desktop
- [ ] `curl -X POST http://localhost:3000/api/health` returns 200
- [ ] Verify the OG meta tags at https://example.com/product/123
  * [ ] Title tag contains product name
  * [ ] Image URL is valid and loads
- [ ] Manual: Check that the email confirmation looks correct

## Deployment Notes

Deploy to staging first.
