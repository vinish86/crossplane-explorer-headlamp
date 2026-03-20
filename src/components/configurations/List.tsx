import { ResourceListView } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Link } from '@kinvolk/headlamp-plugin/lib/components/common';
import React, { useMemo } from 'react';
import { useCrossplaneInstalled } from '../../crossplane';
import { Configuration } from '../../resources/configuration';
import { CompositeResourceDefinition } from '../../resources/xrd';
import { NotInstalledBanner } from '../common/NotInstalledBanner';
import { StatusChip } from '../common/StatusChip';

const CRD_NAME = 'configurations.pkg.crossplane.io';

export function ConfigurationList() {
  const installed = useCrossplaneInstalled();
  const [xrds] = CompositeResourceDefinition.useList();

  const { xrdCountMap, xrdWithClaimsCountMap } = useMemo(() => {
    const xrdCountMap: Record<string, number> = {};
    const xrdWithClaimsCountMap: Record<string, number> = {};
    (xrds ?? []).forEach((xrd: CompositeResourceDefinition) => {
      const cfg = xrd.ownerConfiguration;
      if (!cfg) return;
      xrdCountMap[cfg] = (xrdCountMap[cfg] ?? 0) + 1;
      if (xrd.hasClaims) xrdWithClaimsCountMap[cfg] = (xrdWithClaimsCountMap[cfg] ?? 0) + 1;
    });
    return { xrdCountMap, xrdWithClaimsCountMap };
  }, [xrds]);

  const columns = useMemo(
    () => [
      {
        id: 'name',
        label: 'Name',
        getValue: (item: Configuration) => item.getName(),
        render: (item: Configuration) => (
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
        getValue: (item: Configuration) => item.jsonData.spec?.package ?? '',
        filterVariant: 'multi-select' as const,
      },
      {
        id: 'revision',
        label: 'Current Revision',
        getValue: (item: Configuration) => item.jsonData.status?.currentRevision ?? '-',
      },
      {
        id: 'xrds',
        label: 'XRDs',
        getValue: (item: Configuration) => String(xrdCountMap[item.getName()] ?? 0),
      },
      {
        id: 'xrdsWithClaims',
        label: 'XRDs with Claims',
        getValue: (item: Configuration) => String(xrdWithClaimsCountMap[item.getName()] ?? 0),
      },
      {
        id: 'installed',
        label: 'Installed',
        getValue: (item: Configuration) => (item.installed ? 'Installed' : 'Not Installed'),
        render: (item: Configuration) => (
          <StatusChip status={item.installed} trueLabel="Installed" falseLabel="Not Installed" />
        ),
        filterVariant: 'multi-select' as const,
      },
      {
        id: 'healthy',
        label: 'Healthy',
        getValue: (item: Configuration) => (item.healthy ? 'Healthy' : 'Unhealthy'),
        render: (item: Configuration) => <StatusChip status={item.healthy} />,
        filterVariant: 'multi-select' as const,
      },
      'age' as const,
    ],
    [xrdCountMap, xrdWithClaimsCountMap]
  );

  return (
    <>
      {installed === false && <NotInstalledBanner />}
      <ResourceListView
        title="Configurations"
        resourceClass={Configuration}
        enableRowActions={false}
        columns={columns}
      />
    </>
  );
}
