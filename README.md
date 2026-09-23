# Mir Sahin Ali | Portfolio

A personal portfolio showcasing projects, technical skills, experience, education, and certifications. Includes a protected content editor for managing the website and uploading an updated résumé.

**Live website:** [mir-sahin-ali-portfolio.vercel.app](https://mir-sahin-ali-portfolio.vercel.app/)

## Features

- Responsive Home, Projects, and Gallery pages
- Animated project cards with technology stacks, source links, and live demos
- Project editor for adding and updating portfolio projects
- Content editor for profile details, experience, education, skills, and certifications
- Editable social links and coding profiles
- PDF résumé uploads with a consistent `/resume` URL
- Gallery photo uploads and captions
- Persistent content stored in PostgreSQL
- Image and document storage using Vercel Blob

Content saved through the editor appears on the website without a new deployment.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Vercel Functions |
| Database | Neon PostgreSQL |
| File storage | Vercel Blob |
| Authentication | Password hashing with scrypt and signed session cookies |
| Testing | Node.js test runner |
| Hosting | Vercel |

## Project Structure

| Directory | Purpose |
|---|---|
| `api/` | Vercel function entry point |
| `lib/` | Authentication, storage, and content utilities |
| `src/` | Page templates, request handling, and initial content |
| `public/` | Stylesheets, browser scripts, images, and other assets |
| `scripts/` | Build, database setup, and authentication setup |
| `tests/` | Authentication and content-management tests |

## Setup

### Prerequisites

- Node.js 22 or later
- npm
- A Vercel account
- A Neon PostgreSQL database
- A public Vercel Blob store

### Install

```bash
git clone https://github.com/MIRSAHINALI/mir-sahin-portfolio.git
cd mir-sahin-portfolio
npm ci
```

### Configure Vercel

Sign in and link the project:

```bash
npx vercel login
npx vercel link
```

Connect Neon and Vercel Blob to the linked project's Production environment.

Required environment variables:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `BLOB_READ_WRITE_TOKEN` | Server-side access to Blob storage |
| `EDITOR_EMAIL` | Authorized editor email |
| `ADMIN_PASSWORD_HASH` | Hashed editor password |
| `SESSION_SECRET` | Session-signing secret |

Configure editor authentication:

```bash
npm run auth:setup
```

The setup script uses the editor email configured in `scripts/setup-auth.mjs`, generates a password, and saves the authentication variables in Vercel. Store the generated password securely.

For database initialization, create a local `.env.local` file containing a valid `DATABASE_URL`. Use `.env.example` as a reference. Never commit real credentials.

### Initialize and Build

Run each command separately:

```bash
npm run db:setup
npm run build
npm test
```

Database setup creates missing tables and preserves existing project records.

### Deploy

```bash
npx vercel --prod
```

After deployment, check the public pages, editor sign-in, content saving, and file uploads.

## Content Management

| Route | Purpose |
|---|---|
| `/admin/` | Manage projects |
| `/admin/content/` | Manage Home content, résumé, and gallery |
| `/resume` | Open the current résumé |

Sign in, select a section, make changes, and save.

Supported uploads:

- Images: PNG, JPEG, WebP, and GIF, up to 3 MB
- Résumé: PDF, up to 3 MB
- Gallery background video: HTTPS MP4 or WebM URL

After uploading a file, save the content changes to publish its link. Uploaded files are public website assets.

Editor content is stored in Neon, and uploaded files are stored in Blob. These changes are separate from the source files in this repository.

## Authentication

- Passwords are hashed with salted scrypt.
- Sessions use signed, HttpOnly, Secure cookies.
- Write requests require authentication and origin checks.
- Login attempts are limited to 10 per 15 minutes per client network. Successful sign-in resets that client’s counter.
- On Vercel, the limiter uses the trusted client IP; IPv6 addresses are grouped by /64. Addresses are stored as keyed hashes. Clients sharing a public IP share a limit.
- This limits individual sources; it does not stop a distributed attack. Other hosting platforms require a trusted client-IP integration.
- Version checks prevent stale edits from overwriting newer changes.

To reset the editor password:

```bash
npm run auth:setup
npx vercel --prod
```

The new authentication configuration invalidates previous editor sessions once deployed.

## Testing

```bash
npm test
```

Tests cover authentication, session validation, content persistence, HTML escaping, conflicting edits, image and PDF validation, résumé redirects, and storage failures.

Database tests use a local SQLite adapter. Deployed PostgreSQL and Blob integrations should also be checked after configuration changes.

## Development Notes

- Code and layout changes require a build and deployment.
- Content changes saved through the editor do not require deployment.
- Initial project seed data does not overwrite existing database records.
- Keep environment files and access tokens out of version control.

## Contact

**Mir Sahin Ali**

[mir1sahin123@gmail.com](mailto:mir1sahin123@gmail.com)