# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2020-11-04

### Breaking change

__Upgrade Hugo to version 0.78.0 (November 3rd, 2020).__

(Previously bundled version was 0.64.1 from February 9th, 2020.)

There are breaking changes between these Hugo versions, so please read through the [Hugo release notes](https://github.com/gohugoio/hugo/releases).

We ran into the following two issues while upgrading our own sites:

  - In the `[outputs]` section of your _config.toml_ file, change `taxonomy` parameter to `tags` or `categories`. (See [this issue](https://source.small-tech.org/site.js/starters/starter-theme/-/issues/109).)

  - Change usage of parentheses in `if or` statements. (See [this commit](https://source.small-tech.org/site.js/starters/starter-theme/-/commit/2f116aa7f7f3cc4e8db028ad2d47b2ff1c4200f2).)

## [1.5.0] - 2020-07-09

### Added

  - arm64 support.

## [1.4.1] - 2020-06-28

### Added

  - Option to disable build drafts for Hugo server; new fourth parameter in serve() method.

## [1.4.0] - 2020-05-05

### Added

  - `version` property that returns the Hugo version ([#3](https://source.small-tech.org/site.js/lib/node-hugo/-/issues/3)).

### Fixed

  - Incorrect require statements in code samples in readme ([#2](https://source.small-tech.org/site.js/lib/node-hugo/-/issues/2)).

## [1.3.0] - 2020-02-13

### Added

  - Generic hugo.serverWithArgs() method to run a Hugo server with any arbitrary argument string.

## [1.2.0] - 2020-02-12

### Added

  - Generic hugo.command() method to run any Hugo command by passing a regular Hugo command-line argument string.

## [1.1.1] - 2020-02-11

### Fixes

  - Fix regression due to version number change
  - Update tests

## [1.1.0] - 2020-02-11

### Changes

  - Upgrade Hugo to [version 0.64.1](https://github.com/gohugoio/hugo/releases/tag/v0.64.1).

## [1.0.1] - 2020-02-10

### Fixes

  - Disables fast render so Hugo updates are more consistent.

## [1.0.0] - 2020-02-07

Initial release.
