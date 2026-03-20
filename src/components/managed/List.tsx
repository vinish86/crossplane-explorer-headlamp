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

interface ManagedRow {
  name: string;
  namespace?: string; // v2 namespaced MRs; cluster-scoped (v1) have undefined
  kind: string;
  provider: string;
  crdName: string;
  ready?: boolean;
  synced?: boolean;
  creationTimestamp?: string;
}

interface ManagedGroup {
  group: string;
  kind: string;
  plural: string;
  version: string;
  crdName: string;
  instances: ManagedRow[];
  loading: boolean;
  error?: string;
}

type CRDItem = {
  metadata: { name: string };
  spec: {
    group: string;
    names: { plural: string; kind: string; categories?: string[] };
    versions: Array<{ name: string; served: boolean }>;
  };
};

type MRItem = {
  metadata: { name: string; namespace?: string; creationTimestamp?: string };
  status?: { conditions?: Array<{ type: string; status: string }> };
};

const selectFilterProps = {
  sx: { fontSize: '0.875rem' },
  MenuProps: { PaperProps: { sx: { '& .MuiMenuItem-root': { fontSize: '0.875rem' } } } },
};

export function ManagedResourceList() {
  const installed = useCrossplaneInstalled();
  const [groups, setGroups] = useState<ManagedGroup[]>([]);
  const [discovering, setDiscovering] = useState(true);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (loaded.current) return;
    loaded.current = true;

    ApiProxy.request('/apis/apiextensions.k8s.io/v1/customresourcedefinitions', { method: 'GET' })
      .then((response: { items?: CRDItem[] }) => {
        const managedCRDs = (response.items ?? []).filter(crd =>
          (crd.spec.names.categories ?? []).includes('managed')
        );

        if (managedCRDs.length === 0) {
          setDiscovering(false);
          return;
        }

        const initialGroups: ManagedGroup[] = managedCRDs.map(crd => {
          const servedVersion = crd.spec.versions.find(v => v.served) ?? crd.spec.versions[0];
          return {
            group: crd.spec.group,
            kind: crd.spec.names.kind,
            plural: crd.spec.names.plural,
            version: servedVersion?.name ?? 'v1alpha1',
            crdName: crd.metadata.name,
            instances: [],
            loading: true,
          };
        });

        initialGroups.sort((a, b) =>
          a.group !== b.group ? a.group.localeCompare(b.group) : a.kind.localeCompare(b.kind)
        );

        setGroups(initialGroups);
        setDiscovering(false);

        initialGroups.forEach((group, index) => {
          ApiProxy.request(`/apis/${group.group}/${group.version}/${group.plural}`, {
            method: 'GET',
          })
            .then((res: { items?: MRItem[] }) => {
              const items: ManagedRow[] = (res.items ?? []).map(item => {
                const conditions = item.status?.conditions ?? [];
                const readyCond = conditions.find(c => c.type === 'Ready');
                const syncedCond = conditions.find(c => c.type === 'Synced');
                return {
                  name: item.metadata.name,
                  namespace: item.metadata.namespace,
                  kind: group.kind,
                  provider: group.group,
                  crdName: group.crdName,
                  ready: readyCond ? readyCond.status === 'True' : undefined,
                  synced: syncedCond ? syncedCond.status === 'True' : undefined,
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
  const allRows: ManagedRow[] = groups
    .filter(g => !g.loading && !g.error)
    .flatMap(g => g.instances);

  const columns = useMemo<TableColumn<ManagedRow>[]>(
    () => [
      {
        id: 'name',
        header: 'Name',
        accessorFn: (row: ManagedRow) => row.name,
        Cell: ({ row }: { row: { original: ManagedRow } }) => (
          <Link
            routeName="customresource"
            params={{
              crd: row.original.crdName,
              namespace: row.original.namespace ?? '-',
              crName: row.original.name,
            }}
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        id: 'namespace',
        header: 'Namespace',
        accessorFn: (row: ManagedRow) => row.namespace ?? '-',
        filterVariant: 'multi-select',
        muiFilterSelectProps: selectFilterProps,
      },
      {
        id: 'kind',
        header: 'Kind',
        accessorFn: (row: ManagedRow) => row.kind,
        filterVariant: 'multi-select',
        muiFilterSelectProps: selectFilterProps,
      },
      {
        id: 'provider',
        header: 'Provider',
        accessorFn: (row: ManagedRow) => row.provider,
        filterVariant: 'multi-select',
        muiFilterSelectProps: selectFilterProps,
      },
      {
        id: 'ready',
        header: 'Ready',
        accessorFn: (row: ManagedRow) =>
          row.ready === undefined ? '-' : row.ready ? 'Ready' : 'Not Ready',
        filterVariant: 'multi-select',
        muiFilterSelectProps: selectFilterProps,
        Cell: ({ row }: { row: { original: ManagedRow } }) =>
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
        id: 'synced',
        header: 'Synced',
        accessorFn: (row: ManagedRow) =>
          row.synced === undefined ? '-' : row.synced ? 'Synced' : 'Not Synced',
        filterVariant: 'multi-select',
        muiFilterSelectProps: selectFilterProps,
        Cell: ({ row }: { row: { original: ManagedRow } }) =>
          row.original.synced !== undefined ? (
            <Chip
              label={row.original.synced ? 'Synced' : 'Not Synced'}
              size="small"
              color={row.original.synced ? 'success' : 'default'}
            />
          ) : (
            '-'
          ),
      },
      {
        id: 'age',
        header: 'Age',
        accessorFn: (row: ManagedRow) =>
          row.creationTimestamp ? new Date(row.creationTimestamp).toLocaleDateString() : '-',
      },
    ],
    []
  );

  if (discovering) {
    return (
      <Box display="flex" alignItems="center" gap={1} p={3}>
        <CircularProgress size={20} />
        <Typography>Discovering managed resources...</Typography>
      </Box>
    );
  }

  if (discoverError) {
    return (
      <Typography color="error">Failed to discover managed resources: {discoverError}</Typography>
    );
  }

  if (!discovering && groups.length === 0) {
    return (
      <SectionBox title="Managed Resources">
        <Typography variant="body2" color="text.secondary">
          No managed resource CRDs found. Install a Crossplane provider to get started.
        </Typography>
      </SectionBox>
    );
  }

  return (
    <>
      {installed === false && <NotInstalledBanner />}
      <SectionBox title="Managed Resources">
        {!allLoaded ? (
          <Box display="flex" alignItems="center" gap={1} p={2}>
            <CircularProgress size={16} />
            <Typography variant="body2">Loading managed resources...</Typography>
          </Box>
        ) : (
          <Table
            columns={columns}
            data={allRows}
            enableFacetedValues
            emptyMessage="No managed resources exist yet."
          />
        )}
      </SectionBox>
    </>
  );
}
