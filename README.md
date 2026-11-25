# SŌRYUKEN KARATE CLUB — Cloudflare Pages

## Cloudflare Pages build settings

- Framework preset: Vite
- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`
- Root directory: `/` (repository root)
- Node.js: 22 (also recorded in `.nvmrc`)

This is a Vite + React single-page app. `public/_redirects` provides the SPA fallback needed for client-side routes on Cloudflare Pages.

## Firebase requirements before using the deployed site

The app uses Firebase Authentication and Cloud Firestore directly from the browser. The inspected source contains no Gemini API calls or server-side API routes.

1. In Firebase Console, open Authentication → Settings → Authorized domains.
2. Add the exact Cloudflare Pages hostname after the first deployment (for example, `your-project.pages.dev`).
3. If you later connect a custom domain, add that hostname too.
4. Confirm the Google sign-in provider is enabled.
5. Review Firestore Rules and test the deployed app with the intended administrator account before entering real student records.

The Firebase client configuration in `firebase-applet-config.json` is used by the browser SDK. Do not add private service-account keys or other server secrets to this file or to frontend environment variables.

## Deploy

Connect the project repository in Cloudflare Dashboard → Workers & Pages → Create → Pages → Connect to Git, then use the build settings above. Alternatively, build locally with Node.js 22 using `npm install` and `npm run build`, then deploy the generated `dist` directory.

Keep the existing deployment available until login, admissions, student records, attendance, fees, reports, and public admission flows have all been tested on the Pages URL.
