import { registerRoute, registerSidebarEntry } from '@kinvolk/headlamp-plugin/lib';
import { ClaimsList } from './components/claims/List';
import { CompositionList } from './components/compositions/List';
import { ConfigurationList } from './components/configurations/List';
import { DashboardView } from './components/dashboard/View';
import { DeploymentRuntimeConfigList } from './components/deploymentruntimeconfigs/List';
import { EnvironmentConfigList } from './components/environmentconfigs/List';
import { FunctionList } from './components/functions/List';
import { ManagedResourceList } from './components/managed/List';
import { ProviderConfigList } from './components/providerconfigs/List';
import { ProviderList } from './components/providers/List';
import { TraceView } from './components/trace/View';
import { XRDDetail } from './components/xrds/Detail';
import { XRDList } from './components/xrds/List';
import { crossplaneSidebarEntryBase } from './crossplaneSidebarIcon';

// ── Sidebar entries ──────────────────────────────────────────────────────────

registerSidebarEntry(crossplaneSidebarEntryBase);

registerSidebarEntry({
  name: 'crossplane-dashboard',
  parent: 'crossplane',
  label: 'Dashboard',
  url: '/crossplane/dashboard',
});

registerSidebarEntry({
  name: 'crossplane-packages',
  parent: 'crossplane',
  label: 'Packages',
  url: '/crossplane/providers',
});

registerSidebarEntry({
  name: 'crossplane-providers',
  parent: 'crossplane-packages',
  label: 'Providers',
  url: '/crossplane/providers',
});

registerSidebarEntry({
  name: 'crossplane-configurations',
  parent: 'crossplane-packages',
  label: 'Configurations',
  url: '/crossplane/configurations',
});

registerSidebarEntry({
  name: 'crossplane-functions',
  parent: 'crossplane-packages',
  label: 'Functions',
  url: '/crossplane/functions',
});

registerSidebarEntry({
  name: 'crossplane-api-extensions',
  parent: 'crossplane',
  label: 'API Extensions',
  url: '/crossplane/xrds',
});

registerSidebarEntry({
  name: 'crossplane-xrds',
  parent: 'crossplane-api-extensions',
  label: 'XRDs',
  url: '/crossplane/xrds',
});

registerSidebarEntry({
  name: 'crossplane-compositions',
  parent: 'crossplane-api-extensions',
  label: 'Compositions',
  url: '/crossplane/compositions',
});

registerSidebarEntry({
  name: 'crossplane-claims',
  parent: 'crossplane-api-extensions',
  label: 'Claims',
  url: '/crossplane/claims',
});

registerSidebarEntry({
  name: 'crossplane-environmentconfigs',
  parent: 'crossplane-api-extensions',
  label: 'EnvironmentConfigs',
  url: '/crossplane/environmentconfigs',
});

registerSidebarEntry({
  name: 'crossplane-providerconfigs',
  parent: 'crossplane-api-extensions',
  label: 'ProviderConfigs',
  url: '/crossplane/providerconfigs',
});

registerSidebarEntry({
  name: 'crossplane-deploymentruntimeconfigs',
  parent: 'crossplane-api-extensions',
  label: 'Runtime Configs',
  url: '/crossplane/deploymentruntimeconfigs',
});

registerSidebarEntry({
  name: 'crossplane-managed',
  parent: 'crossplane-api-extensions',
  label: 'Managed Resources',
  url: '/crossplane/managed',
});

registerSidebarEntry({
  name: 'crossplane-trace',
  parent: 'crossplane',
  label: 'Trace',
  url: '/crossplane/trace',
});

// ── Routes ───────────────────────────────────────────────────────────────────

registerRoute({
  path: '/crossplane/dashboard',
  sidebar: 'crossplane-dashboard',
  component: () => <DashboardView />,
  exact: true,
  name: 'crossplane-dashboard',
});

registerRoute({
  path: '/crossplane/providers',
  sidebar: 'crossplane-providers',
  component: () => <ProviderList />,
  exact: true,
  name: 'crossplane-providers',
});

registerRoute({
  path: '/crossplane/configurations',
  sidebar: 'crossplane-configurations',
  component: () => <ConfigurationList />,
  exact: true,
  name: 'crossplane-configurations',
});

registerRoute({
  path: '/crossplane/functions',
  sidebar: 'crossplane-functions',
  component: () => <FunctionList />,
  exact: true,
  name: 'crossplane-functions',
});

registerRoute({
  path: '/crossplane/xrds',
  sidebar: 'crossplane-xrds',
  component: () => <XRDList />,
  exact: true,
  name: 'crossplane-xrds',
});

registerRoute({
  path: '/crossplane/xrds/:name',
  sidebar: 'crossplane-xrds',
  component: () => <XRDDetail />,
  exact: true,
  name: 'crossplane-xrd-detail',
});

registerRoute({
  path: '/crossplane/compositions',
  sidebar: 'crossplane-compositions',
  component: () => <CompositionList />,
  exact: true,
  name: 'crossplane-compositions',
});

registerRoute({
  path: '/crossplane/claims',
  sidebar: 'crossplane-claims',
  component: () => <ClaimsList />,
  exact: true,
  name: 'crossplane-claims',
});

registerRoute({
  path: '/crossplane/environmentconfigs',
  sidebar: 'crossplane-environmentconfigs',
  component: () => <EnvironmentConfigList />,
  exact: true,
  name: 'crossplane-environmentconfigs',
});

registerRoute({
  path: '/crossplane/providerconfigs',
  sidebar: 'crossplane-providerconfigs',
  component: () => <ProviderConfigList />,
  exact: true,
  name: 'crossplane-providerconfigs',
});

registerRoute({
  path: '/crossplane/deploymentruntimeconfigs',
  sidebar: 'crossplane-deploymentruntimeconfigs',
  component: () => <DeploymentRuntimeConfigList />,
  exact: true,
  name: 'crossplane-deploymentruntimeconfigs',
});

registerRoute({
  path: '/crossplane/managed',
  sidebar: 'crossplane-managed',
  component: () => <ManagedResourceList />,
  exact: true,
  name: 'crossplane-managed',
});

registerRoute({
  path: '/crossplane/trace',
  sidebar: 'crossplane-trace',
  component: () => <TraceView />,
  exact: true,
  name: 'crossplane-trace',
});
