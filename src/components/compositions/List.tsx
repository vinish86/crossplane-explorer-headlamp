import { ResourceListView } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Link } from '@kinvolk/headlamp-plugin/lib/components/common';
import React, { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { useCrossplaneInstalled } from '../../crossplane';
import { Composition } from '../../resources/composition';
import { Configuration } from '../../resources/configuration';
import { CompositeResourceDefinition } from '../../resources/xrd';
import { NotInstalledBanner } from '../common/NotInstalledBanner';

const CRD_NAME = 'compositions.apiextensions.crossplane.io';
const CONFIGURATION_CRD = 'configurations.pkg.crossplane.io';
const CRD_NAME_XRD = 'compositeresourcedefinitions.apiextensions.crossplane.io';

function shortPackage(image: string): string {
  return image.split('/').pop() ?? image;
}

export function CompositionList() {
  const installed = useCrossplaneInstalled();
  const history = useHistory();
  const [configurations] = Configuration.useList();
  const [xrds] = CompositeResourceDefinition.useList();

  // kind.group → actual XRD object name (e.g. "XAksClusters.composite.adp.allianz.io" → "xaksclusters.composite.adp.allianz.io")
  const xrdNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    (xrds ?? []).forEach((xrd: CompositeResourceDefinition) => {
      const key = `${xrd.compositeKind}.${xrd.group}`;
      map[key] = xrd.getName();
    });
    return map;
  }, [xrds]);

  const configPackageMap = useMemo(() => {
    const map: Record<string, string> = {};
    (configurations ?? []).forEach((c: Configuration) => {
      map[c.getName()] = c.jsonData.spec?.package ?? '';
    });
    return map;
  }, [configurations]);

  const columns = useMemo(
    () => [
      {
        id: 'name',
        label: 'Name',
        getValue: (item: Composition) => item.getName(),
        render: (item: Composition) => (
          <Link
            routeName="customresource"
            params={{ crd: CRD_NAME, namespace: '-', crName: item.getName() }}
          >
            {item.getName()}
          </Link>
        ),
      },
      {
        id: 'package',
        label: 'Package',
        getValue: (item: Composition) => {
          const cfgName = item.ownerConfiguration;
          if (!cfgName) return '-';
          const image = configPackageMap[cfgName];
          return image ? shortPackage(image) : cfgName;
        },
        filterVariant: 'multi-select' as const,
        render: (item: Composition) => {
          const cfgName = item.ownerConfiguration;
          if (!cfgName) return <>-</>;
          const image = configPackageMap[cfgName];
          return (
            <Link
              routeName="customresource"
              params={{ crd: CONFIGURATION_CRD, namespace: '-', crName: cfgName }}
              title={image}
            >
              {image ? shortPackage(image) : cfgName}
            </Link>
          );
        },
      },
      {
        id: 'compositeType',
        label: 'XRD',
        getValue: (item: Composition) => {
          const ref = item.jsonData.spec?.compositeTypeRef;
          if (!ref) return '-';
          return ref.kind;
        },
        filterVariant: 'multi-select' as const,
        render: (item: Composition) => {
          const ref = item.jsonData.spec?.compositeTypeRef;
          if (!ref) return <>-</>;
          const group = ref.apiVersion.split('/')[0];
          const xrdName = xrdNameMap[`${ref.kind}.${group}`];
          if (!xrdName) return <>{ref.kind}</>;
          return (
            <Link
              routeName="customresource"
              params={{ crd: CRD_NAME_XRD, namespace: '-', crName: xrdName }}
              title={xrdName}
              onClick={(e: React.MouseEvent) => {
                e.preventDefault();
                history.push(`/crossplane/xrds/${xrdName}`);
              }}
            >
              {ref.kind}
            </Link>
          );
        },
      },
      {
        id: 'mode',
        label: 'Mode',
        getValue: (item: Composition) => item.jsonData.spec?.mode ?? 'Resources',
        filterVariant: 'multi-select' as const,
      },
      {
        id: 'resourceCount',
        label: 'Resources / Steps',
        getValue: (item: Composition) => {
          const mode = item.jsonData.spec?.mode ?? 'Resources';
          if (mode === 'Pipeline') {
            return `${item.pipelineStepCount} steps`;
          }
          return `${item.resourceCount} resources`;
        },
      },
      'age' as const,
    ],
    [configPackageMap, xrdNameMap, history]
  );

  return (
    <>
      {installed === false && <NotInstalledBanner />}
      <ResourceListView
        title="Compositions"
        resourceClass={Composition}
        enableRowActions={false}
        columns={columns}
      />
    </>
  );
}
