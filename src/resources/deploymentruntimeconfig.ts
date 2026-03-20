import { KubeObject, KubeObjectInterface } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';

export interface CrossplaneDeploymentRuntimeConfig extends KubeObjectInterface {
  spec?: {
    deploymentTemplate?: {
      metadata?: object;
      spec?: {
        replicas?: number;
        selector?: object;
        template?: object;
      };
    };
    serviceTemplate?: object;
    serviceAccountTemplate?: object;
  };
}

export class DeploymentRuntimeConfig extends KubeObject<CrossplaneDeploymentRuntimeConfig> {
  static kind = 'DeploymentRuntimeConfig';
  static apiName = 'deploymentruntimeconfigs';
  static apiVersion = 'pkg.crossplane.io/v1beta1';
  static isNamespaced = false;

  get replicas(): number | undefined {
    return this.jsonData.spec?.deploymentTemplate?.spec?.replicas;
  }
}
