import { KubeObject, KubeObjectInterface } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';

export interface CrossplaneEnvironmentConfig extends KubeObjectInterface {
  data?: Record<string, unknown>;
}

export class EnvironmentConfig extends KubeObject<CrossplaneEnvironmentConfig> {
  static kind = 'EnvironmentConfig';
  static apiName = 'environmentconfigs';
  static apiVersion = 'apiextensions.crossplane.io/v1alpha1';
  static isNamespaced = false;

  get keyCount(): number {
    return Object.keys(this.jsonData.data ?? {}).length;
  }
}
