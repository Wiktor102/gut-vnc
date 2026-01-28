import { useState, useCallback } from 'react';
import { Annotation, AnnotationTool, Point } from '@shared/types';
import { generateId } from '@shared/utils';
import { ANNOTATION_COLORS, DEFAULT_STROKE_WIDTH } from '@shared/constants';

export function useAnnotations() {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [activeTool, setActiveTool] = useState<AnnotationTool | null>(null);
  const [activeColor, setActiveColor] = useState(ANNOTATION_COLORS[0]);
  const [strokeWidth, setStrokeWidth] = useState(DEFAULT_STROKE_WIDTH);
  const [pointerPosition, setPointerPosition] = useState<Point | null>(null);

  const addAnnotation = useCallback((annotation: Annotation) => {
    setAnnotations(prev => [...prev, annotation]);
  }, []);

  const removeAnnotation = useCallback((annotationId: string) => {
    setAnnotations(prev => prev.filter(a => a.id !== annotationId));
  }, []);

  const clearAnnotations = useCallback(() => {
    setAnnotations([]);
  }, []);

  const undoLastAnnotation = useCallback(() => {
    setAnnotations(prev => prev.slice(0, -1));
  }, []);

  const setTool = useCallback((tool: AnnotationTool | null) => {
    setActiveTool(tool);
    
    // Hide pointer when switching away from pointer tool
    if (tool !== 'pointer') {
      setPointerPosition(null);
    }
  }, []);

  const setColor = useCallback((color: string) => {
    setActiveColor(color);
  }, []);

  const setWidth = useCallback((width: number) => {
    setStrokeWidth(width);
  }, []);

  const updatePointer = useCallback((position: Point | null) => {
    setPointerPosition(position);
  }, []);

  // Export annotations to JSON for transmission
  const exportAnnotations = useCallback(() => {
    return JSON.stringify(annotations);
  }, [annotations]);

  // Import annotations from JSON
  const importAnnotations = useCallback((json: string) => {
    try {
      const imported = JSON.parse(json) as Annotation[];
      setAnnotations(imported);
    } catch (err) {
      console.error('Failed to import annotations:', err);
    }
  }, []);

  return {
    annotations,
    activeTool,
    activeColor,
    strokeWidth,
    pointerPosition,
    addAnnotation,
    removeAnnotation,
    clearAnnotations,
    undoLastAnnotation,
    setTool,
    setColor,
    setWidth,
    updatePointer,
    exportAnnotations,
    importAnnotations,
  };
}
