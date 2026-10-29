# AI and third-party disclosure

| Service | Used for | Data sent | Default |
|---|---|---|---|
| Anthropic Claude API | Optional rewrites of non-critical text | Draft text and approved facts only | Off (needs API key and Admin opt-in) |
| Meta Instagram API | Optional sign-in, reel insights, publishing | OAuth token; the post you choose to publish | Off (needs Meta app credentials) |
| Google Fonts | Typefaces in the browser | Normal browser requests | On |
| Chart.js (bundled) | Charts | None | On |

Libraries: FastAPI, SQLAlchemy, Pillow, pypdf, python-docx, httpx, Next.js, React, Chart.js. The island dashboard design comes from the team's own frontend (see `reference/`). No customer content is used to train any model by this project. Live status is shown in the app under Privacy and AI use.
