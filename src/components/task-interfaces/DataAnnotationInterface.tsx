/**
 * Data Annotation Interface Component
 * Allows users to annotate images, text, and other data with labels and bounding boxes
 */

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Plus, Minus, Square, MousePointer, Tags, Eye, EyeOff, Trash2, Edit3, Save, RotateCcw } from 'lucide-react';

import { Card, Button, Badge, Input, Modal } from '@/components/ui';
import { DataAnnotationData, Task } from '@/types';
import { cn, generateId } from '@/lib/utils';

interface DataAnnotationInterfaceProps {
  task: Task;
  onSubmit: (data: DataAnnotationData) => Promise<void>;
  isSubmitting?: boolean;
  className?: string;
}

interface Annotation {
  id: string;
  type: 'bounding_box' | 'polygon' | 'point' | 'classification';
  coordinates?: number[];
  label: string;
  confidence?: number;
  metadata?: Record<string, any>;
}

interface AnnotationTask {
  type: 'image' | 'text';
  data: {
    image_url?: string;
    text_content?: string;
    labels: string[];
    instructions: string;
  };
}

const DEFAULT_LABELS = [
  'Person', 'Car', 'Building', 'Tree', 'Road', 'Animal', 'Object', 'Text', 'Logo', 'Sign'
];

export const DataAnnotationInterface: React.FC<DataAnnotationInterfaceProps> = ({
  task,
  onSubmit,
  isSubmitting = false,
  className,
}) => {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedTool, setSelectedTool] = useState<'select' | 'bounding_box' | 'point'>('select');
  const [selectedLabel, setSelectedLabel] = useState(DEFAULT_LABELS[0]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showLabels, setShowLabels] = useState(true);
  const [customLabel, setCustomLabel] = useState('');
  const [showCustomLabel, setShowCustomLabel] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mock task data - in real app, this would come from task.verification_criteria
  const [taskData] = useState<AnnotationTask>({
    type: 'image',
    data: {
      image_url: '/api/placeholder/600/400', // Placeholder image
      labels: DEFAULT_LABELS,
      instructions: 'Annotate all objects in the image with accurate bounding boxes and appropriate labels.',
    },
  });

  // Initialize canvas
  useEffect(() => {
    if (taskData.type === 'image' && canvasRef.current && imageRef.current) {
      const canvas = canvasRef.current;
      const image = imageRef.current;

      const resizeCanvas = () => {
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        canvas.style.width = `${image.clientWidth}px`;
        canvas.style.height = `${image.clientHeight}px`;
        redrawCanvas();
      };

      image.onload = resizeCanvas;
      window.addEventListener('resize', resizeCanvas);

      return () => window.removeEventListener('resize', resizeCanvas);
    }
  }, [taskData]);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw annotations
    annotations.forEach(annotation => {
      if (annotation.type === 'bounding_box' && annotation.coordinates) {
        const [x, y, width, height] = annotation.coordinates;
        const isSelected = annotation.id === selectedAnnotation;

        // Draw bounding box
        ctx.strokeStyle = isSelected ? '#1989fb' : '#10b981';
        ctx.lineWidth = 2;
        ctx.setLineDash(isSelected ? [5, 5] : []);
        ctx.strokeRect(x, y, width, height);

        // Draw label background
        if (showLabels) {
          ctx.fillStyle = isSelected ? '#1989fb' : '#10b981';
          ctx.fillRect(x, y - 25, ctx.measureText(annotation.label).width + 10, 20);

          // Draw label text
          ctx.fillStyle = 'white';
          ctx.font = '12px Arial';
          ctx.fillText(annotation.label, x + 5, y - 10);
        }
      } else if (annotation.type === 'point' && annotation.coordinates) {
        const [x, y] = annotation.coordinates;
        const isSelected = annotation.id === selectedAnnotation;

        // Draw point
        ctx.fillStyle = isSelected ? '#1989fb' : '#10b981';
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, 2 * Math.PI);
        ctx.fill();

        // Draw label
        if (showLabels) {
          ctx.fillStyle = isSelected ? '#1989fb' : '#10b981';
          ctx.font = '12px Arial';
          ctx.fillText(annotation.label, x + 10, y - 5);
        }
      }
    });

    // Draw current box being drawn
    if (currentBox) {
      ctx.strokeStyle = '#1989fb';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(currentBox.x, currentBox.y, currentBox.width, currentBox.height);
    }
  }, [annotations, selectedAnnotation, showLabels, currentBox]);

  // Redraw canvas when annotations change
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const getCanvasCoordinates = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const handleCanvasMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(event);

    if (selectedTool === 'bounding_box') {
      setIsDrawing(true);
      setCurrentBox({ x, y, width: 0, height: 0 });
    } else if (selectedTool === 'point') {
      const newAnnotation: Annotation = {
        id: generateId(),
        type: 'point',
        coordinates: [x, y],
        label: selectedLabel,
        confidence: 1,
      };

      setAnnotations(prev => [...prev, newAnnotation]);
    } else if (selectedTool === 'select') {
      // Check if clicked on an existing annotation
      const clickedAnnotation = annotations.find(annotation => {
        if (annotation.type === 'bounding_box' && annotation.coordinates) {
          const [ax, ay, width, height] = annotation.coordinates;
          return x >= ax && x <= ax + width && y >= ay && y <= ay + height;
        } else if (annotation.type === 'point' && annotation.coordinates) {
          const [ax, ay] = annotation.coordinates;
          return Math.sqrt(Math.pow(x - ax, 2) + Math.pow(y - ay, 2)) <= 10;
        }
        return false;
      });

      setSelectedAnnotation(clickedAnnotation?.id || null);
    }
  };

  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentBox || selectedTool !== 'bounding_box') return;

    const { x, y } = getCanvasCoordinates(event);
    setCurrentBox(prev => prev ? {
      ...prev,
      width: x - prev.x,
      height: y - prev.y,
    } : null);
  };

  const handleCanvasMouseUp = () => {
    if (isDrawing && currentBox && selectedTool === 'bounding_box') {
      if (Math.abs(currentBox.width) > 10 && Math.abs(currentBox.height) > 10) {
        const newAnnotation: Annotation = {
          id: generateId(),
          type: 'bounding_box',
          coordinates: [
            Math.min(currentBox.x, currentBox.x + currentBox.width),
            Math.min(currentBox.y, currentBox.y + currentBox.height),
            Math.abs(currentBox.width),
            Math.abs(currentBox.height),
          ],
          label: selectedLabel,
          confidence: 1,
        };

        setAnnotations(prev => [...prev, newAnnotation]);
      }

      setIsDrawing(false);
      setCurrentBox(null);
    }
  };

  const deleteAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(annotation => annotation.id !== id));
    if (selectedAnnotation === id) {
      setSelectedAnnotation(null);
    }
  };

  const updateAnnotationLabel = (id: string, newLabel: string) => {
    setAnnotations(prev => prev.map(annotation =>
      annotation.id === id ? { ...annotation, label: newLabel } : annotation
    ));
  };

  const clearAllAnnotations = () => {
    setAnnotations([]);
    setSelectedAnnotation(null);
  };

  const addCustomLabel = () => {
    if (customLabel.trim() && !DEFAULT_LABELS.includes(customLabel)) {
      DEFAULT_LABELS.push(customLabel.trim());
      setSelectedLabel(customLabel.trim());
      setCustomLabel('');
      setShowCustomLabel(false);
    }
  };

  const handleSubmit = async () => {
    const submissionData: DataAnnotationData = {
      annotations: annotations.map(annotation => ({
        id: annotation.id,
        type: annotation.type,
        coordinates: annotation.coordinates,
        label: annotation.label,
        confidence: annotation.confidence,
        metadata: annotation.metadata,
      })),
      image_url: taskData.data.image_url,
      text_content: taskData.data.text_content,
    };

    try {
      await onSubmit(submissionData);
    } catch (error) {
      console.error('Failed to submit annotations:', error);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Task Instructions */}
      <Card variant="elevated">
        <Card.Header
          title="Data Annotation Task"
          subtitle="Annotate the provided data with accurate labels"
        />
        <Card.Content>
          <p className="text-white/80 text-sm leading-relaxed">
            {taskData.data.instructions}
          </p>

          <div className="mt-4 flex items-center gap-4 text-sm">
            <Badge variant="info" size="sm">
              Annotations: {annotations.length}
            </Badge>
            <Badge variant="info" size="sm">
              Type: {taskData.type}
            </Badge>
          </div>
        </Card.Content>
      </Card>

      {/* Annotation Tools */}
      <Card variant="elevated">
        <Card.Header title="Annotation Tools" />
        <Card.Content>
          <div className="space-y-4">
            {/* Tool Selection */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Select Tool
              </label>
              <div className="flex gap-2">
                <Button
                  variant={selectedTool === 'select' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setSelectedTool('select')}
                  leftIcon={<MousePointer className="w-4 h-4" />}
                >
                  Select
                </Button>
                <Button
                  variant={selectedTool === 'bounding_box' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setSelectedTool('bounding_box')}
                  leftIcon={<Square className="w-4 h-4" />}
                >
                  Bounding Box
                </Button>
                <Button
                  variant={selectedTool === 'point' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setSelectedTool('point')}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Point
                </Button>
              </div>
            </div>

            {/* Label Selection */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Select Label
              </label>
              <div className="flex flex-wrap gap-2">
                {DEFAULT_LABELS.map(label => (
                  <Button
                    key={label}
                    variant={selectedLabel === label ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setSelectedLabel(label)}
                  >
                    {label}
                  </Button>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCustomLabel(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Custom
                </Button>
              </div>
            </div>

            {/* View Options */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowLabels(!showLabels)}
                  leftIcon={showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                >
                  {showLabels ? 'Hide Labels' : 'Show Labels'}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
                  leftIcon={<Minus className="w-4 h-4" />}
                >
                  Zoom Out
                </Button>
                <span className="text-sm text-white/60">{Math.round(zoom * 100)}%</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoom(Math.min(3, zoom + 0.25))}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  Zoom In
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllAnnotations}
                leftIcon={<RotateCcw className="w-4 h-4" />}
              >
                Clear All
              </Button>
            </div>
          </div>
        </Card.Content>
      </Card>

      {/* Annotation Canvas */}
      {taskData.type === 'image' && (
        <Card variant="elevated">
          <Card.Content>
            <div
              ref={containerRef}
              className="relative overflow-auto max-h-[600px] bg-black/20 rounded-lg"
              style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
            >
              <img
                ref={imageRef}
                src={taskData.data.image_url || '/api/placeholder/600/400'}
                alt="Annotation target"
                className="block max-w-full h-auto"
                draggable={false}
              />
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 cursor-crosshair"
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={() => {
                  setIsDrawing(false);
                  setCurrentBox(null);
                }}
              />
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Text Annotation */}
      {taskData.type === 'text' && (
        <Card variant="elevated">
          <Card.Header title="Text Content" />
          <Card.Content>
            <div className="bg-white/5 border border-white/10 rounded-lg p-4 max-h-60 overflow-auto">
              <p className="text-white/80 text-sm leading-relaxed whitespace-pre-wrap">
                {taskData.data.text_content || 'Sample text content for annotation would appear here...'}
              </p>
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Annotation List */}
      {annotations.length > 0 && (
        <Card variant="elevated">
          <Card.Header title="Annotations" subtitle={`${annotations.length} annotations created`} />
          <Card.Content>
            <div className="space-y-2 max-h-60 overflow-auto">
              {annotations.map((annotation, index) => (
                <div
                  key={annotation.id}
                  className={cn(
                    'flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer',
                    selectedAnnotation === annotation.id
                      ? 'bg-[rgb(25,137,251)]/20 border-[rgb(25,137,251)]/30'
                      : 'bg-white/5 border-white/10 hover:bg-white/10'
                  )}
                  onClick={() => setSelectedAnnotation(annotation.id)}
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="ghost" size="sm">
                      {index + 1}
                    </Badge>
                    <div>
                      <span className="text-white font-medium">{annotation.label}</span>
                      <div className="text-xs text-white/60">
                        {annotation.type.replace('_', ' ')}
                        {annotation.coordinates && (
                          <>
                            {' • '}
                            {annotation.type === 'point'
                              ? `(${Math.round(annotation.coordinates[0])}, ${Math.round(annotation.coordinates[1])})`
                              : `${Math.round(annotation.coordinates[2])} × ${Math.round(annotation.coordinates[3])}`
                            }
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        // Edit annotation logic would go here
                      }}
                      leftIcon={<Edit3 className="w-3 h-3" />}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteAnnotation(annotation.id);
                      }}
                      leftIcon={<Trash2 className="w-3 h-3" />}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card.Content>
        </Card>
      )}

      {/* Submit Button */}
      {annotations.length > 0 && (
        <div className="flex justify-center">
          <Button
            size="lg"
            disabled={isSubmitting}
            loading={isSubmitting}
            onClick={handleSubmit}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Submit Annotations ({annotations.length})
          </Button>
        </div>
      )}

      {/* Custom Label Modal */}
      <Modal
        isOpen={showCustomLabel}
        onClose={() => setShowCustomLabel(false)}
        title="Add Custom Label"
        size="sm"
      >
        <div className="space-y-4">
          <Input
            placeholder="Enter custom label..."
            value={customLabel}
            onChange={(e) => setCustomLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                addCustomLabel();
              }
            }}
            autoFocus
          />
        </div>

        <Modal.Footer>
          <Button variant="ghost" onClick={() => setShowCustomLabel(false)}>
            Cancel
          </Button>
          <Button onClick={addCustomLabel} disabled={!customLabel.trim()}>
            Add Label
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default DataAnnotationInterface;