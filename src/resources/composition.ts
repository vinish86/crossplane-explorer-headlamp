import { KubeObject, KubeObjectInterface } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';
import { Condition, isSynced } from './common';

export interface CompositionResource {
  name?: string;
  base: object;
  patches?: object[];
  connectionDetails?: object[];
  readinessChecks?: object[];
}

export interface CompositionPipelineStep {
  step: string;
  functionRef: {
    name: string;
  };
  input?: object;
}

export interface CrossplaneCompositionSpec {
  compositeTypeRef: {
    apiVersion: string;
    kind: string;
  };
  mode?: 'Resources' | 'Pipeline';
  resources?: CompositionResource[];
  pipeline?: CompositionPipelineStep[];
  patchSets?: Array<{
    name: string;
    patches: object[];
  }>;
  writeConnectionSecretsToNamespace?: string;
  publishConnectionDetailsWithStoreConfigRef?: { name: string };
}

export interface CrossplaneCompositionStatus {
  conditions?: Condition[];
}

export interface CrossplaneComposition extends KubeObjectInterface {
  spec: CrossplaneCompositionSpec;
  status?: CrossplaneCompositionStatus;
}

export class Composition extends KubeObject<CrossplaneComposition> {
  static kind = 'Composition';
  static apiName = 'compositions';
  static apiVersion = 'apiextensions.crossplane.io/v1';
  static isNamespaced = false;

  get ownerConfiguration(): string | undefined {
    const owners = this.jsonData.metadata?.ownerReferences ?? [];
    return owners.find((ref: { kind: string; name: string }) => ref.kind === 'Configuration')?.name;
  }

  get compositeTypeRef(): { apiVersion: string; kind: string } {
    return this.jsonData.spec?.compositeTypeRef ?? { apiVersion: '', kind: '' };
  }

  get mode(): string {
    return this.jsonData.spec?.mode ?? 'Resources';
  }

  get resourceCount(): number {
    return this.jsonData.spec?.resources?.length ?? 0;
  }

  get pipelineStepCount(): number {
    return this.jsonData.spec?.pipeline?.length ?? 0;
  }
}

export interface CrossplaneCompositionRevision extends KubeObjectInterface {
  spec: CrossplaneCompositionSpec & {
    revision: number;
  };
  status?: CrossplaneCompositionStatus;
}

export class CompositionRevision extends KubeObject<CrossplaneCompositionRevision> {
  static kind = 'CompositionRevision';
  static apiName = 'compositionrevisions';
  static apiVersion = 'apiextensions.crossplane.io/v1';
  static isNamespaced = false;

  get synced(): boolean {
    return isSynced(this.jsonData.status?.conditions);
  }

  get revision(): number {
    return this.jsonData.spec?.revision ?? 0;
  }
}
