import { ResourceListView } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Link } from '@kinvolk/headlamp-plugin/lib/components/common';
import React, { useMemo } from 'react';
import { useCrossplaneInstalled } from '../../crossplane';
import { Provider } from '../../resources/provider';
import { NotInstalledBanner } from '../common/NotInstalledBanner';
import { StatusChip } from '../common/StatusChip';

const CRD_NAME = 'providers.pkg.crossplane.io';

export function ProviderList() {
  const installed = useCrossplaneInstalled();

  const columns = useMemo(
    () => [
      {
        id: 'name',
        label: 'Name',
        getValue: (item: Provider) => item.getName(),
        render: (item: Provider) => (
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
        getValue: (item: Provider) => item.jsonData.spec?.package ?? '',
        filterVariant: 'multi-select' as const,
      },
      {
        id: 'revision',
        label: 'Current Revision',
        getValue: (item: Provider) => item.jsonData.status?.currentRevision ?? '-',
      },
      {
        id: 'installed',
        label: 'Installed',
        getValue: (item: Provider) => (item.installed ? 'Installed' : 'Not Installed'),
        render: (item: Provider) => (
          <StatusChip status={item.installed} trueLabel="Installed" falseLabel="Not Installed" />
        ),
        filterVariant: 'multi-select' as const,
      },
      {
        id: 'healthy',
        label: 'Healthy',
        getValue: (item: Provider) => (item.healthy ? 'Healthy' : 'Unhealthy'),
        render: (item: Provider) => <StatusChip status={item.healthy} />,
        filterVariant: 'multi-select' as const,
      },
      'age' as const,
    ],
    []
  );

  return (
    <>
      {installed === false && <NotInstalledBanner />}
      <ResourceListView
        title="Providers"
        resourceClass={Provider}
        enableRowActions={false}
        columns={columns}
      />
    </>
  );
}
