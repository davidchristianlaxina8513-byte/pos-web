'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/common/Button';

interface PaymentEvidenceCaptureProps {
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
}

type CaptureState = 'idle' | 'requesting' | 'live' | 'preview' | 'confirmed';

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 5 * 1024 * 1024;

function fileError(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'Choose a JPEG, PNG, or WebP image.';
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    return 'The evidence image must be 5 MB or smaller.';
  }
  return null;
}

export function PaymentEvidenceCapture({
  value,
  onChange,
  disabled = false,
}: PaymentEvidenceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CaptureState>(
    value ? 'confirmed' : 'idle',
  );
  const [candidate, setCandidate] = useState<File | null>(value);
  const [message, setMessage] = useState<string | null>(null);
  const previewUrl = useMemo(
    () => (candidate ? URL.createObjectURL(candidate) : null),
    [candidate],
  );

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => () => stopCamera(), []);

  const startCamera = async () => {
    setMessage(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage(
        'Camera capture is unavailable in this browser. Use the image upload option below.',
      );
      return;
    }
    setState('requesting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState('live');
    } catch (error) {
      setState('idle');
      const denied =
        error instanceof DOMException &&
        (error.name === 'NotAllowedError' || error.name === 'SecurityError');
      setMessage(
        denied
          ? 'Camera permission is required to capture payment evidence. Allow camera access or upload an image.'
          : 'No camera is available. Use the image upload option below.',
      );
    }
  };

  const capture = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight) {
      setMessage('The camera is not ready. Try again.');
      return;
    }
    const canvas = document.createElement('canvas');
    const maxWidth = 1600;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas
      .getContext('2d')
      ?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', 0.86),
    );
    if (!blob) {
      setMessage('The photo could not be captured. Try again.');
      return;
    }
    const file = new File([blob], 'payment-evidence.jpg', {
      type: 'image/jpeg',
    });
    stopCamera();
    setCandidate(file);
    setState('preview');
  };

  const selectFile = (file: File | null) => {
    if (!file) return;
    const error = fileError(file);
    if (error) {
      setMessage(error);
      return;
    }
    stopCamera();
    setMessage(null);
    setCandidate(file);
    setState('preview');
  };

  const retake = () => {
    stopCamera();
    setCandidate(null);
    onChange(null);
    setMessage(null);
    setState('idle');
  };

  const confirm = () => {
    if (!candidate) return;
    onChange(candidate);
    setState('confirmed');
  };

  return (
    <section className="mt-4 rounded-2xl border border-border bg-mist p-3">
      <p className="text-xs font-semibold tracking-wider text-muted uppercase">
        Payment evidence photo
      </p>
      <p className="mt-1 text-sm text-muted">
        Evidence is submitted for Admin review. It does not automatically verify
        that payment was received.
      </p>

      <video
        ref={videoRef}
        muted
        playsInline
        className={
          state === 'live'
            ? 'mt-3 aspect-video w-full rounded-xl bg-black object-cover'
            : 'hidden'
        }
      />
      {previewUrl && (state === 'preview' || state === 'confirmed') ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={previewUrl}
          alt="Payment evidence preview"
          className="mt-3 aspect-video w-full rounded-xl bg-black object-contain"
        />
      ) : null}

      {message ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {message}
        </p>
      ) : null}
      {state === 'confirmed' ? (
        <p className="mt-2 text-sm font-bold text-success">
          Evidence photo confirmed.
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {state === 'idle' || state === 'requesting' ? (
          <Button
            type="button"
            variant="secondary"
            onClick={startCamera}
            disabled={disabled || state === 'requesting'}
          >
            {state === 'requesting' ? 'Opening camera…' : 'Take photo'}
          </Button>
        ) : null}
        {state === 'live' ? (
          <Button type="button" onClick={capture} disabled={disabled}>
            Capture photo
          </Button>
        ) : null}
        {state === 'preview' ? (
          <>
            <Button type="button" onClick={confirm} disabled={disabled}>
              Confirm photo
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={retake}
              disabled={disabled}
            >
              Retake
            </Button>
          </>
        ) : null}
        {state === 'confirmed' ? (
          <Button
            type="button"
            variant="secondary"
            onClick={retake}
            disabled={disabled}
          >
            Retake
          </Button>
        ) : null}
        {(state === 'idle' || state === 'requesting') && (
          <label className="action-focus inline-flex min-h-10 cursor-pointer items-center rounded-full border border-border bg-surface px-4 py-2 text-sm font-semibold">
            Upload image
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              className="sr-only"
              disabled={disabled}
              onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
            />
          </label>
        )}
      </div>
    </section>
  );
}
