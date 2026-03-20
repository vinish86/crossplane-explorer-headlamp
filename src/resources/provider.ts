import { KubeObject, KubeObjectInterface } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';
import { Condition, isHealthy, isInstalled } from './common';

export interface CrossplaneProviderSpec {
  package: string;
  revisionActivationPolicy?: 'Automatic' | 'Manual';
  packagePullPolicy?: string;
  ignoreCrossplaneConstraints?: boolean;
  skipDependencyResolution?: boolean;
}

export interface CrossplaneProviderStatus {
  conditions?: Condition[];
  currentRevision?: string;
  atDesiredState?: boolean;
}

export interface CrossplaneProvider extends KubeObjectInterface {
  spec: CrossplaneProviderSpec;
  status?: CrossplaneProviderStatus;
}

export class Provider extends KubeObject<CrossplaneProvider> {
  static kind = 'Provider';
  static apiName = 'providers';
  static apiVersion = 'pkg.crossplane.io/v1';
  static isNamespaced = false;

  get installed(): boolean {
    return isInstalled(this.jsonData.status?.conditions);
  }

  get healthy(): boolean {
    return isHealthy(this.jsonData.status?.conditions);
  }

  get packageImage(): string {
    return this.jsonData.spec?.package ?? '';
  }

  get currentRevision(): string | undefined {
    return this.jsonData.status?.currentRevision;
  }
}

export interface CrossplaneProviderRevisionSpec {
  package: string;
  revision: number;
  desiredState: 'Active' | 'Inactive';
  ignoreCrossplaneConstraints?: boolean;
  skipDependencyResolution?: boolean;
}

export interface CrossplaneProviderRevisionStatus {
  conditions?: Condition[];
  atDesiredState?: boolean;
  foundDependencies?: number;
  installedDependencies?: number;
  invalidDependencies?: number;
  permissionRequests?: object[];
  objectRefs?: object[];
}

export interface CrossplaneProviderRevision extends KubeObjectInterface {
  spec: CrossplaneProviderRevisionSpec;
  status?: CrossplaneProviderRevisionStatus;
}

export class ProviderRevision extends KubeObject<CrossplaneProviderRevision> {
  static kind = 'ProviderRevision';
  static apiName = 'providerrevisions';
  static apiVersion = 'pkg.crossplane.io/v1';
  static isNamespaced = false;

  get installed(): boolean {
    return isInstalled(this.jsonData.status?.conditions);
  }

  get revision(): number {
    return this.jsonData.spec?.revision ?? 0;
  }

  get desiredState(): string {
    return this.jsonData.spec?.desiredState ?? '';
  }
}
