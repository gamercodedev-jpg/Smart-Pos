import { useEffect, useMemo, useRef, useState } from 'react';
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export function QrScanner(props: {
  title?: string;
  onResult: (text: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);

  const reader = useMemo(() => new BrowserMultiFormatReader(), []);

  useEffect(() => {
    return () => {
      try {
        controlsRef.current?.stop();
        controlsRef.current = null;
      } catch {
        // ignore
      }
    };
  }, [reader]);

  const start = async () => {
    setError(null);
    setIsScanning(true);

    try {
      const videoEl = videoRef.current;
      if (!videoEl) throw new Error('Video element not ready');

      const devices = await BrowserMultiFormatReader.listVideoInputDevices();
      const deviceId = devices[0]?.deviceId;
      if (!deviceId) throw new Error('No camera found');

      const controls = await reader.decodeFromVideoDevice(deviceId, videoEl, (result, err) => {
        if (result) {
          props.onResult(result.getText());
          stop();
          return;
        }
        // NotFoundException is emitted when no QR is detected in a frame; ignore those.
        if (err) {
          const name = (err as { name?: string } | null)?.name;
          if (name && name.toLowerCase().includes('notfound')) return;
          setError(err instanceof Error ? err.message : String(err));
        }
      });

      controlsRef.current = controls;
    } catch (e) {
      setIsScanning(false);
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const stop = () => {
    try {
      controlsRef.current?.stop();
      controlsRef.current = null;
    } catch {
      // ignore
    }
    setIsScanning(false);
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="font-semibold">{props.title ?? 'Scan QR'}</div>
        <div className="flex gap-2">
          {!isScanning ? (
            <Button onClick={start} variant="default">Start</Button>
          ) : (
            <Button onClick={stop} variant="secondary">Stop</Button>
          )}
        </div>
      </div>

      <video ref={videoRef} className="w-full rounded-md bg-black/40" />

      {error && <div className="text-sm text-destructive">{error}</div>}
      <div className="text-xs text-muted-foreground">
        Tip: On mobile, grant camera permission when prompted.
      </div>
    </Card>
  );
}
