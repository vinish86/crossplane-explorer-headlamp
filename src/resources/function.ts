import { KubeObject, KubeObjectInterface } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';
import { Condition, isHealthy, isInstalled } from './common';

export interface CrossplaneFunctionSpec {
  package: string;
  revisionActivationPolicy?: 'Automatic' | 'Manual';
  packagePullPolicy?: string;
  ignoreCrossplaneConstraints?: boolean;
  skipDependencyResolution?: boolean;
}

export interface CrossplaneFunctionStatus {
  conditions?: Condition[];
  currentRevision?: string;
  atDesiredState?: boolean;
}

export interface CrossplaneFunction extends KubeObjectInterface {
  spec: CrossplaneFunctionSpec;
  status?: CrossplaneFunctionStatus;
}

export class CrossplaneFunc extends KubeObject<CrossplaneFunction> {
  static kind = 'Function';
  static apiName = 'functions';
  static apiVersion = 'pkg.crossplane.io/v1beta1';
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
