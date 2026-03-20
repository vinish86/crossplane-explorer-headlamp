# Security

## Vulnerability Status

This plugin is built with [@kinvolk/headlamp-plugin](https://www.npmjs.com/package/@kinvolk/headlamp-plugin). We regularly run `npm audit` and apply fixes.

### Fixed

The following vulnerabilities have been addressed via `npm audit fix`:

- **ajv** – ReDoS (moderate)
- **bn.js** – Infinite loop (moderate)
- **flatted** – Unbounded recursion DoS, prototype pollution (high)
- **minimatch** – ReDoS (high)
- **qs** – Array limit bypass (low)
- **rollup** – Path traversal (high)
- **serialize-javascript** – RCE (high)
- **storybook** – WebSocket hijacking (high)
- **tar** – Path traversal (high)
- **undici** – Multiple issues (high)
- **webpack** – SSRF (high)

### Known Remaining (Low Severity)

**7 low-severity vulnerabilities** remain, all in the `elliptic` transitive dependency chain:

- **elliptic** – Uses a cryptographic primitive with a risky implementation ([GHSA-848j-6mx2-7j84](https://github.com/advisories/GHSA-848j-6mx2-7j84))
- **Dependency path:** `@kinvolk/headlamp-plugin` → `vite-plugin-node-polyfills` → `node-stdlib-browser` → `crypto-browserify` → `elliptic`

These affect **build-time tooling only** (Node.js polyfills for the Vite bundler). They do not ship in the plugin runtime bundle and do not affect the security of the plugin when running inside Headlamp.

A fix would require updating the headlamp-plugin dependency. The only available fix (`npm audit fix --force`) would downgrade to headlamp-plugin 0.10.0, which is a breaking change. We will revisit when headlamp-plugin provides an updated dependency chain.

## Reporting Vulnerabilities

If you discover a security issue, please report it responsibly by opening an issue in this repository.
