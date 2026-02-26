# Dialogram Help

This guide is designed for end users and integration clients.

## Access

- Public help page: `/help`
- Sign in: `/sign-in`
- Sign up: `/sign-up`
- API docs UI: `/api-docs`
- OpenAPI JSON: `/api/openapi.json`
- In-app integration quick start (authenticated): `/integrations`

## Screenshots

The help module uses Playwright-captured screenshots stored in:

- `public/help/sign-in.png`
- `public/help/sign-up.png`
- `public/help/api-docs.png`
- `public/help/openapi-json.png`

## Refresh Screenshots

Run these from the repository root:

```bash
npx playwright screenshot http://localhost:3000/sign-in public/help/sign-in.png
npx playwright screenshot http://localhost:3000/sign-up public/help/sign-up.png
npx playwright screenshot http://localhost:3000/api-docs public/help/api-docs.png
npx playwright screenshot http://localhost:3000/api/openapi.json public/help/openapi-json.png
```

## Notes

- Ensure the app is running locally before capturing screenshots.
- Keep screenshot names stable so `/help` does not break.

