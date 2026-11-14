# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Changed
- Thread extraction is now its own command, `Extract Tweet Thread`, in the right click menu and the command palette, and replaces the `Extract Full Thread` setting from 2.3.0. With the setting, extracting just one tweet of a thread meant turning it off first; now either can be picked each time. `Extract Tweet` always extracts just the linked tweet, so if you had `Extract Full Thread` on, use `Extract Tweet Thread` for threads. The new command has no default hotkey; you can set one in Roam's hotkey settings.

### Added
- `Auto Thread Extract Tag` setting (`thread-extract` by default). With Auto Extract on, blocks with this tag are extracted as the whole thread, and blocks with the `Auto Tweet Extract Tag` as a single tweet.

### Fixed
- Long tweets (more than 280 characters) are extracted in full instead of being cut off. A single tweet now comes from the FxTwitter API, the same as a thread, and `t.co` links in it are expanded. oEmbed, which cuts long tweets off, is only used when FxTwitter fails.
- Tweet text is put into the template as is: `$$` no longer turns into `$`, and text such as `{DATE}` inside a tweet is no longer replaced.
- An image that fails to upload no longer stops the tweet from being extracted.
- A block with another link after the tweet link is extracted instead of failing.

## [2.3.0] - 2026-11-13

### Added
- `Extract Full Thread` setting. When on, `Extract Tweet` extracts the complete thread a tweet belongs to: the first tweet replaces the block and the rest of the thread is added as child blocks. Off by default.

## [2.2.0] - 2026-07-10

### Fixed
- Image extraction, which had silently stopped working for everyone because the previous backend (TweetPik) stopped returning image data. Images are now fetched via the FxTwitter API and restored to working order.
- The loading spinner now always clears, even when extraction fails or the block doesn't contain a tweet URL, instead of getting stuck spinning.

### Changed
- Tweet data (including images) is now fetched through Roam's built-in CORS proxy rather than a separate hosted proxy service.
- x.com URLs continue to be supported alongside twitter.com.
