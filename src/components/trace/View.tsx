import { ApiProxy } from '@kinvolk/headlamp-plugin/lib';
import { Link, SectionBox } from '@kinvolk/headlamp-plugin/lib/components/common';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { useEffect, useState } from 'react';
import { useCrossplaneInstalled } from '../../crossplane';
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
  spec: {
    claimRef?: { apiVersion: string; kind: string; name: string; namespace: string };
    compositionRef?: { name: string };
    resourceRefs?: ResourceRef[];
  };
  status?: { conditions?: Array<{ type: string; status: string }> };
}

interface NodeStatus {
  synced?: string;
  ready?: string;
}

// XRD-level metadata resolved once from the XRD list
interface XrdInfo {
  xrdName: string;
  configName?: string;
}

// ── Module-level discovery cache ───────────────────────────────────────────

const pluralCache = new Map<string, string>(); // "apiVersion|kind" → plural

async function resolvePlural(apiVersion: string, kind: string): Promise<string | null> {
  const cacheKey = `${apiVersion}|${kind}`;
  if (pluralCache.has(cacheKey)) return pluralCache.get(cacheKey)!;

  const parts = apiVersion.split('/');
  const [group, version] = parts.length === 2 ? parts : ['', parts[0]];
  const path = group ? `/apis/${group}/${version}` : `/api/${version}`;

  try {
    const resp = await ApiProxy.request(path);
    for (const r of (resp.resources ?? []) as Array<{ kind: string; name: string }>) {
      if (!r.name.includes('/')) {
        pluralCache.set(`${apiVersion}|${r.kind}`, r.name);
      }
    }
  } catch {
    /* ignore */
  }

  return pluralCache.get(cacheKey) ?? null;
}

function makeCrdName(apiVersion: string, kind: string): string | undefined {
  const plural = pluralCache.get(`${apiVersion}|${kind}`);
  if (!plural) return undefined;
  const group = apiVersion.split('/')[0];
  return `${plural}.${group}`;
}

function extractStatus(obj: {
  status?: { conditions?: Array<{ type: string; status: string }> };
}): NodeStatus {
  const conds = obj?.status?.conditions ?? [];
  return {
    synced: conds.find(c => c.type === 'Synced')?.status,
    ready: conds.find(c => c.type === 'Ready')?.status,
  };
}

// Keys for v1 cluster-scoped and v2 namespaced resources (backward compatible)
function xrKey(xr: { kind: string; metadata: { name: string; namespace?: string } }): string {
  return `${xr.kind}|${xr.metadata.namespace ?? '_'}|${xr.metadata.name}`;
}
function refKey(ref: { kind: string; name: string; namespace?: string }): string {
  return `${ref.kind}|${ref.namespace ?? '_'}|${ref.name}`;
}

function countResources(
  xr: XRObject,
  compositeMap: Map<string, XRObject>
): { xr: number; mr: number } {
  let xrCount = 0;
  let mrCount = 0;
  for (const ref of xr.spec?.resourceRefs ?? []) {
    const child = compositeMap.get(refKey(ref));
    if (child) {
      xrCount++;
      const nested = countResources(child, compositeMap);
      xrCount += nested.xr;
      mrCount += nested.mr;
    } else {
      mrCount++;
    }
  }
  return { xr: xrCount, mr: mrCount };
}

// ── ConditionChip ──────────────────────────────────────────────────────────

function ConditionChip({ value }: { value?: string }) {
  if (!value) {
    return (
      <Typography
        variant="caption"
        sx={{ color: 'text.disabled', width: 72, textAlign: 'center', display: 'block' }}
      >
        -
      </Typography>
    );
  }
  return (
    <Chip
      label={value}
      size="small"
      color={value === 'True' ? 'success' : 'warning'}
      variant="filled"
      sx={{ height: 18, fontSize: '0.65rem', width: 72 }}
    />
  );
}

// ── TypeBadge ──────────────────────────────────────────────────────────────

const BADGE_STYLE: Record<string, { bgcolor: string; color: string; borderColor: string }> = {
  Claim: { bgcolor: '#1976d2', color: '#fff', borderColor: '#1976d2' },
  XR: { bgcolor: '#7b1fa2', color: '#fff', borderColor: '#7b1fa2' },
  MR: { bgcolor: '#455a64', color: '#fff', borderColor: '#455a64' },
};

function TypeBadge({ label }: { label: string }) {
  const style = BADGE_STYLE[label] ?? BADGE_STYLE['MR'];
  return (
    <Chip
      label={label}
      size="small"
      variant="filled"
      sx={{
        height: 18,
        fontSize: '0.65rem',
        minWidth: 44,
        mr: 1,
        bgcolor: style.bgcolor,
        color: style.color,
        border: `1px solid ${style.borderColor}`,
        '& .MuiChip-label': { px: 0.75 },
      }}
    />
  );
}

// ── MetaLink ───────────────────────────────────────────────────────────────

function MetaLink({
  value,
  crdNameForLink,
  namespace,
}: {
  value: string;
  crdNameForLink: string;
  namespace?: string;
}) {
  return (
    <Link
      routeName="customresource"
      params={{ crd: crdNameForLink, namespace: namespace ?? '-', crName: value }}
    >
      <Typography
        variant="body2"
        component="span"
        title={value}
        sx={{
          display: 'block',
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: 'primary.main',
          textDecoration: 'underline',
        }}
      >
        {value}
      </Typography>
    </Link>
  );
}

// ── TreeRow ────────────────────────────────────────────────────────────────

interface TreeRowProps {
  depth: number;
  isLast: boolean;
  badge: string;
  label: string;
  subtitle?: string;
  name: string;
  namespace?: string;
  crdName?: string;
  counts?: { xr: number; mr: number };
  xrdName?: string;
  compositionName?: string;
  configName?: string;
  status: NodeStatus;
  statusLoading?: boolean;
  expandable: boolean;
  expanded: boolean;
  onToggle: () => void;
}

function TreeRow({
  depth,
  isLast,
  badge,
  label,
  subtitle,
  name,
  namespace,
  crdName,
  counts,
  xrdName,
  compositionName,
  configName,
  status,
  statusLoading,
  expandable,
  expanded,
  onToggle,
}: TreeRowProps) {
  const indent = depth * 24;
  const connector = depth === 0 ? '' : isLast ? '└─ ' : '├─ ';

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', py: 0.5, px: 1, borderRadius: 1 }}>
      {/* Expand toggle */}
      <Typography
        variant="caption"
        sx={{
          color: 'text.secondary',
          minWidth: indent + 20,
          userSelect: 'none',
          cursor: expandable ? 'pointer' : 'default',
          '&:hover': expandable ? { color: 'text.primary' } : {},
        }}
        onClick={expandable ? onToggle : undefined}
      >
        {connector}
        {expandable ? (expanded ? '▼' : '▶') : ' '}
      </Typography>

      {/* Badge + label */}
      <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
        <TypeBadge label={badge} />
        {crdName ? (
          <Link
            routeName="customresource"
            params={{ crd: crdName, namespace: namespace ?? '-', crName: name }}
          >
            <Typography variant="body2" component="span">
              {label}
            </Typography>
            {subtitle && (
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                ({subtitle})
              </Typography>
            )}
          </Link>
        ) : (
          <Typography variant="body2">
            {label}
            {subtitle && (
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                ({subtitle})
              </Typography>
            )}
          </Typography>
        )}
        {counts && (
          <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
            <Chip
              label={`${counts.xr} XR`}
              size="small"
              variant="outlined"
              sx={{ height: 18, fontSize: '0.65rem' }}
            />
            <Chip
              label={`${counts.mr} MR`}
              size="small"
              variant="outlined"
              sx={{ height: 18, fontSize: '0.65rem' }}
            />
          </Box>
        )}
      </Box>

      {/* XRD column */}
      <Box sx={{ width: 190, px: 0.5, overflow: 'hidden' }}>
        {xrdName ? (
          <MetaLink
            value={xrdName}
            crdNameForLink="compositeresourcedefinitions.apiextensions.crossplane.io"
          />
        ) : (
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            -
          </Typography>
        )}
      </Box>

      {/* Composition column */}
      <Box sx={{ width: 190, px: 0.5, overflow: 'hidden' }}>
        {compositionName ? (
          <MetaLink
            value={compositionName}
            crdNameForLink="compositions.apiextensions.crossplane.io"
          />
        ) : (
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            -
          </Typography>
        )}
      </Box>

      {/* Configuration column */}
      <Box sx={{ width: 160, px: 0.5, overflow: 'hidden' }}>
        {configName ? (
          <Typography
            variant="body2"
            title={configName}
            sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {configName}
          </Typography>
        ) : (
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            -
          </Typography>
        )}
      </Box>

      {/* Status */}
      {statusLoading ? (
        <CircularProgress size={12} sx={{ mx: 2 }} />
      ) : (
        <>
          <Box sx={{ width: 80, display: 'flex', justifyContent: 'center' }}>
            <ConditionChip value={status.synced} />
          </Box>
          <Box sx={{ width: 80, display: 'flex', justifyContent: 'center' }}>
            <ConditionChip value={status.ready} />
          </Box>
        </>
      )}
    </Box>
  );
}

// ── ResourceNode — MR or nested XR ────────────────────────────────────────

interface ResourceNodeProps {
  resourceRef: ResourceRef;
  depth: number;
  isLast: boolean;
  compositeMap: Map<string, XRObject>;
  xrdInfoByKind: Map<string, XrdInfo>;
}

function ResourceNode({
  resourceRef,
  depth,
  isLast,
  compositeMap,
  xrdInfoByKind,
}: ResourceNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<NodeStatus>({});
  const [statusLoading, setStatusLoading] = useState(true);
  const [crdName, setCrdName] = useState<string | undefined>(undefined);

  const composite = compositeMap.get(refKey(resourceRef));
  const isXR = !!composite;
  const children: ResourceRef[] = composite?.spec?.resourceRefs ?? [];
  const xrdInfo = isXR ? xrdInfoByKind.get(resourceRef.kind) : undefined;
  const xrCompositionName = isXR ? composite?.spec?.compositionRef?.name : undefined;

  useEffect(() => {
    if (composite) {
      setStatus(extractStatus(composite));
      setCrdName(makeCrdName(composite.apiVersion, composite.kind));
      setStatusLoading(false);
      return;
    }
    resolvePlural(resourceRef.apiVersion, resourceRef.kind).then(async plural => {
      if (plural) {
        const group = resourceRef.apiVersion.split('/')[0];
        setCrdName(`${plural}.${group}`);
        const parts = resourceRef.apiVersion.split('/');
        const [grp, version] = parts.length === 2 ? parts : ['', parts[0]];
        const path = resourceRef.namespace
          ? `/apis/${grp}/${version}/namespaces/${resourceRef.namespace}/${plural}/${resourceRef.name}`
          : `/apis/${grp}/${version}/${plural}/${resourceRef.name}`;
        try {
          const obj = await ApiProxy.request(path);
          setStatus(extractStatus(obj));
        } catch {
          /* resource may not be accessible */
        }
      }
      setStatusLoading(false);
    });
  }, [resourceRef.apiVersion, resourceRef.kind, resourceRef.name, resourceRef.namespace]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <TreeRow
        depth={depth}
        isLast={isLast}
        badge={isXR ? 'XR' : 'MR'}
        label={`${resourceRef.kind}/${resourceRef.name}`}
        subtitle={resourceRef.namespace}
        name={resourceRef.name}
        namespace={resourceRef.namespace}
        crdName={crdName}
        xrdName={xrdInfo?.xrdName}
        compositionName={xrCompositionName}
        status={status}
        statusLoading={statusLoading}
        expandable={children.length > 0}
        expanded={expanded}
        onToggle={() => setExpanded(e => !e)}
      />
      {expanded &&
        children.map((child, i) => (
          <ResourceNode
            key={`${child.apiVersion}/${refKey(child)}`}
            resourceRef={child}
            depth={depth + 1}
            isLast={i === children.length - 1}
            compositeMap={compositeMap}
            xrdInfoByKind={xrdInfoByKind}
          />
        ))}
    </>
  );
}

// ── CompositeNode — top-level XR under a claim ─────────────────────────────

interface CompositeNodeProps {
  xr: XRObject;
  depth: number;
  isLast: boolean;
  compositeMap: Map<string, XRObject>;
  xrdInfoByKind: Map<string, XrdInfo>;
  showConfig?: boolean;
}

function CompositeNode({
  xr,
  depth,
  isLast,
  compositeMap,
  xrdInfoByKind,
  showConfig,
}: CompositeNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const children: ResourceRef[] = xr.spec?.resourceRefs ?? [];
  const status = extractStatus(xr);
  const crdName = makeCrdName(xr.apiVersion, xr.kind);
  const xrdInfo = xrdInfoByKind.get(xr.kind);
  const compositionName = xr.spec?.compositionRef?.name;

  return (
    <>
      <TreeRow
        depth={depth}
        isLast={isLast}
        badge="XR"
        label={`${xr.kind}/${xr.metadata.name}`}
        subtitle={xr.metadata.namespace}
        name={xr.metadata.name}
        namespace={xr.metadata.namespace}
        crdName={crdName}
        xrdName={xrdInfo?.xrdName}
        compositionName={compositionName}
        configName={showConfig ? xrdInfo?.configName : undefined}
        status={status}
        expandable={children.length > 0}
        expanded={expanded}
        onToggle={() => setExpanded(e => !e)}
      />
      {expanded &&
        children.map((child, i) => (
          <ResourceNode
            key={`${child.apiVersion}/${refKey(child)}`}
            resourceRef={child}
            depth={depth + 1}
            isLast={i === children.length - 1}
            compositeMap={compositeMap}
            xrdInfoByKind={xrdInfoByKind}
          />
        ))}
    </>
  );
}

// ── ClaimNode ──────────────────────────────────────────────────────────────

interface ClaimNodeProps {
  claimRef: { apiVersion: string; kind: string; name: string; namespace: string };
  claimPlural: string;
  composites: XRObject[];
  compositeMap: Map<string, XRObject>;
  xrdInfoByKind: Map<string, XrdInfo>;
}

function ClaimNode({
  claimRef,
  claimPlural,
  composites,
  compositeMap,
  xrdInfoByKind,
}: ClaimNodeProps) {
  const [expanded, setExpanded] = useState(false);
  const [status, setStatus] = useState<NodeStatus>({});
  const [statusLoading, setStatusLoading] = useState(true);

  const group = claimRef.apiVersion.split('/')[0];
  const crdName = `${claimPlural}.${group}`;
  const configName = composites[0] ? xrdInfoByKind.get(composites[0].kind)?.configName : undefined;

  const counts = composites.reduce(
    (acc, xr) => {
      acc.xr += 1;
      const nested = countResources(xr, compositeMap);
      acc.xr += nested.xr;
      acc.mr += nested.mr;
      return acc;
    },
    { xr: 0, mr: 0 }
  );

  useEffect(() => {
    const parts = claimRef.apiVersion.split('/');
    const [grp, version] = parts.length === 2 ? parts : ['', parts[0]];
    const path = `/apis/${grp}/${version}/namespaces/${claimRef.namespace}/${claimPlural}/${claimRef.name}`;
    ApiProxy.request(path)
      .then((obj: { status?: { conditions?: Array<{ type: string; status: string }> } }) =>
        setStatus(extractStatus(obj))
      )
      .catch(() => {
        /* claim may be inaccessible */
      })
      .finally(() => setStatusLoading(false));
  }, [claimRef.apiVersion, claimRef.name, claimRef.namespace, claimPlural]);

  return (
    <>
      <TreeRow
        depth={0}
        isLast={false}
        badge="Claim"
        label={`${claimRef.kind}/${claimRef.name}`}
        subtitle={claimRef.namespace}
        name={claimRef.name}
        namespace={claimRef.namespace}
        crdName={crdName}
        counts={counts}
        configName={configName}
        status={status}
        statusLoading={statusLoading}
        expandable={composites.length > 0}
        expanded={expanded}
        onToggle={() => setExpanded(e => !e)}
      />
      {expanded &&
        composites.map((xr, i) => (
          <CompositeNode
            key={xrKey(xr)}
            xr={xr}
            depth={1}
            isLast={i === composites.length - 1}
            compositeMap={compositeMap}
            xrdInfoByKind={xrdInfoByKind}
          />
        ))}
    </>
  );
}

// ── TraceView ──────────────────────────────────────────────────────────────

interface ClaimGroup {
  claimRef: { apiVersion: string; kind: string; name: string; namespace: string };
  claimPlural: string;
  composites: XRObject[];
}

export function TraceView() {
  const installed = useCrossplaneInstalled();
  const [xrds, xrdsError] = CompositeResourceDefinition.useList();
  const [claimGroups, setClaimGroups] = useState<ClaimGroup[]>([]);
  const [orphanXRs, setOrphanXRs] = useState<XRObject[]>([]);
  const [compositeMap, setCompositeMap] = useState<Map<string, XRObject>>(new Map());
  const [xrdInfoByKind, setXrdInfoByKind] = useState<Map<string, XrdInfo>>(new Map());
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
      const xrdByKind = new Map<string, CompositeResourceDefinition>();
      const infoMap = new Map<string, XrdInfo>();

      for (const xrd of xrds as CompositeResourceDefinition[]) {
        const versions = xrd.jsonData.spec?.versions ?? [];
        const servedVersion = versions.find((v: { served: boolean }) => v.served) ?? versions[0];
        if (!servedVersion) continue;

        const group = xrd.group;
        const version = servedVersion.name;
        const plural = xrd.jsonData.spec?.names?.plural;
        if (!plural) continue;

        xrdByKind.set(xrd.compositeKind, xrd);
        infoMap.set(xrd.compositeKind, {
          xrdName: xrd.getName(),
          configName: xrd.ownerConfiguration,
        });
        pluralCache.set(`${group}/${version}|${xrd.compositeKind}`, plural);

        try {
          const resp = await ApiProxy.request(`/apis/${group}/${version}/${plural}`);
          for (const item of (resp.items ?? []) as XRObject[]) {
            allXRs.push(item);
          }
        } catch {
          /* XRD type may have no instances */
        }
      }

      const cMap = new Map<string, XRObject>();
      for (const xr of allXRs) {
        cMap.set(xrKey(xr), xr);
      }
      setCompositeMap(cMap);

      const claimMap = new Map<string, ClaimGroup>();
      const orphans: XRObject[] = [];

      for (const xr of allXRs) {
        const claimRef = xr.spec?.claimRef;
        if (claimRef) {
          const key = `${claimRef.namespace}/${claimRef.name}`;
          if (!claimMap.has(key)) {
            const xrd = xrdByKind.get(xr.kind);
            const claimPlural = xrd?.claimNames?.plural ?? `${claimRef.kind.toLowerCase()}s`;
            claimMap.set(key, { claimRef, claimPlural, composites: [] });
          }
          claimMap.get(key)!.composites.push(xr);
        } else if (!xr.metadata.ownerReferences?.length) {
          orphans.push(xr);
        }
      }

      setClaimGroups(Array.from(claimMap.values()));
      setOrphanXRs(orphans);
      setXrdInfoByKind(infoMap);
      setLoading(false);
    })();
  }, [xrdKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (xrdsError) {
    if (String(xrdsError).includes('Resource type not found')) {
      return <NotInstalledBanner />;
    }
    return <Typography color="error">Error loading XRDs: {String(xrdsError)}</Typography>;
  }

  if (!xrds || loading) {
    return (
      <Box display="flex" alignItems="center" gap={1} p={3}>
        <CircularProgress size={20} />
        <Typography>Loading trace data...</Typography>
      </Box>
    );
  }

  const isEmpty = claimGroups.length === 0 && orphanXRs.length === 0;

  return (
    <>
      {installed === false && <NotInstalledBanner />}
      <SectionBox title="Trace">
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            py: 0.5,
            px: 1,
            mb: 1,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
            Resource
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ width: 190, px: 0.5 }}>
            XRD
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ width: 190, px: 0.5 }}>
            Composition
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ width: 160, px: 0.5 }}>
            Configuration
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ width: 80, textAlign: 'center' }}
          >
            Synced
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ width: 80, textAlign: 'center' }}
          >
            Ready
          </Typography>
        </Box>

        {isEmpty ? (
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            No composite resources found. Define XRDs and create claims to see the trace view.
          </Typography>
        ) : (
          <>
            {claimGroups.map(group => (
              <ClaimNode
                key={`${group.claimRef.namespace}/${group.claimRef.name}`}
                claimRef={group.claimRef}
                claimPlural={group.claimPlural}
                composites={group.composites}
                compositeMap={compositeMap}
                xrdInfoByKind={xrdInfoByKind}
              />
            ))}

            {orphanXRs.length > 0 && (
              <>
                {claimGroups.length > 0 && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mt: 2, mb: 1, px: 1 }}
                  >
                    Composite Resources (no claim)
                  </Typography>
                )}
                {orphanXRs.map((xr, i) => (
                  <CompositeNode
                    key={xrKey(xr)}
                    xr={xr}
                    depth={0}
                    isLast={i === orphanXRs.length - 1}
                    compositeMap={compositeMap}
                    xrdInfoByKind={xrdInfoByKind}
                    showConfig
                  />
                ))}
              </>
            )}
          </>
        )}
      </SectionBox>
    </>
  );
}
