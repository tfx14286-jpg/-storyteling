"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type PipelineEvent = {
  status?: string;
  progress?: number;
  stage?: string;
  jobId?: string;
  jobStatus?: string;
  jobProgress?: number;
  message?: string;
  done?: boolean;
  renderUrl?: string | null;
};

export function usePipeline(projectId: string) {
  const [running, setRunning] = useState(false);
  const [event, setEvent] = useState<PipelineEvent>({});
  const esRef = useRef<EventSource | null>(null);

  const stop = useCallback(() => {
    esRef.current?.close();
    esRef.current = null;
    setRunning(false);
  }, []);

  const watch = useCallback(
    (onDone?: () => void, onEvent?: (data: PipelineEvent) => void) => {
      stop();
      const es = new EventSource(`/api/projects/${projectId}/generate`);
      esRef.current = es;
      setRunning(true);
      setEvent({ message: "Starting…", progress: 0 });
      es.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data) as PipelineEvent;
          setEvent((prev) => ({ ...prev, ...data }));
          onEvent?.(data);
          if (data.done || data.status === "COMPLETED" || data.status === "FAILED") {
            setRunning(false);
            es.close();
            esRef.current = null;
            onDone?.();
          }
        } catch {
          /* ignore malformed */
        }
      };
      es.onerror = () => {
        setRunning(false);
        es.close();
        esRef.current = null;
      };
    },
    [projectId, stop]
  );

  useEffect(() => () => stop(), [stop]);

  return { running, event, watch, stop };
}
