# Crossplane Explorer

A [Headlamp](https://headlamp.dev) plugin for exploring and managing [Crossplane](https://www.crossplane.io) resources. Compatible with Crossplane v1 and v2.

![Crossplane Explorer](img/crossplane-explorer.png)

## Features

### Dashboard

An overview of your Crossplane installation with health metrics:

- Composite Resources (XRs) and Managed Resources (MRs) by status
- Claims aggregated by kind and configuration
- Managed resources grouped by configuration
- Quick links to drill down into resources

### Packages

Browse and manage Crossplane packages:

| Resource | Description |
|----------|-------------|
| **Providers** | Installed Crossplane providers and their versions |
| **Configurations** | Crossplane configuration packages |
| **Functions** | Crossplane Composition Functions |

### API Extensions

View and manage Crossplane API extensions:

| Resource | Description |
|----------|-------------|
| **XRDs** | Composite Resource Definitions with detail views |
| **Compositions** | Composition templates and their references |
| **Claims** | Composite resource claims (namespace-scoped) |
| **EnvironmentConfigs** | Environment configuration for compositions |
| **ProviderConfigs** | Provider configuration resources |
| **Runtime Configs** | Deployment and runtime configuration |
| **Managed Resources** | Provider-managed infrastructure resources |

### Trace

Visualize the composition flow from claims to managed resources. Trace helps you understand:

- Claim → Composite Resource → Managed Resources lineage
- Health status at each layer
- Configuration and composition references

## Prerequisites

- [Headlamp](https://headlamp.dev) (in-cluster, desktop app, or web)
- Crossplane installed on your Kubernetes cluster (v1 or v2)

If Crossplane is not installed, the plugin shows a friendly banner and you can still browse the UI.

## Installation

### From Artifact Hub (Plugin Catalog)

1. Open Headlamp and go to **Settings** → **Plugins** (Plugin Catalog).
2. Ensure "Only official plugins" is turned off if this plugin is not yet official.
3. Search for **Crossplane Explorer** and click **Install**.

### Manual Installation

1. Download the plugin tarball from [Releases](https://github.com/vinish86/crossplane-explorer-headlamp/releases).
2. Place it in Headlamp’s plugins directory or configure Headlamp to load it.

## Compatibility

| Component | Version |
|-----------|---------|
| Headlamp | ≥ 0.29 |
| Crossplane | v1, v2 |
| Distros | in-cluster, web, docker-desktop, desktop |

## Development

### Setup

```bash
npm install
```

### Run Development Server

```bash
npm start
```

Runs the plugin with hot reload against Headlamp.

### Build

```bash
npm run build
```

### Package for Release

```bash
npm run build
npm run package
```

Creates a tarball and prints the SHA256 checksum for `artifacthub-pkg.yml`.

### Other Commands

| Command | Description |
|---------|-------------|
| `npm run format` | Format code with Prettier |
| `npm run lint` | Run ESLint |
| `npm run lint-fix` | Auto-fix lint issues |
| `npm run tsc` | Type check with TypeScript |
| `npm run test` | Run tests with Vitest |
| `npm run storybook` | Start Storybook for components |

## Project Structure

```
src/
├── index.tsx              # Routes and sidebar registration
├── crossplane.ts          # Crossplane API helpers
├── components/
│   ├── dashboard/         # Dashboard overview
│   ├── trace/             # Composition trace view
│   ├── providers/         # Provider list
│   ├── configurations/    # Configuration list
│   ├── functions/         # Function list
│   ├── xrds/              # XRD list and detail
│   ├── compositions/      # Composition list
│   ├── claims/            # Claim list
│   ├── managed/           # Managed resource list
│   ├── providerconfigs/   # ProviderConfig list
│   ├── environmentconfigs/
│   ├── deploymentruntimeconfigs/
│   └── common/            # Shared components
└── resources/             # Type definitions and API helpers
```

## Links

- [Headlamp Plugin Development](https://headlamp.dev/docs/latest/development/plugins/)
- [Headlamp API Reference](https://headlamp.dev/docs/latest/development/api/)
- [Crossplane Documentation](https://docs.crossplane.io/)

## License

Check the repository for license information.
