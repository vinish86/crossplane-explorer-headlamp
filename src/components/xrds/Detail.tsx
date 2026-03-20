import { ApiProxy } from '@kinvolk/headlamp-plugin/lib';
import { Link, SectionBox } from '@kinvolk/headlamp-plugin/lib/components/common';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { isEstablished, isOffered } from '../../resources/common';
import { ConditionsTable } from '../common/ConditionsTable';
import { StatusChip } from '../common/StatusChip';

const CONFIGURATION_CRD = 'configurations.pkg.crossplane.io';
const XRD_CRD = 'compositeresourcedefinitions.apiextensions.crossplane.io';

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Grid container spacing={2} sx={{ py: 0.75 }}>
      <Grid item xs={3}>
        <Typography variant="body2" color="text.secondary" fontWeight={500}>
          {label}
        </Typography>
      </Grid>
      <Grid item xs={9}>
        <Typography variant="body2">{value ?? '-'}</Typography>
      </Grid>
    </Grid>
  );
}

export function XRDDetail() {
  const { name } = useParams<{ name: string }>();
  const [xrd, setXrd] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!name) return;
    ApiProxy.request(`/apis/apiextensions.crossplane.io/v1/compositeresourcedefinitions/${name}`, {
      method: 'GET',
    })
      .then(setXrd)
      .catch((err: Error) => setError(err.message));
  }, [name]);

  if (error) {
    return (
      <SectionBox title={name ?? 'XRD'}>
        <Typography color="error">Failed to load XRD: {error}</Typography>
      </SectionBox>
    );
  }

  if (!xrd) {
    return (
      <Box display="flex" alignItems="center" gap={1} p={3}>
        <CircularProgress size={20} />
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  const spec = xrd.spec ?? {};
  const conditions = xrd.status?.conditions ?? [];
  const established = isEstablished(conditions);
  const offered = isOffered(conditions);
  const ownerConfig = (xrd.metadata?.ownerReferences ?? []).find(
    (r: { kind: string }) => r.kind === 'Configuration'
  )?.name;

  return (
    <Box>
      <SectionBox title={name} backLink>
        {/* Overview */}
        <Box sx={{ mb: 2 }}>
          <InfoRow label="API Group" value={spec.group} />
          <Divider />
          <InfoRow label="Composite Kind" value={spec.names?.kind} />
          <Divider />
          <InfoRow label="Composite Plural" value={spec.names?.plural} />
          <Divider />
          <InfoRow
            label="Claim Kind"
            value={
              spec.claimNames?.kind ?? (
                <Typography variant="body2" color="text.secondary">
                  No claim exposed
                </Typography>
              )
            }
          />
          <Divider />
          <InfoRow label="Claim Plural" value={spec.claimNames?.plural} />
          <Divider />
          <InfoRow
            label="Package"
            value={
              ownerConfig ? (
                <Link
                  routeName="customresource"
                  params={{ crd: CONFIGURATION_CRD, namespace: '-', crName: ownerConfig }}
                >
                  {ownerConfig}
                </Link>
              ) : undefined
            }
          />
          <Divider />
          <InfoRow
            label="Established"
            value={
              <StatusChip
                status={established}
                trueLabel="Established"
                falseLabel="Not Established"
              />
            }
          />
          <Divider />
          {spec.claimNames?.kind && (
            <>
              <InfoRow
                label="Offered"
                value={<StatusChip status={offered} trueLabel="Offered" falseLabel="Not Offered" />}
              />
              <Divider />
            </>
          )}
          <InfoRow label="Default Composition" value={spec.defaultCompositionRef?.name} />
          <Divider />
          <InfoRow label="Enforced Composition" value={spec.enforcedCompositionRef?.name} />
        </Box>

        {/* View YAML link */}
        <Box sx={{ mb: 2 }}>
          <Link
            routeName="customresource"
            params={{ crd: XRD_CRD, namespace: '-', crName: name ?? '' }}
          >
            View YAML
          </Link>
        </Box>
      </SectionBox>

      {/* Versions */}
      <SectionBox title="Versions">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Served</TableCell>
              <TableCell>Referenceable</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(spec.versions ?? []).map(
              (v: { name: string; served: boolean; referenceable: boolean }) => (
                <TableRow key={v.name}>
                  <TableCell>{v.name}</TableCell>
                  <TableCell>
                    <Chip
                      label={v.served ? 'Yes' : 'No'}
                      size="small"
                      color={v.served ? 'success' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={v.referenceable ? 'Yes' : 'No'}
                      size="small"
                      color={v.referenceable ? 'primary' : 'default'}
                    />
                  </TableCell>
                </TableRow>
              )
            )}
          </TableBody>
        </Table>
      </SectionBox>

      {/* Conditions */}
      <SectionBox title="Conditions">
        <ConditionsTable conditions={conditions} />
      </SectionBox>
    </Box>
  );
}
