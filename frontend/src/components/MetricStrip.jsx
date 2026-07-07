import { Box, Stack, Typography } from '@mui/material';
import CloudDoneOutlinedIconModule from '@mui/icons-material/CloudDoneOutlined.js';
import StorageOutlinedIconModule from '@mui/icons-material/StorageOutlined.js';
import TimerOutlinedIconModule from '@mui/icons-material/TimerOutlined.js';
import { resolveMuiIcon } from '../utils/muiIcon.js';

const CloudDoneOutlinedIcon = resolveMuiIcon(CloudDoneOutlinedIconModule);
const StorageOutlinedIcon = resolveMuiIcon(StorageOutlinedIconModule);
const TimerOutlinedIcon = resolveMuiIcon(TimerOutlinedIconModule);

const formatBytes = (bytes) => {
  if (!bytes) {
    return '0 MB';
  }

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

export function MetricStrip({ images }) {
  const totalBytes = images.reduce((sum, image) => sum + (image.fileSize || 0), 0);

  return (
    <Box className="metric-strip">
      <Stack direction="row" spacing={1.25} alignItems="center">
        <CloudDoneOutlinedIcon />
        <Box>
          <Typography fontWeight={800}>{images.length}</Typography>
          <Typography variant="caption" color="text.secondary">
            indexed files
          </Typography>
        </Box>
      </Stack>
      <Stack direction="row" spacing={1.25} alignItems="center">
        <StorageOutlinedIcon />
        <Box>
          <Typography fontWeight={800}>{formatBytes(totalBytes)}</Typography>
          <Typography variant="caption" color="text.secondary">
            original storage
          </Typography>
        </Box>
      </Stack>
      <Stack direction="row" spacing={1.25} alignItems="center">
        <TimerOutlinedIcon />
        <Box>
          <Typography fontWeight={800}>30 min</Typography>
          <Typography variant="caption" color="text.secondary">
            signed URL TTL
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}
