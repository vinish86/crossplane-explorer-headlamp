import { KubeObject, KubeObjectInterface } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';
import { Condition, isHealthy, isInstalled } from './common';

export interface CrossplaneConfigurationSpec {
  package: string;
  revisionActivationPolicy?: 'Automatic' | 'Manual';
  packagePullPolicy?: string;
  ignoreCrossplaneConstraints?: boolean;
  skipDependencyResolution?: boolean;
}

export interface CrossplaneConfigurationStatus {
  conditions?: Condition[];
  currentRevision?: string;
  atDesiredState?: boolean;
}

export interface CrossplaneConfiguration extends KubeObjectInterface {
  spec: CrossplaneConfigurationSpec;
  status?: CrossplaneConfigurationStatus;
}

export class Configuration extends KubeObject<CrossplaneConfiguration> {
  static kind = 'Configuration';
  static apiName = 'configurations';
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

export interface CrossplaneConfigurationRevision extends KubeObjectInterface {
  spec: {
    package: string;
    revision: number;
    desiredState: 'Active' | 'Inactive';
    ignoreCrossplaneConstraints?: boolean;
    skipDependencyResolution?: boolean;
  };
  status?: {
    conditions?: Condition[];
    atDesiredState?: boolean;
    foundDependencies?: number;
    installedDependencies?: number;
    invalidDependencies?: number;
    objectRefs?: object[];
  };
}

export class ConfigurationRevision extends KubeObject<CrossplaneConfigurationRevision> {
  static kind = 'ConfigurationRevision';
  static apiName = 'configurationrevisions';
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
