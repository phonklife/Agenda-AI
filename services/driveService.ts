import { getAccessToken } from './authService';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

const getDriveAuthHeader = (): Record<string, string> => {
  const token = getAccessToken();
  if (!token) throw new Error('No access token available');

  return {
    Authorization: 'Bearer ' + token,
  };
};

export const listDriveFiles = async (pageToken?: string): Promise<{ files: DriveFile[], nextPageToken?: string }> => {
  const query = "mimeType = 'text/plain' or mimeType = 'text/markdown' or mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/json'";
  const url = 'https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent(query) + '&pageSize=20&fields=nextPageToken,files(id,name,mimeType)' + (pageToken ? '&pageToken=' + pageToken : '');

  const response = await fetch(url, {
    headers: getDriveAuthHeader(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({} as Record<string, any>));
    throw new Error('Failed to list files: ' + (errorData?.error?.message || 'Unknown Drive error'));
  }

  return response.json();
};

export const getFileContent = async (file: DriveFile): Promise<string> => {
  let url = 'https://www.googleapis.com/drive/v3/files/' + file.id + '?alt=media';

  if (file.mimeType === 'application/vnd.google-apps.document') {
    url = 'https://www.googleapis.com/drive/v3/files/' + file.id + '/export?mimeType=text/plain';
  }

  const response = await fetch(url, {
    headers: getDriveAuthHeader(),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({} as Record<string, any>));
    throw new Error('Failed to fetch file content: ' + (errorData?.error?.message || 'Unknown Drive error'));
  }

  return response.text();
};
