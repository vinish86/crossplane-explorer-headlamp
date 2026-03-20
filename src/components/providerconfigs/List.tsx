import { ApiProxy } from '@kinvolk/headlamp-plugin/lib';
import { Table, TableColumn } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Link, SectionBox } from '@kinvolk/headlamp-plugin/lib/components/common';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useCrossplaneInstalled } from '../../crossplane';
import { NotInstalledBanner } from '../common/NotInstalledBanner';

interface ProviderConfigRow {
  name: string;
  provider: string;
  crdName: string;
  credentialsSource?: string;
  ready?: boolean;
  creationTimestamp?: string;
}

interface ProviderConfigGroup {
  group: string;
  version: string;
  crdName: string;
  instances: ProviderConfigRow[];
  loading: boolean;
  error?: string;
}

type CRDItem = {
  metadata: { name: string };
  spec: {
    group: string;
    names: { plural: string };
    versions: Array<{ name: string; served: boolean }>;
  };
};

type PCItem = {
  metadata: { name: string; creationTimestamp?: string };
  spec?: { credentials?: { source?: string } };
  status?: { conditions?: Array<{ type: string; status: string }> };
};

const selectFilterProps = {
  sx: { fontSize: '0.875rem' },
  MenuProps: { PaperProps: { sx: { '& .MuiMenuItem-root': { fontSize: '0.875rem' } } } },
};

export function ProviderConfigList() {
  const installed = useCrossplaneInstalled();
  const [groups, setGroups] = useState<ProviderConfigGroup[]>([]);
  const [discovering, setDiscovering] = useState(true);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    ApiProxy.request('/apis/apiextensions.k8s.io/v1/customresourcedefinitions', { method: 'GET' })
      .then((response: { items?: CRDItem[] }) => {
        const pcCRDs = (response.items ?? []).filter(
          crd => crd.spec.names.plural === 'providerconfigs'
        );

        if (pcCRDs.length === 0) {
          setDiscovering(false);
          return;
        }

        const initialGroups: ProviderConfigGroup[] = pcCRDs.map(crd => {
          const servedVersion = crd.spec.versions.find(v => v.served) ?? crd.spec.versions[0];
          return {
            group: crd.spec.group,
            version: servedVersion?.name ?? 'v1alpha1',
            crdName: crd.metadata.name,
            instances: [],
            loading: true,
          };
        });

        setGroups(initialGroups);
        setDiscovering(false);

        pcCRDs.forEach((crd, index) => {
          const group = crd.spec.group;
          const servedVersion = crd.spec.versions.find(v => v.served) ?? crd.spec.versions[0];
          const version = servedVersion?.name ?? 'v1alpha1';

          ApiProxy.request(`/apis/${group}/${version}/providerconfigs`, { method: 'GET' })
            .then((res: { items?: PCItem[] }) => {
              const items: ProviderConfigRow[] = (res.items ?? []).map(item => {
                const conditions = item.status?.conditions ?? [];
                const readyCond = conditions.find(c => c.type === 'Ready');
                return {
                  name: item.metadata.name,
                  provider: group,
                  crdName: crd.metadata.name,
                  credentialsSource: item.spec?.credentials?.source,
                  ready: readyCond ? readyCond.status === 'True' : undefined,
                  creationTimestamp: item.metadata.creationTimestamp,
                };
              });
              setGroups(prev =>
                prev.map((g, i) => (i === index ? { ...g, instances: items, loading: false } : g))
              );
            })
            .catch((err: Error) => {
              setGroups(prev =>
                prev.map((g, i) => (i === index ? { ...g, loading: false, error: err.message } : g))
              );
            });
        });
      })
      .catch((err: Error) => {
        setDiscoverError(err.message);
        setDiscovering(false);
      });
  }, []);

  const allLoaded = groups.every(g => !g.loading);
  const allRows: ProviderConfigRow[] = groups
    .filter(g => !g.loading && !g.error)
    .flatMap(g => g.instances);
  const errors = groups.filter(g => !g.loading && g.error);

  const columns = useMemo<TableColumn<ProviderConfigRow>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
        accessorFn: (row: ProviderConfigRow) => row.name,
        Cell: ({ row }: { row: { original: ProviderConfigRow } }) => (
          <Link
            routeName="customresource"
            params={{ crd: row.original.crdName, namespace: '-', crName: row.original.name }}
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        id: 'provider',
        header: 'Provider',
        accessorFn: (row: ProviderConfigRow) => row.provider,
        filterVariant: 'multi-select',
        muiFilterSelectProps: selectFilterProps,
      },
      {
        id: 'credentialsSource',
        header: 'Credentials Source',
        accessorFn: (row: ProviderConfigRow) => row.credentialsSource ?? '-',
        filterVariant: 'multi-select',
        muiFilterSelectProps: selectFilterProps,
      },
      {
        id: 'ready',
        header: 'Ready',
        accessorFn: (row: ProviderConfigRow) =>
          row.ready === undefined ? '-' : row.ready ? 'Ready' : 'Not Ready',
        filterVariant: 'multi-select',
        muiFilterSelectProps: selectFilterProps,
        Cell: ({ row }: { row: { original: ProviderConfigRow } }) =>
          row.original.ready !== undefined ? (
            <Chip
              label={row.original.ready ? 'Ready' : 'Not Ready'}
              size="small"
              color={row.original.ready ? 'success' : 'default'}
            />
          ) : (
            '-'
          ),
      },
      {
        id: 'age',
        header: 'Age',
        accessorFn: (row: ProviderConfigRow) =>
          row.creationTimestamp ? new Date(row.creationTimestamp).toLocaleDateString() : '-',
      },
    ],
    []
  );

  if (discovering) {
    return (
      <Box display="flex" alignItems="center" gap={1} p={3}>
        <CircularProgress size={20} />
        <Typography>Discovering ProviderConfigs...</Typography>
      </Box>
    );
  }

  if (discoverError) {
    return (
      <Typography color="error">Failed to discover ProviderConfigs: {discoverError}</Typography>
    );
  }

  if (!discovering && groups.length === 0) {
    return (
      <SectionBox title="Provider Configs">
        <Typography variant="body2" color="text.secondary">
          No ProviderConfig CRDs found. Install a Crossplane provider to get started.
        </Typography>
      </SectionBox>
    );
  }

  return (
    <>
      {installed === false && <NotInstalledBanner />}
      <SectionBox title="Provider Configs">
        {errors.map(g => (
          <Typography key={g.group} variant="body2" color="error" sx={{ mb: 1 }}>
            {g.group}: {g.error}
          </Typography>
        ))}
        {!allLoaded ? (
          <Box display="flex" alignItems="center" gap={1} p={2}>
            <CircularProgress size={16} />
            <Typography variant="body2">Loading provider configs...</Typography>
          </Box>
        ) : (
          <Table
            columns={columns}
            data={allRows}
            enableFacetedValues
            emptyMessage="No provider configs exist yet."
          />
        )}
      </SectionBox>
    </>
  );
}
