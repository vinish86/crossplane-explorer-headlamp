import { ResourceListView } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Link } from '@kinvolk/headlamp-plugin/lib/components/common';
import React, { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { useCrossplaneInstalled } from '../../crossplane';
import { Configuration } from '../../resources/configuration';
import { CompositeResourceDefinition } from '../../resources/xrd';
import { NotInstalledBanner } from '../common/NotInstalledBanner';
import { StatusChip } from '../common/StatusChip';

const CONFIGURATION_CRD = 'configurations.pkg.crossplane.io';

function shortPackage(image: string): string {
  // "iaactmpreg.azurecr.io/configurations/mssql-configuration:1.1.2"
  // → "mssql-configuration:1.1.2"
  return image.split('/').pop() ?? image;
}

export function XRDList() {
  const installed = useCrossplaneInstalled();
  const history = useHistory();
  const [configurations] = Configuration.useList();

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
        getValue: (item: CompositeResourceDefinition) => item.getName(),
        render: (item: CompositeResourceDefinition) => (
          <Link
            routeName="customresource"
            params={{
              crd: 'compositeresourcedefinitions.apiextensions.crossplane.io',
              namespace: '-',
              crName: item.getName(),
            }}
            onClick={(e: React.MouseEvent) => {
              e.preventDefault();
              history.push(`/crossplane/xrds/${item.getName()}`);
            }}
          >
            {item.getName()}
          </Link>
        ),
      },
      {
        id: 'package',
        label: 'Package',
        getValue: (item: CompositeResourceDefinition) => {
          const cfgName = item.ownerConfiguration;
          if (!cfgName) return '-';
          const image = configPackageMap[cfgName];
          return image ? shortPackage(image) : cfgName;
        },
        filterVariant: 'multi-select' as const,
        render: (item: CompositeResourceDefinition) => {
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
        id: 'group',
        label: 'API Group',
        getValue: (item: CompositeResourceDefinition) => item.jsonData.spec?.group ?? '',
        filterVariant: 'multi-select' as const,
      },
      {
        id: 'compositeKind',
        label: 'Composite Kind',
        getValue: (item: CompositeResourceDefinition) => item.jsonData.spec?.names?.kind ?? '',
        filterVariant: 'multi-select' as const,
      },
      {
        id: 'claimKind',
        label: 'Claim Kind',
        getValue: (item: CompositeResourceDefinition) =>
          item.jsonData.spec?.claimNames?.kind ?? '-',
        filterVariant: 'multi-select' as const,
      },
      {
        id: 'versions',
        label: 'Versions',
        getValue: (item: CompositeResourceDefinition) =>
          item.jsonData.spec?.versions?.map((v: { name: string }) => v.name).join(', ') ?? '-',
      },
      {
        id: 'established',
        label: 'Established',
        getValue: (item: CompositeResourceDefinition) =>
          item.established ? 'Established' : 'Not Established',
        render: (item: CompositeResourceDefinition) => (
          <StatusChip
            status={item.established}
            trueLabel="Established"
            falseLabel="Not Established"
          />
        ),
        filterVariant: 'multi-select' as const,
      },
      {
        id: 'offered',
        label: 'Offered',
        getValue: (item: CompositeResourceDefinition) =>
          item.hasClaims ? (item.offered ? 'Offered' : 'Not Offered') : '-',
        render: (item: CompositeResourceDefinition) =>
          item.hasClaims ? (
            <StatusChip status={item.offered} trueLabel="Offered" falseLabel="Not Offered" />
          ) : null,
        filterVariant: 'multi-select' as const,
      },
      'age' as const,
    ],
    [configPackageMap, history]
  );

  return (
    <>
      {installed === false && <NotInstalledBanner />}
      <ResourceListView
        title="Composite Resource Definitions"
        resourceClass={CompositeResourceDefinition}
        enableRowActions={false}
        columns={columns}
      />
    </>
  );
}
