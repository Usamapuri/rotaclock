"use client"

import { useRef, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, CheckCircle, XCircle, RotateCcw } from "lucide-react"

interface CameraVerificationProps {
  onVerificationComplete: (verified: boolean) => void
  isRequired?: boolean
}

export function CameraVerification({ onVerificationComplete, isRequired = true }: CameraVerificationProps) {
  const [showCamera, setShowCamera] = useState(false)
  const [cameraVerified, setCameraVerified] = useState(false)
  const [cameraError, setCameraError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const startCamera = async () => {
    setIsLoading(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setShowCamera(true)
        setCameraError("")
      }
    } catch (error) {
      setCameraError("Camera access denied. Please allow camera access to continue.")
      console.error("Camera error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      const context = canvas.getContext("2d")

      if (context) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        context.drawImage(video, 0, 0)

        // Stop camera stream
        const stream = video.srcObject as MediaStream
        stream?.getTracks().forEach((track) => track.stop())

        setShowCamera(false)
        setCameraVerified(true)
        onVerificationComplete(true)
      }
    }
  }, [onVerificationComplete])

  const retakePhoto = () => {
    setCameraVerified(false)
    onVerificationComplete(false)
    startCamera()
  }

  const skipVerification = () => {
    if (!isRequired) {
      onVerificationComplete(true)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Camera className="h-5 w-5 mr-2" />
          Camera Verification
          {isRequired && <span className="text-red-500 ml-1">*</span>}
        </CardTitle>
        <CardDescription>
          {isRequired ? "Please verify your presence by taking a photo" : "Optional: Verify your presence with a photo"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!showCamera && !cameraVerified && (
          <div className="text-center space-y-3">
            <div className="w-32 h-32 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
              <Camera className="h-12 w-12 text-gray-400" />
            </div>
            <div className="space-y-2">
              <Button onClick={startCamera} disabled={isLoading} className="w-full">
                {isLoading ? "Starting Camera..." : "Start Camera Verification"}
              </Button>
              {!isRequired && (
                <Button onClick={skipVerification} variant="outline" className="w-full bg-transparent">
                  Skip Verification
                </Button>
              )}
            </div>
          </div>
        )}

        {showCamera && (
          <div className="text-center space-y-3">
            <div className="relative">
              <video ref={videoRef} autoPlay playsInline muted className="w-full max-w-sm mx-auto rounded-lg border" />
              <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none">
                <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-blue-500"></div>
                <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-blue-500"></div>
                <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-blue-500"></div>
                <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-blue-500"></div>
              </div>
            </div>
            <p className="text-sm text-gray-600">Position your face within the frame</p>
            <Button onClick={capturePhoto} className="w-full">
              <Camera className="h-4 w-4 mr-2" />
              Capture Photo
            </Button>
          </div>
        )}

        {cameraVerified && (
          <div className="text-center space-y-3">
            <div className="flex items-center justify-center text-green-600 mb-2">
              <CheckCircle className="h-6 w-6 mr-2" />
              <span className="font-semibold">Verification Completed</span>
            </div>
            <canvas
              ref={canvasRef}
              className="w-full max-w-sm mx-auto rounded-lg border"
              style={{ maxHeight: "200px" }}
            />
            <Button onClick={retakePhoto} variant="outline" size="sm" className="w-full bg-transparent">
              <RotateCcw className="h-4 w-4 mr-2" />
              Retake Photo
            </Button>
          </div>
        )}

        {cameraError && (
          <div className="flex items-center text-red-600 text-sm p-3 bg-red-50 rounded-lg">
            <XCircle className="h-4 w-4 mr-2 flex-shrink-0" />
            <span>{cameraError}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
