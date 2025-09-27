/**
 * Enhanced Voice Recording Interface Component
 * Comprehensive audio recording with quality analysis, file upload, and Vercel Blob storage
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic, MicOff, Play, Pause, Square, RotateCcw, Upload, Download, Volume2,
  FileAudio, AlertTriangle, CheckCircle, Loader2, Waveform, Settings,
  HelpCircle, X, File, Trash2
} from 'lucide-react';

import { Card, Button, Badge, LoadingSpinner } from '@/components/ui';
import { VoiceRecordingData, Task } from '@/types';
import { cn } from '@/lib/utils';
import {
  uploadAudioFile,
  getAudioDuration,
  analyzeAudioQuality,
  checkAudioSupport,
  type UploadProgress,
  type AudioQualityMetrics
} from '@/lib/storage';

interface VoiceRecordingInterfaceProps {
  task: Task;
  onSubmit: (data: VoiceRecordingData) => Promise<void>;
  isSubmitting?: boolean;
  className?: string;
}

type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';
type UploadState = 'idle' | 'uploading' | 'uploaded' | 'failed';
type AudioSource = 'recorded' | 'uploaded';

interface AudioFile {
  blob: Blob;
  url: string;
  name: string;
  duration: number;
  size: number;
  format: string;
  source: AudioSource;
}

interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export const VoiceRecordingInterface: React.FC<VoiceRecordingInterfaceProps> = ({
  task,
  onSubmit,
  isSubmitting = false,
  className,
}) => {
  // Recording state
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [audioFile, setAudioFile] = useState<AudioFile | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  // Upload state
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({ loaded: 0, total: 0, percentage: 0 });
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);

  // Transcription state
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [speechRecognition, setSpeechRecognition] = useState<SpeechRecognition | null>(null);
  const [liveTranscript, setLiveTranscript] = useState('');

  // Quality analysis
  const [qualityMetrics, setQualityMetrics] = useState<AudioQualityMetrics | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Audio settings
  const [audioFormat, setAudioFormat] = useState<'webm' | 'wav'>('webm');
  const [enableNoiseSupression, setEnableNoiseSupression] = useState(true);
  const [enableEchoCancellation, setEnableEchoCancellation] = useState(true);

  // Browser support
  const [browserSupport] = useState(() => checkAudioSupport());

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const waveformIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (browserSupport.speechRecognition) {
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript);
        }
        setLiveTranscript(interimTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error !== 'no-speech') {
          setError(`Speech recognition error: ${event.error}`);
        }
      };

      setSpeechRecognition(recognition);
    }
  }, [browserSupport.speechRecognition]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
      if (speechRecognition) {
        speechRecognition.stop();
      }
      if (waveformIntervalRef.current) {
        clearInterval(waveformIntervalRef.current);
      }
    };
  }, [speechRecognition]);

  // Enhanced audio level monitoring with waveform data
  const startAudioLevelMonitoring = useCallback((stream: MediaStream) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyzer = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);

    analyzer.fftSize = 2048;
    analyzer.smoothingTimeConstant = 0.8;
    microphone.connect(analyzer);

    audioContextRef.current = audioContext;
    analyzerRef.current = analyzer;

    const dataArray = new Uint8Array(analyzer.frequencyBinCount);
    const waveformArray = new Uint8Array(analyzer.fftSize);

    const updateLevel = () => {
      if (recordingState === 'recording') {
        // Get frequency data for level
        analyzer.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        setAudioLevel(average / 255);

        // Get time domain data for waveform
        analyzer.getByteTimeDomainData(waveformArray);
        const waveform = Array.from(waveformArray.slice(0, 64)).map(value => (value - 128) / 128);
        setWaveformData(waveform);

        requestAnimationFrame(updateLevel);
      }
    };

    updateLevel();

    // Start live transcription if enabled
    if (speechRecognition && transcript === '') {
      try {
        speechRecognition.start();
      } catch (error) {
        console.warn('Could not start speech recognition:', error);
      }
    }
  }, [recordingState, speechRecognition, transcript]);

  // File upload handlers
  const handleFileUpload = useCallback(async (file: File) => {
    setError(null);
    setUploadState('uploading');

    try {
      // Validate file
      const maxSize = 50 * 1024 * 1024; // 50MB
      const allowedTypes = ['audio/webm', 'audio/wav', 'audio/mp4', 'audio/mpeg', 'audio/ogg'];

      if (file.size > maxSize) {
        throw new Error(`File size (${formatFileSize(file.size)}) exceeds 50MB limit`);
      }

      if (!allowedTypes.includes(file.type)) {
        throw new Error(`File type ${file.type} not supported. Use: ${allowedTypes.join(', ')}`);
      }

      // Get audio duration
      const duration = await getAudioDuration(file);

      if (duration < 5) {
        throw new Error('Audio must be at least 5 seconds long');
      }

      if (duration > 300) { // 5 minutes
        throw new Error('Audio must be less than 5 minutes long');
      }

      // Upload to Vercel Blob Storage
      const result = await uploadAudioFile(file, `task-${task.id}-${Date.now()}.${file.name.split('.').pop()}`, {
        onProgress: setUploadProgress,
        maxSize,
        allowedFormats: allowedTypes,
      });

      // Create audio file object
      const audioFileObj: AudioFile = {
        blob: file,
        url: URL.createObjectURL(file),
        name: file.name,
        duration,
        size: file.size,
        format: file.type,
        source: 'uploaded'
      };

      setAudioFile(audioFileObj);
      setUploadedFileUrl(result.url);
      setUploadState('uploaded');
      setDuration(duration);

      // Analyze quality
      setIsAnalyzing(true);
      const quality = await analyzeAudioQuality(file);
      setQualityMetrics(quality);
      setIsAnalyzing(false);

    } catch (error) {
      console.error('File upload failed:', error);
      setError(error instanceof Error ? error.message : 'Upload failed');
      setUploadState('failed');
    }
  }, [task.id]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const audioFile = files.find(file => file.type.startsWith('audio/'));

    if (audioFile) {
      handleFileUpload(audioFile);
    } else {
      setError('Please drop an audio file');
    }
  }, [handleFileUpload]);

  const startRecording = async () => {
    try {
      setError(null);

      // Check browser support
      if (!browserSupport.mediaRecorder) {
        throw new Error('MediaRecorder not supported in this browser');
      }

      if (!browserSupport.getUserMedia) {
        throw new Error('getUserMedia not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: enableEchoCancellation,
          noiseSuppression: enableNoiseSupression,
          autoGainControl: true,
          sampleRate: 44100,
          channelCount: 1,
        },
      });

      streamRef.current = stream;

      // Determine the best available format
      const mimeType = getMimeType(audioFormat);
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        throw new Error(`Audio format ${audioFormat} not supported`);
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: audioFormat === 'wav' ? 128000 : 64000,
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const duration = await getAudioDuration(blob);

        const audioFileObj: AudioFile = {
          blob,
          url,
          name: `recording-${Date.now()}.${audioFormat}`,
          duration,
          size: blob.size,
          format: mimeType,
          source: 'recorded'
        };

        setAudioFile(audioFileObj);
        setRecordingState('stopped');

        // Stop live transcription
        if (speechRecognition) {
          speechRecognition.stop();
        }

        // Analyze quality
        setIsAnalyzing(true);
        try {
          const quality = await analyzeAudioQuality(blob, stream);
          setQualityMetrics(quality);
        } catch (error) {
          console.warn('Quality analysis failed:', error);
        }
        setIsAnalyzing(false);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms

      setRecordingState('recording');
      setDuration(0);
      setTranscript('');
      setLiveTranscript('');

      // Start audio level monitoring
      startAudioLevelMonitoring(stream);

      // Start timer
      intervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
      setError(error instanceof Error ? error.message : 'Failed to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && (recordingState === 'recording' || recordingState === 'paused')) {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (speechRecognition) {
      speechRecognition.stop();
    }

    setAudioLevel(0);
    setWaveformData([]);
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (speechRecognition) {
        speechRecognition.stop();
      }
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');

      // Resume timer
      intervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

      // Resume transcription
      if (speechRecognition) {
        try {
          speechRecognition.start();
        } catch (error) {
          console.warn('Could not resume speech recognition:', error);
        }
      }
    }
  };

  const resetRecording = () => {
    stopRecording();
    setRecordingState('idle');
    setDuration(0);
    setAudioFile(null);
    setPlaybackTime(0);
    setIsPlaying(false);
    setTranscript('');
    setLiveTranscript('');
    setQualityMetrics(null);
    setUploadState('idle');
    setUploadedFileUrl(null);
    setError(null);
  };

  const playAudio = () => {
    if (audioRef.current && audioFile) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const generateTranscript = async () => {
    if (!audioFile) return;

    setIsTranscribing(true);
    setError(null);

    try {
      // If we already have live transcript, use it
      if (transcript.trim()) {
        setIsTranscribing(false);
        return;
      }

      // Try Web Speech API for offline transcription
      if (browserSupport.speechRecognition) {
        try {
          const transcriptResult = await transcribeAudioFile(audioFile.blob);
          setTranscript(transcriptResult);
        } catch (speechError) {
          console.warn('Web Speech API failed, using mock transcript:', speechError);
          // Fallback to mock transcription
          await new Promise(resolve => setTimeout(resolve, 2000));
          setTranscript("This is a mock transcription of the recorded audio. In a real implementation, this would connect to a transcription service like OpenAI Whisper, Google Speech-to-Text, or Azure Speech Services.");
        }
      } else {
        // Mock transcription for browsers without speech recognition
        await new Promise(resolve => setTimeout(resolve, 2000));
        setTranscript("This is a mock transcription. Your browser doesn't support the Web Speech API. In a production app, this would use a server-side transcription service.");
      }
    } catch (error) {
      console.error('Transcription failed:', error);
      setError('Failed to generate transcript. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  // Transcribe audio file using Web Speech API (fallback method)
  const transcribeAudioFile = async (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!browserSupport.speechRecognition) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      const audio = new Audio(URL.createObjectURL(blob));
      const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      let finalTranscript = '';
      let timeout: NodeJS.Timeout;

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript + ' ';
          }
        }
      };

      recognition.onend = () => {
        clearTimeout(timeout);
        resolve(finalTranscript.trim() || 'No speech detected in audio');
      };

      recognition.onerror = (event: any) => {
        clearTimeout(timeout);
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      // Start recognition and play audio
      recognition.start();
      audio.play();

      // Timeout after audio duration + 2 seconds
      timeout = setTimeout(() => {
        recognition.stop();
        audio.pause();
      }, (audioFile?.duration || 30) * 1000 + 2000);
    });
  };

  const downloadAudio = () => {
    if (audioFile) {
      const a = document.createElement('a');
      a.href = audioFile.url;
      a.download = audioFile.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const deleteAudio = () => {
    if (audioFile?.url) {
      URL.revokeObjectURL(audioFile.url);
    }
    resetRecording();
  };

  const handleSubmit = async () => {
    if (!audioFile) return;

    setError(null);

    try {
      let finalAudioUrl = uploadedFileUrl;

      // Upload recorded audio if not already uploaded
      if (audioFile.source === 'recorded' && !uploadedFileUrl) {
        setUploadState('uploading');
        const result = await uploadAudioFile(
          audioFile.blob,
          audioFile.name,
          {
            onProgress: setUploadProgress,
            maxSize: 50 * 1024 * 1024,
            allowedFormats: ['audio/webm', 'audio/wav', 'audio/mp4', 'audio/mpeg', 'audio/ogg'],
          }
        );
        finalAudioUrl = result.url;
        setUploadedFileUrl(result.url);
        setUploadState('uploaded');
      }

      if (!finalAudioUrl) {
        throw new Error('No audio URL available for submission');
      }

      const submissionData: VoiceRecordingData = {
        audio_url: finalAudioUrl,
        duration_seconds: Math.round(audioFile.duration),
        transcript: transcript.trim() || undefined,
        audio_quality_score: qualityMetrics?.score || 3,
        background_noise_level: qualityMetrics?.backgroundNoiseLevel || 'medium',
      };

      await onSubmit(submissionData);
    } catch (error) {
      console.error('Failed to submit recording:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit recording');
      setUploadState('failed');
    }
  };

  // Handle audio playback events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !audioFile) return;

    const updatePlaybackTime = () => setPlaybackTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setPlaybackTime(0);
    };

    audio.addEventListener('timeupdate', updatePlaybackTime);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', () => {
      // Ensure audio element duration matches our stored duration
      if (Math.abs(audio.duration - audioFile.duration) > 1) {
        console.warn('Audio duration mismatch:', audio.duration, 'vs', audioFile.duration);
      }
    });

    return () => {
      audio.removeEventListener('timeupdate', updatePlaybackTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioFile]);

  // Utility functions
  const getMimeType = (format: 'webm' | 'wav'): string => {
    const mimeTypes = {
      webm: 'audio/webm;codecs=opus',
      wav: 'audio/wav',
    };
    return mimeTypes[format];
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getRecordingStateColor = () => {
    switch (recordingState) {
      case 'recording': return 'text-red-400';
      case 'paused': return 'text-yellow-400';
      case 'stopped': return 'text-green-400';
      default: return 'text-white/60';
    }
  };

  const getRecordingStateText = () => {
    switch (recordingState) {
      case 'recording': return 'Recording...';
      case 'paused': return 'Paused';
      case 'stopped': return 'Recording Complete';
      default: return audioFile ? 'Audio Ready' : 'Ready to Record';
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 4) return 'text-green-400';
    if (score >= 3) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getQualityText = (score: number) => {
    if (score >= 4) return 'Excellent';
    if (score >= 3) return 'Good';
    if (score >= 2) return 'Fair';
    return 'Poor';
  };

  const canSubmit = audioFile && audioFile.duration >= 5 && !isSubmitting;
  const showWaveform = recordingState === 'recording' && waveformData.length > 0;
  const hasAudio = audioFile !== null;
  const isUploading = uploadState === 'uploading';
  const isUploaded = uploadState === 'uploaded' || uploadedFileUrl !== null;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Task Instructions */}
      <Card variant="elevated">
        <Card.Header
          title="Voice Recording Task"
          subtitle="Record clear audio as specified in the task requirements"
        />
        <Card.Content>
          <p className="text-white/80 text-sm leading-relaxed">
            {task.instructions}
          </p>

          <div className="mt-4 flex items-center gap-4 text-sm">
            <Badge variant="info" size="sm">
              Minimum: 30 seconds
            </Badge>
            <Badge variant="info" size="sm">
              Maximum: 5 minutes
            </Badge>
            <Badge variant="info" size="sm">
              Quality: High
            </Badge>
          </div>
        </Card.Content>
      </Card>

      {/* Recording Interface */}
      <Card variant="elevated">
        <Card.Content>
          <div className="text-center space-y-6">
            {/* Recording Status */}
            <div className="space-y-2">
              <div className={cn('text-2xl font-mono', getRecordingStateColor())}>
                {Math.floor(duration / 60).toString().padStart(2, '0')}:
                {(duration % 60).toString().padStart(2, '0')}
              </div>
              <p className={cn('text-sm', getRecordingStateColor())}>
                {getRecordingStateText()}
              </p>
            </div>

            {/* Audio Level Visualizer */}
            {recordingState === 'recording' && (
              <div className="flex justify-center items-end gap-1 h-16">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-2 bg-[rgb(25,137,251)] rounded-t"
                    style={{
                      height: `${Math.max(4, audioLevel * 60 + Math.random() * 20)}px`,
                      opacity: 0.3 + audioLevel * 0.7,
                    }}
                  />
                ))}
              </div>
            )}

            {/* Recording Controls */}
            <div className="flex justify-center gap-4">
              {recordingState === 'idle' && (
                <Button
                  size="lg"
                  variant="primary"
                  onClick={startRecording}
                  leftIcon={<Mic className="w-5 h-5" />}
                >
                  Start Recording
                </Button>
              )}

              {recordingState === 'recording' && (
                <>
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={pauseRecording}
                    leftIcon={<Pause className="w-5 h-5" />}
                  >
                    Pause
                  </Button>
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={stopRecording}
                    leftIcon={<Square className="w-5 h-5" />}
                  >
                    Stop
                  </Button>
                </>
              )}

              {recordingState === 'paused' && (
                <>
                  <Button
                    size="lg"
                    variant="primary"
                    onClick={resumeRecording}
                    leftIcon={<Mic className="w-5 h-5" />}
                  >
                    Resume
                  </Button>
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={stopRecording}
                    leftIcon={<Square className="w-5 h-5" />}
                  >
                    Stop
                  </Button>
                </>
              )}

              {recordingState === 'stopped' && (
                <Button
                  size="lg"
                  variant="ghost"
                  onClick={resetRecording}
                  leftIcon={<RotateCcw className="w-5 h-5" />}
                >
                  New Recording
                </Button>
              )}
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Audio Playback */}
      {audioUrl && (
        <Card variant="elevated">
          <Card.Header
            title="Recording Playback"
            subtitle="Review your recording before submitting"
          />
          <Card.Content>
            <div className="space-y-4">
              {/* Audio Element */}
              <audio ref={audioRef} src={audioUrl} />

              {/* Playback Controls */}
              <div className="flex items-center justify-center gap-4">
                <Button
                  variant="secondary"
                  onClick={playAudio}
                  leftIcon={isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                >
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>

                <div className="text-sm text-white/60">
                  {Math.floor(playbackTime / 60).toString().padStart(2, '0')}:
                  {(Math.floor(playbackTime) % 60).toString().padStart(2, '0')} /
                  {' '}{Math.floor(duration / 60).toString().padStart(2, '0')}:
                  {(duration % 60).toString().padStart(2, '0')}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={downloadAudio}
                  leftIcon={<Download className="w-4 h-4" />}
                >
                  Download
                </Button>
              </div>

              {/* Transcript Generation */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-white font-medium">Auto Transcript</h4>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={generateTranscript}
                    disabled={isTranscribing}
                    loading={isTranscribing}
                    leftIcon={<Volume2 className="w-4 h-4" />}
                  >
                    {transcript ? 'Regenerate' : 'Generate'}
                  </Button>
                </div>

                {transcript && (
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <p className="text-white/80 text-sm leading-relaxed">
                      {transcript}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Submit Button */}
      {audioBlob && duration >= 30 && (
        <div className="flex justify-center">
          <Button
            size="lg"
            disabled={isSubmitting}
            loading={isSubmitting}
            onClick={handleSubmit}
            leftIcon={<Upload className="w-4 h-4" />}
          >
            Submit Recording
          </Button>
        </div>
      )}

      {/* Recording Requirements */}
      {duration > 0 && duration < 30 && (
        <Card variant="outlined">
          <Card.Content>
            <div className="flex items-center gap-3 text-yellow-400">
              <MicOff className="w-5 h-5" />
              <div>
                <p className="font-medium">Recording too short</p>
                <p className="text-sm text-white/60">
                  Please record for at least 30 seconds (currently {duration}s)
                </p>
              </div>
            </div>
          </Card.Content>
        </Card>
      )}
    </div>
  );
};

export default VoiceRecordingInterface;