import Chip from '@mui/material/Chip';
import React from 'react';

interface StatusChipProps {
  status: boolean | null | undefined;
  trueLabel?: string;
  falseLabel?: string;
  unknownLabel?: string;
}

export function StatusChip({
  status,
  trueLabel = 'Healthy',
  falseLabel = 'Unhealthy',
  unknownLabel = 'Unknown',
}: StatusChipProps) {
  if (status === null || status === undefined) {
    return <Chip label={unknownLabel} size="small" color="default" variant="outlined" />;
  }

  return (
    <Chip
      label={status ? trueLabel : falseLabel}
      size="small"
      color={status ? 'success' : 'error'}
      variant="filled"
    />
  );
}

interface ReadyChipProps {
  ready: boolean | null | undefined;
}

export function ReadyChip({ ready }: ReadyChipProps) {
  return <StatusChip status={ready} trueLabel="Ready" falseLabel="Not Ready" />;
}
