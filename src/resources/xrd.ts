import { KubeObject, KubeObjectInterface } from '@kinvolk/headlamp-plugin/lib/k8s/cluster';
import { Condition, isEstablished, isOffered } from './common';

export interface XRDClaimNames {
  kind: string;
  plural: string;
  singular?: string;
  listKind?: string;
  shortNames?: string[];
  categories?: string[];
}

export interface XRDVersion {
  name: string;
  served: boolean;
  referenceable: boolean;
  schema?: {
    openAPIV3Schema?: object;
  };
  additionalPrinterColumns?: Array<{
    name: string;
    type: string;
    jsonPath: string;
    description?: string;
  }>;
}

export interface CrossplaneXRDSpec {
  group: string;
  names: {
    kind: string;
    plural: string;
    singular?: string;
    listKind?: string;
    shortNames?: string[];
    categories?: string[];
  };
  claimNames?: XRDClaimNames;
  versions: XRDVersion[];
  connectionSecretKeys?: string[];
  defaultCompositeDeletePolicy?: string;
  defaultCompositionRef?: { name: string };
  enforcedCompositionRef?: { name: string };
}

export interface CrossplaneXRDStatus {
  conditions?: Condition[];
  controllers?: {
    compositeResourceType?: {
      apiVersion: string;
      kind: string;
    };
  };
}

export interface CrossplaneXRD extends KubeObjectInterface {
  spec: CrossplaneXRDSpec;
  status?: CrossplaneXRDStatus;
}

export class CompositeResourceDefinition extends KubeObject<CrossplaneXRD> {
  static kind = 'CompositeResourceDefinition';
  static apiName = 'compositeresourcedefinitions';
  static apiVersion = 'apiextensions.crossplane.io/v1';
  static isNamespaced = false;

  get established(): boolean {
    return isEstablished(this.jsonData.status?.conditions);
  }

  get offered(): boolean {
    return isOffered(this.jsonData.status?.conditions);
  }

  get compositeKind(): string {
    return this.jsonData.spec?.names?.kind ?? '';
  }

  get claimKind(): string | undefined {
    return this.jsonData.spec?.claimNames?.kind;
  }

  get group(): string {
    return this.jsonData.spec?.group ?? '';
  }

  get versions(): XRDVersion[] {
    return this.jsonData.spec?.versions ?? [];
  }

  get claimNames(): XRDClaimNames | undefined {
    return this.jsonData.spec?.claimNames;
  }

  get hasClaims(): boolean {
    return !!this.jsonData.spec?.claimNames?.kind;
  }

  get ownerConfiguration(): string | undefined {
    const owners = this.jsonData.metadata?.ownerReferences ?? [];
    return owners.find((ref: { kind: string; name: string }) => ref.kind === 'Configuration')?.name;
  }
}
