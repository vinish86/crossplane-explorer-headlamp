export interface Condition {
  type: string;
  status: 'True' | 'False' | 'Unknown';
  reason?: string;
  message?: string;
  lastTransitionTime?: string;
}

export interface PackageRevisionSpec {
  package: string;
  revision?: number;
  desiredState?: 'Active' | 'Inactive';
  ignoreCrossplaneConstraints?: boolean;
  skipDependencyResolution?: boolean;
}

export interface PackageRevisionStatus {
  conditions?: Condition[];
  atDesiredState?: boolean;
  currentRevision?: string;
}

export function getCondition(
  conditions: Condition[] | undefined,
  type: string
): Condition | undefined {
  return conditions?.find(c => c.type === type);
}

export function isReady(conditions: Condition[] | undefined): boolean {
  return getCondition(conditions, 'Ready')?.status === 'True';
}

// Crossplane packages (Provider, Configuration, Function) use 'Installed' instead of 'Ready'
export function isInstalled(conditions: Condition[] | undefined): boolean {
  return getCondition(conditions, 'Installed')?.status === 'True';
}

// Crossplane Compositions use 'Synced' instead of 'Ready'
export function isSynced(conditions: Condition[] | undefined): boolean {
  return getCondition(conditions, 'Synced')?.status === 'True';
}

// Crossplane XRDs use 'Established' and 'Offered' instead of 'Ready'
export function isEstablished(conditions: Condition[] | undefined): boolean {
  return getCondition(conditions, 'Established')?.status === 'True';
}

export function isOffered(conditions: Condition[] | undefined): boolean {
  return getCondition(conditions, 'Offered')?.status === 'True';
}

export function isHealthy(conditions: Condition[] | undefined): boolean {
  return getCondition(conditions, 'Healthy')?.status === 'True';
}
