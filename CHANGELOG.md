# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

### Added
- `Extract Full Thread` setting. When on, `Extract Tweet` extracts the complete thread a tweet belongs to: the first tweet replaces the block and the rest of the thread is added as child blocks. Off by default.
- `Include Replied-to Tweets` setting. When on, extracting a reply also extracts the tweets it is replying to. Off by default.
- `Auto Thread Extract Tag` setting, so blocks with that tag are extracted as complete threads by Auto Extract.

## [2.2.0] - 2026-07-10

### Fixed
- Image extraction, which had silently stopped working for everyone because the previous backend (TweetPik) stopped returning image data. Images are now fetched via the FxTwitter API and restored to working order.
- The loading spinner now always clears, even when extraction fails or the block doesn't contain a tweet URL, instead of getting stuck spinning.

### Changed
- Tweet data (including images) is now fetched through Roam's built-in CORS proxy rather than a separate hosted proxy service.
- x.com URLs continue to be supported alongside twitter.com.
