import { ApiProxy } from '@kinvolk/headlamp-plugin/lib';
import { Table, TableColumn } from '@kinvolk/headlamp-plugin/lib/CommonComponents';
import { Link, SectionBox } from '@kinvolk/headlamp-plugin/lib/components/common';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useCrossplaneInstalled } from '../../crossplane';
import { CompositeResourceDefinition } from '../../resources/xrd';
import { NotInstalledBanner } from '../common/NotInstalledBanner';

interface ClaimInstance {
  name: string;
  namespace: string;
  cluster: string;
  claimKind: string;
  claimPlural: string;
  group: string;
  version: string;
  creationTimestamp?: string;
  ready?: string;
  synced?: string;
}

interface ClaimGroup {
  claimKind: string;
  claimPlural: string;
  compositeKind: string;
  group: string;
  version: string;
  instances: ClaimInstance[];
  loading: boolean;
  error?: string;
}

function formatAge(timestamp?: string): string {
  if (!timestamp) return '-';
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

const selectFilterProps = {
  sx: { fontSize: '0.875rem' },
  MenuProps: { PaperProps: { sx: { '& .MuiMenuItem-root': { fontSize: '0.875rem' } } } },
};

export function ClaimsList() {
  const installed = useCrossplaneInstalled();
  const [xrds, xrdsError] = CompositeResourceDefinition.useList();
  const [claimGroups, setClaimGroups] = useState<ClaimGroup[]>([]);
  const loadedKey = useRef<string | null>(null);

  const xrdKey = xrds
    ? xrds
        .map((x: CompositeResourceDefinition) => x.getName())
        .sort()
        .join(',')
    : null;

  useEffect(() => {
    if (!xrds || xrdKey === null) return;
    if (loadedKey.current === xrdKey) return;
    loadedKey.current = xrdKey;

    const xrdsWithClaims = xrds.filter((xrd: CompositeResourceDefinition) => xrd.hasClaims);

    if (xrdsWithClaims.length === 0) {
      setClaimGroups([]);
      return;
    }

    const initialGroups: ClaimGroup[] = xrdsWithClaims.map((xrd: CompositeResourceDefinition) => {
      const versions = xrd.jsonData.spec?.versions ?? [];
      const servedVersion = versions.find((v: { served: boolean }) => v.served) ?? versions[0];
      return {
        claimKind: xrd.claimNames!.kind,
        claimPlural: xrd.claimNames!.plural,
        compositeKind: xrd.compositeKind,
        group: xrd.group,
        version: servedVersion?.name ?? 'v1alpha1',
        instances: [],
        loading: true,
      };
    });

    setClaimGroups(initialGroups);

    xrdsWithClaims.forEach((xrd: CompositeResourceDefinition, index: number) => {
      const versions = xrd.jsonData.spec?.versions ?? [];
      const servedVersion = versions.find((v: { served: boolean }) => v.served) ?? versions[0];
      const version = servedVersion?.name ?? 'v1alpha1';
      const plural = xrd.claimNames!.plural;
      const group = xrd.group;

      ApiProxy.request(`/apis/${group}/${version}/${plural}`, { method: 'GET' })
        .then(
          (response: {
            items?: Array<{
              metadata: {
                name: string;
                namespace: string;
                clusterName?: string;
                labels?: Record<string, string>;
                creationTimestamp?: string;
              };
              status?: { conditions?: Array<{ type: string; status: string }> };
            }>;
          }) => {
            const items: ClaimInstance[] = (response.items ?? []).map(item => {
              const conditions = item.status?.conditions ?? [];
              const ready = conditions.find((c: { type: string }) => c.type === 'Ready')?.status;
              const synced = conditions.find((c: { type: string }) => c.type === 'Synced')?.status;
              const cluster =
                item.metadata.clusterName ||
                item.metadata.labels?.['crossplane.io/composite'] ||
                '';
              return {
                name: item.metadata.name,
                namespace: item.metadata.namespace,
                cluster,
                claimKind: xrd.claimNames!.kind,
                claimPlural: plural,
                group,
                version,
                creationTimestamp: item.metadata.creationTimestamp,
                ready,
                synced,
              };
            });

            setClaimGroups(prev =>
              prev.map((g, i) => (i === index ? { ...g, instances: items, loading: false } : g))
            );
          }
        )
        .catch((err: Error) => {
          setClaimGroups(prev =>
            prev.map((g, i) =>
              i === index ? { ...g, loading: false, error: `Failed to load: ${err.message}` } : g
            )
          );
        });
    });
  }, [xrdKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const allLoaded = claimGroups.length === 0 || claimGroups.every(g => !g.loading);
  const errors = claimGroups.filter(g => !g.loading && g.error);
  const allInstances: ClaimInstance[] = claimGroups
    .filter(g => !g.loading && !g.error)
    .flatMap(g => g.instances);

  const columns = useMemo<TableColumn<ClaimInstance>[]>(
    () => [
      {
        id: 'namespace',
        header: 'Namespace',
        accessorFn: (row: ClaimInstance) => row.namespace,
        filterVariant: 'multi-select',
        muiFilterSelectProps: selectFilterProps,
      },
      {
        id: 'name',
        header: 'Name',
        accessorFn: (row: ClaimInstance) => row.name,
        Cell: ({ row }: { row: { original: ClaimInstance } }) => (
          <Link
            routeName="customresource"
            params={{
              crd: `${row.original.claimPlural}.${row.original.group}`,
              namespace: row.original.namespace,
              crName: row.original.name,
            }}
          >
            {row.original.name}
          </Link>
        ),
      },
      {
        id: 'kind',
        header: 'Kind',
        accessorFn: (row: ClaimInstance) => row.claimKind,
        filterVariant: 'multi-select',
        muiFilterSelectProps: selectFilterProps,
      },
      {
        id: 'apiVersion',
        header: 'API Version',
        accessorFn: (row: ClaimInstance) => `${row.group}/${row.version}`,
      },
      {
        id: 'synced',
        header: 'Synced',
        accessorFn: (row: ClaimInstance) => row.synced ?? '-',
        filterVariant: 'multi-select',
        muiFilterSelectProps: selectFilterProps,
        Cell: ({ row }: { row: { original: ClaimInstance } }) =>
          row.original.synced !== undefined ? (
            <Chip
              label={row.original.synced}
              size="small"
              color={row.original.synced === 'True' ? 'success' : 'default'}
            />
          ) : (
            '-'
          ),
      },
      {
        id: 'ready',
        header: 'Ready',
        accessorFn: (row: ClaimInstance) => row.ready ?? '-',
        filterVariant: 'multi-select',
        muiFilterSelectProps: selectFilterProps,
        Cell: ({ row }: { row: { original: ClaimInstance } }) =>
          row.original.ready !== undefined ? (
            <Chip
              label={row.original.ready}
              size="small"
              color={row.original.ready === 'True' ? 'success' : 'default'}
            />
          ) : (
            '-'
          ),
      },
      {
        id: 'age',
        header: 'Age',
        accessorFn: (row: ClaimInstance) => formatAge(row.creationTimestamp),
      },
    ],
    []
  );

  if (xrdsError) {
    if (String(xrdsError).includes('Resource type not found')) {
      return <NotInstalledBanner />;
    }
    return <Typography color="error">Failed to load XRDs: {String(xrdsError)}</Typography>;
  }

  if (!xrds) {
    return (
      <Box display="flex" alignItems="center" gap={1} p={3}>
        <CircularProgress size={20} />
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  return (
    <>
      {installed === false && <NotInstalledBanner />}
      <SectionBox title="Claims">
        {claimGroups.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No claim types found. Define XRDs with claimNames to expose claims.
          </Typography>
        ) : !allLoaded ? (
          <Box display="flex" alignItems="center" gap={1} p={2}>
            <CircularProgress size={16} />
            <Typography variant="body2">Loading claims...</Typography>
          </Box>
        ) : (
          <>
            {errors.map((g, i) => (
              <Typography key={i} variant="body2" color="error" sx={{ mb: 1 }}>
                {g.claimKind}: {g.error}
              </Typography>
            ))}
            <Table
              columns={columns}
              data={allInstances}
              enableFacetedValues
              emptyMessage="No claims exist yet."
            />
          </>
        )}
      </SectionBox>
    </>
  );
}
