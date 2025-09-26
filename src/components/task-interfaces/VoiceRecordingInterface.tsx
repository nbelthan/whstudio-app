/**
 * Voice Recording Interface Component
 * Allows users to record audio for transcription and voice-related tasks
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, MicOff, Play, Pause, Square, RotateCcw, Upload, Download, Volume2 } from 'lucide-react';

import { Card, Button, Badge, LoadingSpinner } from '@/components/ui';
import { VoiceRecordingData, Task } from '@/types';
import { cn, formatDuration } from '@/lib/utils';

interface VoiceRecordingInterfaceProps {
  task: Task;
  onSubmit: (data: VoiceRecordingData) => Promise<void>;
  isSubmitting?: boolean;
  className?: string;
}

type RecordingState = 'idle' | 'recording' | 'paused' | 'stopped';

export const VoiceRecordingInterface: React.FC<VoiceRecordingInterfaceProps> = ({
  task,
  onSubmit,
  isSubmitting = false,
  className,
}) => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [transcript, setTranscript] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

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
    };
  }, []);

  // Audio level monitoring
  const startAudioLevelMonitoring = useCallback((stream: MediaStream) => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyzer = audioContext.createAnalyser();
    const microphone = audioContext.createMediaStreamSource(stream);

    analyzer.fftSize = 256;
    microphone.connect(analyzer);

    audioContextRef.current = audioContext;
    analyzerRef.current = analyzer;

    const dataArray = new Uint8Array(analyzer.frequencyBinCount);

    const updateLevel = () => {
      if (recordingState === 'recording') {
        analyzer.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        setAudioLevel(average / 255);
        requestAnimationFrame(updateLevel);
      }
    };

    updateLevel();
  }, [recordingState]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      const chunks: BlobPart[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm;codecs=opus' });
        const url = URL.createObjectURL(blob);

        setAudioBlob(blob);
        setAudioUrl(url);
        setRecordingState('stopped');
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100); // Collect data every 100ms

      setRecordingState('recording');
      setDuration(0);

      // Start audio level monitoring
      startAudioLevelMonitoring(stream);

      // Start timer
      intervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Failed to access microphone. Please ensure microphone permissions are granted.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setAudioLevel(0);
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
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
    }
  };

  const resetRecording = () => {
    stopRecording();
    setRecordingState('idle');
    setDuration(0);
    setAudioUrl(null);
    setAudioBlob(null);
    setPlaybackTime(0);
    setIsPlaying(false);
    setTranscript('');
  };

  const playAudio = () => {
    if (audioRef.current && audioUrl) {
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
    if (!audioBlob) return;

    setIsTranscribing(true);

    try {
      // Mock transcription - in real app, this would use a transcription API
      await new Promise(resolve => setTimeout(resolve, 2000));
      setTranscript("This is a mock transcription of the recorded audio. In a real implementation, this would be generated by a speech-to-text service.");
    } catch (error) {
      console.error('Transcription failed:', error);
      alert('Failed to generate transcript. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const downloadAudio = () => {
    if (audioUrl) {
      const a = document.createElement('a');
      a.href = audioUrl;
      a.download = `recording-${Date.now()}.webm`;
      a.click();
    }
  };

  const handleSubmit = async () => {
    if (!audioBlob || !audioUrl) return;

    const submissionData: VoiceRecordingData = {
      audio_url: audioUrl,
      duration_seconds: duration,
      transcript: transcript || undefined,
      audio_quality_score: duration > 10 ? 4 : 3, // Mock quality score
      background_noise_level: audioLevel > 0.3 ? 'high' : audioLevel > 0.1 ? 'medium' : 'low',
    };

    try {
      await onSubmit(submissionData);
    } catch (error) {
      console.error('Failed to submit recording:', error);
    }
  };

  // Handle audio playback events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updatePlaybackTime = () => setPlaybackTime(audio.currentTime);
    const handleEnded = () => {
      setIsPlaying(false);
      setPlaybackTime(0);
    };

    audio.addEventListener('timeupdate', updatePlaybackTime);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updatePlaybackTime);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [audioUrl]);

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
      default: return 'Ready to Record';
    }
  };

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