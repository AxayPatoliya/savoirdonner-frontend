import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const CameraCapture = () => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [location, setLocation] = useState('');
    const [description, setDescription] = useState('');
    const [photo, setPhoto] = useState(null);
    const [latitude, setLatitude] = useState(null);
    const [longitude, setLongitude] = useState(null);
    const [facingMode, setFacingMode] = useState('environment');
    const [isMobile, setIsMobile] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [showInstallPrompt, setShowInstallPrompt] = useState(false);

    useEffect(() => {
        // Check if the device is mobile
        const checkMobile = () => {
            const isMobileDevice = /Mobi|Android/i.test(navigator.userAgent);
            setIsMobile(isMobileDevice);
        };

        checkMobile();
        startCamera();

        // Fetch user's location
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setLatitude(position.coords.latitude);
                    setLongitude(position.coords.longitude);
                },
                (error) => {
                    console.error('Error fetching location: ', error);
                }
            );
        }

        // Listen for the beforeinstallprompt event
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowInstallPrompt(true);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Check if the app is already installed
        window.addEventListener('appinstalled', () => {
            setShowInstallPrompt(false);
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, [facingMode]);

    const startCamera = async () => {
        try {
            const constraints = {
                video: isMobile ? { facingMode } : true,
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current.play().catch((error) => console.error('Error playing video:', error));
                };
            }
        } catch (err) {
            console.error('Error accessing the camera: ', err);
        }
    };

    const capturePhoto = () => {
        const context = canvasRef.current.getContext('2d');
        context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
        const photoData = canvasRef.current.toDataURL('image/png');
        setPhoto(photoData);
    };

    const handleSwitchCamera = () => {
        setFacingMode((prevMode) => (prevMode === 'environment' ? 'user' : 'environment'));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
    
        if (!photo) {
            alert('Please capture a photo.');
            return;
        }
    
        // Convert the base64 image to a Blob to simulate a file upload
        const byteString = atob(photo.split(',')[1]);
        const mimeString = photo.split(',')[0].split(':')[1].split(';')[0];
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const intArray = new Uint8Array(arrayBuffer);
    
        for (let i = 0; i < byteString.length; i++) {
            intArray[i] = byteString.charCodeAt(i);
        }
    
        const blob = new Blob([arrayBuffer], { type: mimeString });
        const now = new Date();
        const formattedDate = `${now.getDate().toString().padStart(2, '0')}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getFullYear()} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const fileName = `img-${formattedDate}.png`;
        const file = new File([blob], fileName, { type: mimeString });
    
        const formData = new FormData();
        formData.append('photo', file);
        formData.append('location', location);
        formData.append('comment', description);
        formData.append('latitude', latitude);
        formData.append('longitude', longitude);
    
        try {
            await axios.post('https://axayp.pythonanywhere.com/upload_image', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            alert('Photo uploaded successfully!');
            
            // Reset the photo state and restart the camera
            setPhoto(null);
            setLocation('');
            setDescription('');
            startCamera(); // Restart the camera
        } catch (error) {
            console.error('Error uploading photo:', error.response?.data || error.message);
            alert('Failed to upload photo.');
        }
    };
    

    const handleInstallClick = () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the A2HS prompt');
                } else {
                    console.log('User dismissed the A2HS prompt');
                }
                setDeferredPrompt(null);
                setShowInstallPrompt(false);
            });
        }
    };

    return (
        <div>
            <h2>Capture a Photo</h2>
            {photo ? (
                // Display the captured photo
                <img src={photo} alt="Captured" style={{ width: '300px', marginTop: '10px' }} />
            ) : (
                // Display the camera feed if no photo is captured
                <>
                    <video ref={videoRef} width="300" autoPlay playsInline></video>
                    <canvas ref={canvasRef} width="300" height="200" style={{ display: 'none' }}></canvas>
                    {isMobile && <button onClick={handleSwitchCamera}>Switch Camera</button>}
                    <button onClick={capturePhoto}>Capture Photo</button>
                </>
            )}
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Location:</label>
                    <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} required />
                </div>
                <div>
                    <label>Description:</label>
                    <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} required />
                </div>
                <button type="submit">Submit</button>
            </form>
            {showInstallPrompt && (
                <button onClick={handleInstallClick}>
                    Install App
                </button>
            )}
        </div>
    );
};

export default CameraCapture;
