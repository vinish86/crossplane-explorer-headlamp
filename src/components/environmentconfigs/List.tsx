import { ResourceListView } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Link } from '@kinvolk/headlamp-plugin/lib/components/common';
import React from 'react';
import { useCrossplaneInstalled } from '../../crossplane';
import { EnvironmentConfig } from '../../resources/environmentconfig';
import { NotInstalledBanner } from '../common/NotInstalledBanner';

const ENV_CONFIG_CRD = 'environmentconfigs.apiextensions.crossplane.io';

export function EnvironmentConfigList() {
  const installed = useCrossplaneInstalled();

  return (
    <>
      {installed === false && <NotInstalledBanner />}
      <ResourceListView
        title="Environment Configs"
        resourceClass={EnvironmentConfig}
        enableRowActions={false}
        columns={[
          {
            id: 'name',
            label: 'Name',
            getValue: (item: EnvironmentConfig) => item.getName(),
            render: (item: EnvironmentConfig) => (
              <Link
                routeName="customresource"
                params={{ crd: ENV_CONFIG_CRD, namespace: '-', crName: item.getName() }}
              >
                {item.getName()}
              </Link>
            ),
          },
          {
            id: 'keys',
            label: 'Data Keys',
            getValue: (item: EnvironmentConfig) => item.keyCount,
          },
          'age',
        ]}
      />
    </>
  );
}
