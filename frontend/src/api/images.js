import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 60000
});

export const fetchImages = async (search = '') => {
  const { data } = await api.get('/images', {
    params: search ? { search } : undefined
  });
  return data;
};

export const fetchImage = async (id) => {
  const { data } = await api.get(`/image/${id}`);
  return data;
};

export const uploadImage = async (file, onProgress) => {
  const formData = new FormData();
  formData.append('image', file);

  const { data } = await api.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    },
    onUploadProgress: (event) => {
      if (!event.total) {
        return;
      }

      onProgress?.(Math.round((event.loaded * 100) / event.total));
    }
  });

  return data;
};

export const deleteImage = async (id) => {
  const { data } = await api.delete(`/image/${id}`);
  return data;
};
