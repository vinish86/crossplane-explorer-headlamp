import { ResourceListView } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Link } from '@kinvolk/headlamp-plugin/lib/components/common';
import React from 'react';
import { useCrossplaneInstalled } from '../../crossplane';
import { DeploymentRuntimeConfig } from '../../resources/deploymentruntimeconfig';
import { NotInstalledBanner } from '../common/NotInstalledBanner';

const DRC_CRD = 'deploymentruntimeconfigs.pkg.crossplane.io';

export function DeploymentRuntimeConfigList() {
  const installed = useCrossplaneInstalled();

  return (
    <>
      {installed === false && <NotInstalledBanner />}
      <ResourceListView
        title="Deployment Runtime Configs"
        resourceClass={DeploymentRuntimeConfig}
        enableRowActions={false}
        columns={[
          {
            id: 'name',
            label: 'Name',
            getValue: (item: DeploymentRuntimeConfig) => item.getName(),
            render: (item: DeploymentRuntimeConfig) => (
              <Link
                routeName="customresource"
                params={{ crd: DRC_CRD, namespace: '-', crName: item.getName() }}
              >
                {item.getName()}
              </Link>
            ),
          },
          {
            id: 'replicas',
            label: 'Replicas',
            getValue: (item: DeploymentRuntimeConfig) =>
              item.replicas !== undefined ? String(item.replicas) : '-',
          },
          'age',
        ]}
      />
    </>
  );
}
