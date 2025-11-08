import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { cards as cardsAPI } from '../utils/api';
import { 
  Upload, 
  FileText, 
  Check, 
  X, 
  Loader, 
  Download,
  Eye,
  AlertTriangle,
  Zap,
  Settings,
  Play,
  Pause,
  SkipForward
} from 'lucide-react';
import toast from 'react-hot-toast';

const BatchProcessor = ({ onComplete }) => {
  const [files, setFiles] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [processingStats, setProcessingStats] = useState({ 
    total: 0, 
    completed: 0, 
    failed: 0, 
    avgTime: 0 
  });
  const [advancedSettings, setAdvancedSettings] = useState({
    aiModel: 'gpt-4-vision-preview',
    extractionMode: 'comprehensive',
    confidence: 0.8,
    validateData: true,
    autoCorrect: true,
    customPrompt: ''
  });
  const [showSettings, setShowSettings] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  const processingRef = useRef(false);
  const startTimeRef = useRef(null);

  const onDrop = useCallback((acceptedFiles) => {
    const newFiles = acceptedFiles.map((file, index) => ({
      id: Date.now() + index,
      file,
      status: 'pending', // pending, processing, completed, failed
      result: null,
      error: null,
      processingTime: 0
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']
    },
    multiple: true,
    disabled: processing
  });

  const removeFile = (fileId) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const processNextFile = async () => {
    if (processingRef.current === false || isPaused) return;

    const nextFile = files.find(f => f.status === 'pending');
    if (!nextFile) {
      // Processing complete
      setProcessing(false);
      processingRef.current = false;
      const totalTime = Date.now() - startTimeRef.current;
      const avgTime = totalTime / files.filter(f => f.status !== 'pending').length;
      
      setProcessingStats(prev => ({
        ...prev,
        avgTime: Math.round(avgTime)
      }));
      
      toast.success(`Batch processing complete! Processed ${files.length} files`);
      if (onComplete) onComplete(results);
      return;
    }

    // Update file status to processing
    setFiles(prev => prev.map(f => 
      f.id === nextFile.id 
        ? { ...f, status: 'processing' }
        : f
    ));
    setCurrentIndex(files.findIndex(f => f.id === nextFile.id));

    try {
      const fileStartTime = Date.now();
      
      // Create FormData for the API call
      const formData = new FormData();
      formData.append('image', nextFile.file);
      
      // Add advanced settings if admin
      if (advancedSettings.customPrompt) {
        formData.append('customPrompt', advancedSettings.customPrompt);
      }
      formData.append('extractionMode', advancedSettings.extractionMode);
      formData.append('confidence', advancedSettings.confidence);
      formData.append('validateData', advancedSettings.validateData);
      formData.append('autoCorrect', advancedSettings.autoCorrect);

      const response = await cardsAPI.process(formData);
      const processingTime = Date.now() - fileStartTime;

      // Update file with successful result
      setFiles(prev => prev.map(f => 
        f.id === nextFile.id 
          ? { 
              ...f, 
              status: 'completed', 
              result: response.data.data,
              processingTime 
            }
          : f
      ));

      setResults(prev => [...prev, {
        file: nextFile.file,
        data: response.data.data,
        processingTime
      }]);

      setProcessingStats(prev => ({
        ...prev,
        completed: prev.completed + 1
      }));

    } catch (error) {
      console.error('Failed to process file:', error);
      
      // Update file with error
      setFiles(prev => prev.map(f => 
        f.id === nextFile.id 
          ? { 
              ...f, 
              status: 'failed', 
              error: error.response?.data?.error || 'Processing failed'
            }
          : f
      ));

      setProcessingStats(prev => ({
        ...prev,
        failed: prev.failed + 1
      }));
    }

    // Continue with next file after a short delay
    setTimeout(() => {
      if (processingRef.current && !isPaused) {
        processNextFile();
      }
    }, 100);
  };

  const startBatchProcessing = async () => {
    if (files.length === 0) {
      toast.error('No files to process');
      return;
    }

    setProcessing(true);
    processingRef.current = true;
    startTimeRef.current = Date.now();
    setProcessingStats({ 
      total: files.length, 
      completed: 0, 
      failed: 0, 
      avgTime: 0 
    });
    
    processNextFile();
  };

  const pauseProcessing = () => {
    setIsPaused(true);
    toast.info('Processing paused');
  };

  const resumeProcessing = () => {
    setIsPaused(false);
    toast.info('Processing resumed');
    processNextFile();
  };

  const stopProcessing = () => {
    setProcessing(false);
    processingRef.current = false;
    setIsPaused(false);
    toast.info('Processing stopped');
  };

  const exportResults = () => {
    const csvContent = results.map(result => ({
      filename: result.file.name,
      name: result.data.data.name || '',
      company: result.data.data.company || '',
      title: result.data.data.title || '',
      phone: result.data.data.phoneNumbers?.[0] || '',
      email: result.data.data.emails?.[0] || '',
      website: result.data.data.website || '',
      address: result.data.data.address?.full || '',
      processingTime: result.processingTime
    }));
    
    const csvStr = [
      Object.keys(csvContent[0]).join(','),
      ...csvContent.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csvStr], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch-extraction-${new Date().getTime()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-gray-500 bg-gray-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'completed': return 'text-green-600 bg-green-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-500 bg-gray-100';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <FileText className="h-4 w-4" />;
      case 'processing': return <Loader className="h-4 w-4 animate-spin" />;
      case 'completed': return <Check className="h-4 w-4" />;
      case 'failed': return <X className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Advanced Settings Panel */}
      {showSettings && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              Advanced Extraction Settings
            </h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Extraction Mode
                </label>
                <select
                  value={advancedSettings.extractionMode}
                  onChange={(e) => setAdvancedSettings(prev => ({
                    ...prev,
                    extractionMode: e.target.value
                  }))}
                  className="input"
                >
                  <option value="comprehensive">Comprehensive (Slower, More Accurate)</option>
                  <option value="standard">Standard (Balanced)</option>
                  <option value="fast">Fast (Quick, Basic Info)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Confidence ({(advancedSettings.confidence * 100).toFixed(0)}%)
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="0.95"
                  step="0.05"
                  value={advancedSettings.confidence}
                  onChange={(e) => setAdvancedSettings(prev => ({
                    ...prev,
                    confidence: parseFloat(e.target.value)
                  }))}
                  className="w-full"
                />
              </div>
              
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={advancedSettings.validateData}
                    onChange={(e) => setAdvancedSettings(prev => ({
                      ...prev,
                      validateData: e.target.checked
                    }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Validate extracted data</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={advancedSettings.autoCorrect}
                    onChange={(e) => setAdvancedSettings(prev => ({
                      ...prev,
                      autoCorrect: e.target.checked
                    }))}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Auto-correct common errors</span>
                </label>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Custom Extraction Prompt (Optional)
                </label>
                <textarea
                  value={advancedSettings.customPrompt}
                  onChange={(e) => setAdvancedSettings(prev => ({
                    ...prev,
                    customPrompt: e.target.value
                  }))}
                  placeholder="Additional instructions for AI extraction..."
                  className="input h-20 resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Zap className="h-5 w-5 mr-2 text-yellow-500" />
              Batch Card Processing
            </h3>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="btn-secondary text-sm"
            >
              <Settings className="h-4 w-4 mr-2" />
              {showSettings ? 'Hide' : 'Show'} Settings
            </button>
          </div>
        </div>
        <div className="card-body">
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
              isDragActive 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            } ${processing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <input {...getInputProps()} />
            <div className="space-y-4">
              <div className="mx-auto h-16 w-16 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                <Upload className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-medium text-gray-900">
                  {isDragActive ? 'Drop files here' : 'Upload multiple business cards'}
                </p>
                <p className="text-gray-600">Drag & drop or click to select files</p>
                <p className="text-sm text-gray-500 mt-2">
                  Supports PNG, JPG, JPEG, GIF, BMP, WebP (up to 10MB each)
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Processing Stats & Controls */}
      {files.length > 0 && (
        <div className="card">
          <div className="card-body">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Processing Queue ({files.length} files)
                </h3>
                {processing && (
                  <div className="flex items-center space-x-2 text-sm text-gray-600">
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>Processing... ({processingStats.completed + processingStats.failed}/{processingStats.total})</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center space-x-2">
                {!processing ? (
                  <button
                    onClick={startBatchProcessing}
                    className="btn-primary"
                    disabled={files.length === 0}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Processing
                  </button>
                ) : (
                  <div className="flex space-x-2">
                    {!isPaused ? (
                      <button onClick={pauseProcessing} className="btn-secondary">
                        <Pause className="h-4 w-4 mr-2" />
                        Pause
                      </button>
                    ) : (
                      <button onClick={resumeProcessing} className="btn-primary">
                        <Play className="h-4 w-4 mr-2" />
                        Resume
                      </button>
                    )}
                    <button onClick={stopProcessing} className="btn-secondary">
                      <SkipForward className="h-4 w-4 mr-2" />
                      Stop
                    </button>
                  </div>
                )}
                
                {results.length > 0 && (
                  <button
                    onClick={exportResults}
                    className="btn-secondary"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export CSV
                  </button>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {processing && processingStats.total > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Progress</span>
                  <span>{Math.round(((processingStats.completed + processingStats.failed) / processingStats.total) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${((processingStats.completed + processingStats.failed) / processingStats.total) * 100}%`
                    }}
                  ></div>
                </div>
              </div>
            )}

            {/* Files List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {files.map((fileItem, index) => (
                <div
                  key={fileItem.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
                    currentIndex === index && processing
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${getStatusColor(fileItem.status)}`}>
                      {getStatusIcon(fileItem.status)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {fileItem.file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(fileItem.file.size / 1024 / 1024).toFixed(2)} MB
                        {fileItem.processingTime > 0 && (
                          <span> • Processed in {fileItem.processingTime}ms</span>
                        )}
                      </p>
                      {fileItem.error && (
                        <p className="text-xs text-red-600 flex items-center mt-1">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          {fileItem.error}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {fileItem.result && (
                      <button
                        onClick={() => console.log('View result:', fileItem.result)}
                        className="p-1 text-blue-600 hover:text-blue-800"
                        title="View Results"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    {!processing && (
                      <button
                        onClick={() => removeFile(fileItem.id)}
                        className="p-1 text-red-600 hover:text-red-800"
                        title="Remove File"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {results.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900">Processing Results</h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{processingStats.completed}</div>
                <div className="text-sm text-gray-500">Successful</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{processingStats.failed}</div>
                <div className="text-sm text-gray-500">Failed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{processingStats.avgTime}ms</div>
                <div className="text-sm text-gray-500">Avg Time</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-purple-600">{Math.round((processingStats.completed / (processingStats.completed + processingStats.failed)) * 100)}%</div>
                <div className="text-sm text-gray-500">Success Rate</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchProcessor;