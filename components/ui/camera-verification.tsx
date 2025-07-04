"use client"

import { useState, useRef, useEffect } from 'react'
import { Button } from './button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card'
import { Camera, RotateCcw, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface CameraVerificationProps {
  onVerificationComplete: (success: boolean, imageData?: string) => void
  onCancel: () => void
  title?: string
  description?: string
}

export function CameraVerification({
  onVerificationComplete,
  onCancel,
  title = "Shift Verification",
  description = "Please look at the camera to verify your identity for this shift."
}: CameraVerificationProps) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'processing' | 'success' | 'failed'>('idle')
  const [error, setError] = useState<string | null>(null)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  useEffect(() => {
    startCamera()
    return () => {
      stopCamera()
    }
  }, [])

  const startCamera = async () => {
    try {
      setError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user'
        }
      })
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        streamRef.current = stream
        setIsStreaming(true)
      }
    } catch (err) {
      console.error('Error accessing camera:', err)
      setError('Unable to access camera. Please check permissions and try again.')
      toast.error('Camera access denied')
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    setIsStreaming(false)
  }

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert to base64
    const imageData = canvas.toDataURL('image/jpeg', 0.8)
    setCapturedImage(imageData)
    setIsCapturing(false)
  }

  const retakePhoto = () => {
    setCapturedImage(null)
    setVerificationStatus('idle')
    setIsCapturing(false)
  }

  const verifyIdentity = async () => {
    if (!capturedImage) return

    setVerificationStatus('processing')
    
    try {
      // Simulate verification process
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // For demo purposes, always succeed
      // In production, you'd send the image to your verification service
      const success = Math.random() > 0.1 // 90% success rate for demo
      
      if (success) {
        setVerificationStatus('success')
        toast.success('Identity verified successfully!')
        setTimeout(() => {
          onVerificationComplete(true, capturedImage)
        }, 1000)
      } else {
        setVerificationStatus('failed')
        toast.error('Verification failed. Please try again.')
      }
    } catch (err) {
      console.error('Verification error:', err)
      setVerificationStatus('failed')
      toast.error('Verification failed. Please try again.')
    }
  }

  const handleCapture = () => {
    setIsCapturing(true)
    setTimeout(captureImage, 100) // Small delay to ensure video is ready
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
              <p className="text-red-600">{error}</p>
              <Button onClick={startCamera} variant="outline">
                <RotateCcw className="h-4 w-4 mr-2" />
                Retry Camera
              </Button>
            </div>
          ) : !capturedImage ? (
            <div className="space-y-4">
              <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-64 object-cover"
                />
                {!isStreaming && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500">Starting camera...</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleCapture} 
                  disabled={!isStreaming || isCapturing}
                  className="flex-1"
                >
                  {isCapturing ? 'Capturing...' : 'Capture Photo'}
                </Button>
                <Button onClick={onCancel} variant="outline">
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={capturedImage}
                  alt="Captured verification photo"
                  className="w-full h-64 object-cover"
                />
                {verificationStatus === 'processing' && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                      <p>Verifying identity...</p>
                    </div>
                  </div>
                )}
                {verificationStatus === 'success' && (
                  <div className="absolute inset-0 bg-green-500/50 flex items-center justify-center">
                    <div className="text-center text-white">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                      <p>Verified!</p>
                    </div>
                  </div>
                )}
                {verificationStatus === 'failed' && (
                  <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center">
                    <div className="text-center text-white">
                      <XCircle className="h-8 w-8 mx-auto mb-2" />
                      <p>Verification Failed</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2">
                {verificationStatus === 'idle' && (
                  <>
                    <Button onClick={verifyIdentity} className="flex-1">
                      Verify Identity
                    </Button>
                    <Button onClick={retakePhoto} variant="outline">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Retake
                    </Button>
                  </>
                )}
                {verificationStatus === 'failed' && (
                  <>
                    <Button onClick={retakePhoto} className="flex-1">
                      Try Again
                    </Button>
                    <Button onClick={onCancel} variant="outline">
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
