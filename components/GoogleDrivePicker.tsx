import React, { useState, useEffect } from 'react';
import { Search, Loader2, FileText, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { listDriveFiles, DriveFile, getFileContent } from '../services/driveService';

interface GoogleDrivePickerProps {
  onFileSelected: (content: string, fileName: string) => void;
  onClose: () => void;
}

const GoogleDrivePicker: React.FC<GoogleDrivePickerProps> = ({ onFileSelected, onClose }) => {
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageToken, setPageToken] = useState<string | undefined>(undefined);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const fetchFiles = async (token?: string) => {
    if (token) setIsFetchingMore(true);
    else setIsLoading(true);
    
    setError(null);
    try {
      const data = await listDriveFiles(token);
      if (token) {
        setFiles(prev => [...prev, ...data.files]);
      } else {
        setFiles(data.files);
      }
      setPageToken(data.nextPageToken);
    } catch (err: any) {
      setError(err.message || 'Failed to load files from Google Drive');
    } finally {
      setIsLoading(false);
      setIsFetchingMore(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleSelectFile = async (file: DriveFile) => {
    setIsLoading(true);
    try {
      const content = await getFileContent(file);
      onFileSelected(content, file.name);
      onClose();
    } catch (err: any) {
      setError(`Failed to read file: ${err.message}`);
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Select from Google Drive</h2>
            <p className="text-sm text-slate-500">Pick a document to generate an agenda</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && !isFetchingMore ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="animate-spin text-blue-600" size={32} />
              <p className="text-slate-500 font-medium">Connecting to Drive...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-3 border border-red-100">
              <p className="text-sm font-medium">{error}</p>
              <button 
                onClick={() => fetchFiles()}
                className="ml-auto text-xs font-bold uppercase tracking-wider"
              >
                Retry
              </button>
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-20">
              <FileText className="mx-auto text-slate-200 mb-4" size={48} />
              <p className="text-slate-500">No supported documents found in your Drive.</p>
              <p className="text-xs text-slate-400 mt-1">Try uploading a .txt or .md file to your Drive first.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {files.map((file) => (
                <button
                  key={file.id}
                  onClick={() => handleSelectFile(file)}
                  className="flex items-center gap-4 p-4 hover:bg-blue-50 rounded-xl transition-all border border-transparent hover:border-blue-100 group text-left"
                >
                  <div className="w-10 h-10 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                    <FileText size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{file.name}</p>
                    <p className="text-xs text-slate-400 truncate">{file.mimeType.split('/').pop()?.replace('vnd.google-apps.', '')}</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300 group-hover:text-blue-400" />
                </button>
              ))}
              
              {pageToken && (
                <button
                  onClick={() => fetchFiles(pageToken)}
                  disabled={isFetchingMore}
                  className="w-full py-4 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  {isFetchingMore ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Loading more...
                    </>
                  ) : (
                    'Load More'
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleDrivePicker;
