import { ApiProxy } from '@kinvolk/headlamp-plugin/lib';
import { SectionBox } from '@kinvolk/headlamp-plugin/lib/components/common';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { useCrossplaneInstalled } from '../../crossplane';
import { Configuration } from '../../resources/configuration';
import { CrossplaneFunc } from '../../resources/function';
import { Provider } from '../../resources/provider';
import { CompositeResourceDefinition } from '../../resources/xrd';
import { NotInstalledBanner } from '../common/NotInstalledBanner';

// ── Types ──────────────────────────────────────────────────────────────────

interface ResourceRef {
  apiVersion: string;
  kind: string;
  name: string;
  namespace?: string;
}

interface XRObject {
  apiVersion: string;
  kind: string;
  metadata: { name: string; namespace?: string; ownerReferences?: unknown[] };
  spec: { claimRef?: unknown; resourceRefs?: ResourceRef[] };
  status?: { conditions?: Array<{ type: string; status: string }> };
}

interface ClaimKindStat {
  kind: string;
  configuration: string;
  healthy: number;
  unhealthy: number;
}

interface Stats {
  xrHealthy: number;
  xrUnhealthy: number;
  mrHealthy: number;
  mrUnhealthy: number;
  claimHealthy: number;
  claimUnhealthy: number;
  claimsByKind: ClaimKindStat[];
  mrByConfig: Record<string, { healthy: number; unhealthy: number }>;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const pluralCache = new Map<string, string>();

async function resolvePlural(apiVersion: string, kind: string): Promise<string | null> {
  const key = `${apiVersion}|${kind}`;
  if (pluralCache.has(key)) return pluralCache.get(key)!;

  const parts = apiVersion.split('/');
  const [group, version] = parts.length === 2 ? parts : ['', parts[0]];
  const path = group ? `/apis/${group}/${version}` : `/api/${version}`;

  try {
    const resp = await ApiProxy.request(path);
    for (const r of (resp.resources ?? []) as Array<{ kind: string; name: string }>) {
      if (!r.name.includes('/')) pluralCache.set(`${apiVersion}|${r.kind}`, r.name);
    }
  } catch {
    /* ignore */
  }

  return pluralCache.get(key) ?? null;
}

function isReady(obj: {
  status?: { conditions?: Array<{ type: string; status: string }> };
}): boolean {
  return obj.status?.conditions?.find(c => c.type === 'Ready')?.status === 'True';
}

// Keys for v1 cluster-scoped and v2 namespaced resources (backward compatible)
function xrKey(xr: { kind: string; metadata: { name: string; namespace?: string } }): string {
  return `${xr.kind}|${xr.metadata.namespace ?? '_'}|${xr.metadata.name}`;
}
function refKey(ref: { kind: string; name: string; namespace?: string }): string {
  return `${ref.kind}|${ref.namespace ?? '_'}|${ref.name}`;
}

// ── HealthCard ─────────────────────────────────────────────────────────────

interface HealthCardProps {
  label: string;
  healthy: number;
  unhealthy: number;
  loading: boolean;
}

function HealthCard({ label, healthy, unhealthy, loading }: HealthCardProps) {
  const hasUnhealthy = unhealthy > 0;
  const borderColor = loading ? 'divider' : hasUnhealthy ? 'error.main' : 'success.main';
  return (
    <Paper variant="outlined" sx={{ flex: 1, minWidth: 160, p: 2.5, borderColor, borderWidth: 2 }}>
      <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 1.5 }}>
        {label}
      </Typography>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <CircularProgress size={32} />
        </Box>
      ) : (
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h3" sx={{ fontWeight: 700, color: 'success.main', lineHeight: 1 }}>
              {healthy}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Healthy
            </Typography>
          </Box>
          <Typography
            variant="h4"
            sx={{ color: 'text.disabled', lineHeight: 1, alignSelf: 'center' }}
          >
            /
          </Typography>
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="h3"
              sx={{
                fontWeight: 700,
                color: hasUnhealthy ? 'error.main' : 'text.disabled',
                lineHeight: 1,
              }}
            >
              {unhealthy}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Unhealthy
            </Typography>
          </Box>
        </Box>
      )}
    </Paper>
  );
}

// ── DashboardView ──────────────────────────────────────────────────────────

export function DashboardView() {
  const installed = useCrossplaneInstalled();
  const [providers] = Provider.useList();
  const [functions] = CrossplaneFunc.useList();
  const [configurations] = Configuration.useList();
  const [xrds, xrdsError] = CompositeResourceDefinition.useList();
  const [stats, setStats] = useState<Stats>({
    xrHealthy: 0,
    xrUnhealthy: 0,
    mrHealthy: 0,
    mrUnhealthy: 0,
    claimHealthy: 0,
    claimUnhealthy: 0,
    claimsByKind: [] as ClaimKindStat[],
    mrByConfig: {},
  });
  const [loading, setLoading] = useState(false);

  const xrdKey = xrds
    ? (xrds as CompositeResourceDefinition[])
        .map(x => x.getName())
        .sort()
        .join(',')
    : null;

  useEffect(() => {
    if (!xrds || !xrdKey) return;

    setLoading(true);
    (async () => {
      const allXRs: XRObject[] = [];
      const compositeNames = new Set<string>();
      const xrToConfig = new Map<string, string>(); // xrKey → configName

      // ── Step 1: fetch all composites ──────────────────────────────────────
      for (const xrd of xrds as CompositeResourceDefinition[]) {
        const versions = xrd.jsonData.spec?.versions ?? [];
        const servedVersion = versions.find((v: { served: boolean }) => v.served) ?? versions[0];
        if (!servedVersion) continue;

        const group = xrd.group;
        const version = servedVersion.name;
        const plural = xrd.jsonData.spec?.names?.plural;
        if (!plural) continue;

        pluralCache.set(`${group}/${version}|${xrd.compositeKind}`, plural);

        const configName = xrd.ownerConfiguration;

        try {
          const resp = await ApiProxy.request(`/apis/${group}/${version}/${plural}`);
          for (const item of (resp.items ?? []) as XRObject[]) {
            allXRs.push(item);
            const key = xrKey(item);
            compositeNames.add(key);
            if (configName) xrToConfig.set(key, configName);
          }
        } catch {
          /* no instances */
        }
      }

      // ── Step 2: count XR health ───────────────────────────────────────────
      let xrHealthy = 0;
      let xrUnhealthy = 0;
      for (const xr of allXRs) {
        if (isReady(xr)) xrHealthy++;
        else xrUnhealthy++;
      }

      // ── Step 3: collect unique MR types from resourceRefs ─────────────────
      // Key: "apiVersion|kind" → Set of refKeys + nameToConfig (v1 cluster-scoped and v2 namespaced)
      const mrTypeMap = new Map<
        string,
        { apiVersion: string; kind: string; names: Set<string>; nameToConfig: Map<string, string> }
      >();
      for (const xr of allXRs) {
        const configName = xrToConfig.get(xrKey(xr));
        for (const ref of xr.spec?.resourceRefs ?? []) {
          if (compositeNames.has(refKey(ref))) continue; // skip XRs
          const key = `${ref.apiVersion}|${ref.kind}`;
          if (!mrTypeMap.has(key)) {
            mrTypeMap.set(key, {
              apiVersion: ref.apiVersion,
              kind: ref.kind,
              names: new Set(),
              nameToConfig: new Map(),
            });
          }
          const entry = mrTypeMap.get(key)!;
          const rk = refKey(ref);
          entry.names.add(rk);
          if (configName) entry.nameToConfig.set(rk, configName);
        }
      }

      // ── Step 4: batch-fetch each MR type and count health ─────────────────
      let mrHealthy = 0;
      let mrUnhealthy = 0;
      const mrByConfig: Record<string, { healthy: number; unhealthy: number }> = {};

      const addMrHealth = (
        refKeyVal: string,
        nameToConfig: Map<string, string>,
        healthy: boolean
      ) => {
        const cfg = nameToConfig.get(refKeyVal);
        if (cfg) {
          if (!mrByConfig[cfg]) mrByConfig[cfg] = { healthy: 0, unhealthy: 0 };
          if (healthy) mrByConfig[cfg].healthy++;
          else mrByConfig[cfg].unhealthy++;
        }
      };

      await Promise.all(
        Array.from(mrTypeMap.values()).map(async ({ apiVersion, kind, names, nameToConfig }) => {
          const plural = await resolvePlural(apiVersion, kind);
          if (!plural) {
            mrUnhealthy += names.size;
            names.forEach(rk => addMrHealth(rk, nameToConfig, false));
            return;
          }
          const parts = apiVersion.split('/');
          const [group, version] = parts.length === 2 ? parts : ['', parts[0]];
          try {
            const resp = await ApiProxy.request(`/apis/${group}/${version}/${plural}`);
            for (const item of (resp.items ?? []) as XRObject[]) {
              const itemKey = `${kind}|${item.metadata.namespace ?? '_'}|${item.metadata.name}`;
              if (!names.has(itemKey)) continue;
              const healthy = isReady(item);
              if (healthy) mrHealthy++;
              else mrUnhealthy++;
              addMrHealth(itemKey, nameToConfig, healthy);
            }
          } catch {
            mrUnhealthy += names.size;
            names.forEach(rk => addMrHealth(rk, nameToConfig, false));
          }
        })
      );

      // ── Step 5: fetch all claims, count health and group by kind ─────────
      let claimHealthy = 0;
      let claimUnhealthy = 0;
      const claimsByKind: ClaimKindStat[] = [];

      await Promise.all(
        (xrds as CompositeResourceDefinition[])
          .filter(xrd => !!xrd.claimNames?.plural)
          .map(async xrd => {
            const versions = xrd.jsonData.spec?.versions ?? [];
            const servedVersion =
              versions.find((v: { served: boolean }) => v.served) ?? versions[0];
            if (!servedVersion) return;
            const group = xrd.group;
            const version = servedVersion.name;
            const plural = xrd.claimNames!.plural;
            const kind = xrd.claimNames!.kind;
            let kindHealthy = 0;
            let kindUnhealthy = 0;
            try {
              const resp = await ApiProxy.request(`/apis/${group}/${version}/${plural}`);
              for (const item of (resp.items ?? []) as XRObject[]) {
                if (isReady(item)) {
                  kindHealthy++;
                  claimHealthy++;
                } else {
                  kindUnhealthy++;
                  claimUnhealthy++;
                }
              }
            } catch {
              /* no claims or inaccessible */
            }
            claimsByKind.push({
              kind,
              configuration: xrd.ownerConfiguration ?? '-',
              healthy: kindHealthy,
              unhealthy: kindUnhealthy,
            });
          })
      );

      setStats({
        xrHealthy,
        xrUnhealthy,
        mrHealthy,
        mrUnhealthy,
        claimHealthy,
        claimUnhealthy,
        claimsByKind,
        mrByConfig,
      });
      setLoading(false);
    })();
  }, [xrdKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (xrdsError) {
    if (String(xrdsError).includes('Resource type not found')) return <NotInstalledBanner />;
    return <Typography color="error">Error: {String(xrdsError)}</Typography>;
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
      <SectionBox title="Dashboard">
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', p: 1 }}>
          <HealthCard
            label="Configurations"
            healthy={(configurations ?? []).filter(c => c.healthy).length}
            unhealthy={(configurations ?? []).filter(c => !c.healthy).length}
            loading={configurations === null}
          />
          <HealthCard
            label="Claims"
            healthy={stats.claimHealthy}
            unhealthy={stats.claimUnhealthy}
            loading={loading}
          />
          <HealthCard
            label="Composite Resources (XR)"
            healthy={stats.xrHealthy}
            unhealthy={stats.xrUnhealthy}
            loading={loading}
          />
          <HealthCard
            label="Managed Resources (MR)"
            healthy={stats.mrHealthy}
            unhealthy={stats.mrUnhealthy}
            loading={loading}
          />
          <HealthCard
            label="Providers"
            healthy={(providers ?? []).filter(p => p.healthy).length}
            unhealthy={(providers ?? []).filter(p => !p.healthy).length}
            loading={providers === null}
          />
          <HealthCard
            label="Functions"
            healthy={(functions ?? []).filter(f => f.healthy).length}
            unhealthy={(functions ?? []).filter(f => !f.healthy).length}
            loading={functions === null}
          />
        </Box>

        {/* Overall claim health */}
        {!loading &&
          stats.claimHealthy + stats.claimUnhealthy > 0 &&
          (() => {
            const total = stats.claimHealthy + stats.claimUnhealthy;
            const pct = Math.round((stats.claimHealthy / total) * 100);
            const color = pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'error';
            return (
              <Paper
                variant="outlined"
                sx={{ mt: 2, mx: 1, p: 2, borderColor: `${color}.main`, borderWidth: 2 }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                    Overall Claim Health
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 700, color: `${color}.main`, lineHeight: 1 }}
                  >
                    {pct}%
                  </Typography>
                  <Chip
                    label={`${stats.claimHealthy} / ${total}`}
                    size="small"
                    color={color}
                    variant="outlined"
                    sx={{ fontSize: '0.7rem' }}
                  />
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={pct}
                  color={color}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Paper>
            );
          })()}

        {/* Managed Resources per Configuration */}
        {!loading &&
          Object.keys(stats.mrByConfig).length > 0 &&
          (() => {
            const rows = Object.entries(stats.mrByConfig)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([cfg, { healthy, unhealthy }]) => {
                const total = healthy + unhealthy;
                const pct = total > 0 ? Math.round((healthy / total) * 100) : 0;
                return { cfg, healthy, unhealthy, total, pct };
              });
            const maxTotal = Math.max(...rows.map(r => r.total), 1);
            return (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" sx={{ px: 1, mb: 2 }}>
                  Managed Resources by Configuration
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, px: 1 }}>
                  {rows.map(({ cfg, healthy, unhealthy, total, pct }) => {
                    const color = pct >= 80 ? 'success' : pct >= 50 ? 'warning' : 'error';
                    return (
                      <Box key={cfg}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              flex: 1,
                              minWidth: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {cfg}
                          </Typography>
                          <Chip
                            label={`${healthy} / ${total}`}
                            size="small"
                            color={color}
                            variant="outlined"
                            sx={{ height: 18, fontSize: '0.65rem', flexShrink: 0 }}
                          />
                          <Typography
                            variant="caption"
                            color={`${color}.main`}
                            sx={{
                              fontWeight: 700,
                              minWidth: 32,
                              textAlign: 'right',
                              flexShrink: 0,
                            }}
                          >
                            {pct}%
                          </Typography>
                        </Box>
                        {/* Stacked bar: proportional width + health split */}
                        <Box
                          sx={{
                            display: 'flex',
                            height: 10,
                            borderRadius: 5,
                            overflow: 'hidden',
                            bgcolor: 'action.hover',
                          }}
                        >
                          <Box
                            sx={{
                              width: `${(total / maxTotal) * 100}%`,
                              display: 'flex',
                              borderRadius: 5,
                              overflow: 'hidden',
                            }}
                          >
                            <Box
                              sx={{
                                flex: healthy,
                                bgcolor: 'success.main',
                                transition: 'flex 0.4s',
                              }}
                            />
                            <Box
                              sx={{
                                flex: unhealthy,
                                bgcolor: unhealthy > 0 ? 'error.main' : 'transparent',
                                transition: 'flex 0.4s',
                              }}
                            />
                          </Box>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </Box>
            );
          })()}

        {/* Active Claims */}
        {!loading && stats.claimsByKind.some(row => row.healthy + row.unhealthy > 0) && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" sx={{ px: 1, mb: 1 }}>
              Active Claims
            </Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Kind</TableCell>
                  <TableCell>Configuration</TableCell>
                  <TableCell align="center">Total</TableCell>
                  <TableCell align="center">Healthy</TableCell>
                  <TableCell align="center">Unhealthy</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stats.claimsByKind
                  .filter(row => row.healthy + row.unhealthy > 0)
                  .map(row => (
                    <TableRow key={row.kind}>
                      <TableCell>{row.kind}</TableCell>
                      <TableCell>{row.configuration}</TableCell>
                      <TableCell align="center">{row.healthy + row.unhealthy}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={row.healthy}
                          size="small"
                          color="success"
                          variant="filled"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={row.unhealthy}
                          size="small"
                          color={row.unhealthy > 0 ? 'error' : 'default'}
                          variant="filled"
                          sx={{ height: 20, fontSize: '0.7rem' }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </Box>
        )}
      </SectionBox>
    </>
  );
}
