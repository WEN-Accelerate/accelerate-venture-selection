import React, { useState, useRef } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';

export const AudioRecorder = ({ onTranscriptionComplete, className = "" }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorderRef.current.onstop = async () => {
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                await handleTranscription(audioBlob);

                // Stop all tracks to release microphone
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            if (err.name === 'NotAllowedError') {
                alert("Microphone access denied. Please allow microphone access to use this feature.");
            } else {
                alert("Could not access microphone. Please check your system settings.");
            }
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const handleTranscription = async (audioBlob) => {
        setIsProcessing(true);
        try {
            // Send to our Netlify Function
            const response = await fetch('/.netlify/functions/transcribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'audio/webm'
                },
                body: audioBlob,
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Transcription failed');
            }

            const data = await response.json();
            if (onTranscriptionComplete) {
                onTranscriptionComplete(data.transcription);
            }
        } catch (error) {
            console.error("Transcription error:", error);
            alert(`Failed to transcribe audio: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className={`inline-flex items-center gap-2 ${className}`}>
            {!isRecording ? (
                <button
                    type="button"
                    onClick={startRecording}
                    disabled={isProcessing}
                    className="p-2 rounded-full bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Start Recording Input"
                >
                    {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
                </button>
            ) : (
                <button
                    type="button"
                    onClick={stopRecording}
                    className="p-2 rounded-full bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 animate-pulse transition-all shadow-sm"
                    title="Stop Recording"
                >
                    <Square className="w-4 h-4 fill-current" />
                </button>
            )}
            {isRecording && <span className="text-xs text-red-500 font-medium animate-pulse">Recording...</span>}
            {isProcessing && <span className="text-xs text-blue-500 font-medium">Transcribing...</span>}
        </div>
    );
};
