import { ResourceListView } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Link } from '@kinvolk/headlamp-plugin/lib/components/common';
import React, { useMemo } from 'react';
import { useCrossplaneInstalled } from '../../crossplane';
import { CrossplaneFunc } from '../../resources/function';
import { NotInstalledBanner } from '../common/NotInstalledBanner';
import { StatusChip } from '../common/StatusChip';

const CRD_NAME = 'functions.pkg.crossplane.io';

export function FunctionList() {
  const installed = useCrossplaneInstalled();

  const columns = useMemo(
    () => [
      {
        id: 'name',
        label: 'Name',
        getValue: (item: CrossplaneFunc) => item.getName(),
        render: (item: CrossplaneFunc) => (
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
        getValue: (item: CrossplaneFunc) => item.jsonData.spec?.package ?? '',
        filterVariant: 'multi-select' as const,
      },
      {
        id: 'revision',
        label: 'Current Revision',
        getValue: (item: CrossplaneFunc) => item.jsonData.status?.currentRevision ?? '-',
      },
      {
        id: 'installed',
        label: 'Installed',
        getValue: (item: CrossplaneFunc) => (item.installed ? 'Installed' : 'Not Installed'),
        render: (item: CrossplaneFunc) => (
          <StatusChip status={item.installed} trueLabel="Installed" falseLabel="Not Installed" />
        ),
        filterVariant: 'multi-select' as const,
      },
      {
        id: 'healthy',
        label: 'Healthy',
        getValue: (item: CrossplaneFunc) => (item.healthy ? 'Healthy' : 'Unhealthy'),
        render: (item: CrossplaneFunc) => <StatusChip status={item.healthy} />,
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
        title="Functions"
        resourceClass={CrossplaneFunc}
        enableRowActions={false}
        columns={columns}
      />
    </>
  );
}
