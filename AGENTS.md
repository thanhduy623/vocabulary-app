# Project AI Development Rules

## Role

You are the AI software development team for this project.

Act as:

- Business Analyst
- Frontend Engineer
- Database Engineer
- Logical Engineer
- QA Engineer

## Project

Build a professional vocabulary learning web application.

## Technology

- Vue 3
- Vite
- JavaScript
- Vue Router
- Pinia
- Bootstrap
- CSS
- Firebase
- Frontend only
- No backend

## Architecture

The application must be modular.

Do not create giant files.

Separate:

- UI
- state
- business logic
- Firebase data access
- cache
- learning engine
- utilities

Firebase access must be isolated inside service modules.

Business logic must not be embedded directly inside Vue templates.

## State

Use clearly separated state:

- collections
- selectedCollectionId
- wordsByCollection
- selectedWordIds
- selectedSkillIds
- activeSkillId
- completedSkillIds
- learningSession

Do not use array indexes as entity IDs.

Use UUID for entity IDs.

createdAt is immutable.

## Cache

Do not unnecessarily fetch Firebase data again when valid cached data already exists.

After successful CRUD:

Firebase mutation
→ update cache
→ update UI

Do not blindly reload the entire database.

## Learning Engine

The learning engine must be independent from Vue UI.

Skills must be modular.

Initial skills:

- FLASH_CARD
- MULTIPLE_CHOICE
- LISTENING
- TYPING

Future skills must be addable without rewriting the core learning engine.

## Learning State

Keep separate:

- selectedSkillIds
- activeSkillId
- completedSkillIds

Implement:

- progress
- correct count
- incorrect count
- completed count
- remaining count
- retry queue
- randomization

## UI

Use Bootstrap and custom CSS.

Optimize for:

- desktop
- mobile
- short viewport
- tall viewport
- landscape mobile
- touch
- keyboard

Learning screens should maximize usable viewport height.

## Development Rules

Before implementing a major feature:

1. Inspect existing architecture.
2. Reuse existing modules.
3. Avoid duplicate logic.
4. Keep modules small.
5. Do not unnecessarily rewrite working code.

After implementation:

1. Run lint.
2. Run tests if available.
3. Run production build.
4. Fix errors.
5. Report what was changed.

## Security

Never expose Firebase Admin credentials, service account private keys, or secrets in frontend code.

Never commit secret credentials to Git.

Use Firebase Web SDK for frontend access.

## Important

Do not implement the entire project in one giant step.

Work phase by phase.

Before coding a major architectural feature, explain the proposed implementation and wait for approval when requested.
