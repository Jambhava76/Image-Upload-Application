import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Chip,
  Skeleton,
  Stack,
  Tooltip,
  Typography
} from '@mui/material';
import DeleteOutlineOutlinedIconModule from '@mui/icons-material/DeleteOutlineOutlined.js';
import OpenInNewOutlinedIconModule from '@mui/icons-material/OpenInNewOutlined.js';
import PhotoLibraryOutlinedIconModule from '@mui/icons-material/PhotoLibraryOutlined.js';
import { resolveMuiIcon } from '../utils/muiIcon.js';

const DeleteOutlineOutlinedIcon = resolveMuiIcon(DeleteOutlineOutlinedIconModule);
const OpenInNewOutlinedIcon = resolveMuiIcon(OpenInNewOutlinedIconModule);
const PhotoLibraryOutlinedIcon = resolveMuiIcon(PhotoLibraryOutlinedIconModule);

const formatBytes = (bytes) => {
  if (!bytes) {
    return '0 KB';
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
};

const formatDate = (value) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));

function GallerySkeleton() {
  return Array.from({ length: 6 }, (_, index) => (
    <Card key={index} className="image-card">
      <Skeleton variant="rectangular" className="image-skeleton" />
      <CardContent>
        <Skeleton width="70%" />
        <Skeleton width="45%" />
      </CardContent>
    </Card>
  ));
}

export function ImageGallery({ images, loading, error, onDelete }) {
  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!loading && images.length === 0) {
    return (
      <Box className="empty-gallery">
        <PhotoLibraryOutlinedIcon />
        <Typography fontWeight={750}>No images found</Typography>
        <Typography color="text.secondary" variant="body2">
          Upload a file or adjust the search term.
        </Typography>
      </Box>
    );
  }

  return (
    <Box className="gallery-grid">
      {loading ? (
        <GallerySkeleton />
      ) : (
        images.map((image) => (
          <Card key={image.id} className="image-card">
            <CardMedia
              component="img"
              image={image.thumbnailURL || image.imageURL}
              alt={image.imageName}
              className="gallery-image"
              loading="lazy"
            />
            <CardContent className="image-card-content">
              <Tooltip title={image.imageName}>
                <Typography fontWeight={750} noWrap>
                  {image.imageName}
                </Typography>
              </Tooltip>
              <Typography variant="body2" color="text.secondary">
                {formatDate(image.uploadedAt)}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip label={formatBytes(image.fileSize)} size="small" />
                <Chip label={image.contentType?.replace('image/', '').toUpperCase()} size="small" />
              </Stack>
            </CardContent>
            <CardActions className="image-actions">
              <Button
                component="a"
                href={image.imageURL}
                target="_blank"
                rel="noreferrer"
                size="small"
                startIcon={<OpenInNewOutlinedIcon />}
              >
                Open
              </Button>
              <Button
                color="error"
                size="small"
                startIcon={<DeleteOutlineOutlinedIcon />}
                onClick={() => onDelete(image)}
              >
                Delete
              </Button>
            </CardActions>
          </Card>
        ))
      )}
    </Box>
  );
}
