## Project context

- Format and navigation depend on the selected documentation repository.
- When working on `guildaidev/docs`, use MDX files with YAML frontmatter and `docs.json` for navigation, theme, and settings.
- Use existing docs patterns before introducing new structure.
- Only update English language content unless explicitly asked otherwise.

## Content strategy

- Document just enough for users to succeed.
- Prioritize accuracy and usability.
- Make content evergreen when possible.
- Search for existing information before adding new content.
- Avoid duplication unless strategically justified.
- Start with the smallest reasonable change.

## Frontmatter requirements

When the docs framework uses frontmatter, include:

- `title`: clear, descriptive page title.
- `description`: concise summary for SEO and navigation.
- `keywords`: relevant keywords for search and SEO when the repo uses keywords.

## Audience

Assume mixed technical depth. Support both local CLI users and web-editor users.

## Writing standards

- Use second-person voice.
- Add prerequisites at the start of procedural content.
- Match style and formatting of existing pages.
- Use language tags on code blocks.
- Add descriptive alt text for images and media.
- Use sentence case for headings.
- Use active voice and direct language.
- Remove unnecessary words while maintaining clarity.
- Break complex instructions into clear numbered steps.
- Use kebab-case for file naming.
- Do not use emoji.

## Language and tone

- Avoid promotional language.
- Avoid phrases like `rich heritage`, `breathtaking`, `captivates`, `stands as a testament`, and `plays a vital role`.
- Limit `moreover`, `furthermore`, `additionally`, and similar transitions.
- Avoid editorializing like `it is important to note`, `this article will`, and `in conclusion`.
- Avoid undue emphasis on routine technical concepts.

## Technical accuracy

- Verify links when possible.
- Use precise references.
- Keep terminology consistent.
- Ensure code examples and API references match the source PR.

## Formatting discipline

- Use bold, italics, and emphasis only when they improve understanding.
- Keep markup minimal and functional.
- Prefer practical examples over multiple abstract options.
