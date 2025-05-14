'use client';
import { useState, useRef, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import axios from 'axios';
import { FaTrash, FaSpinner } from 'react-icons/fa';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCSc_O02wZ7uAAqG6kzdTKLrLHOE5FVijs",
  authDomain: "karan-de07b.firebaseapp.com",
  projectId: "karan-de07b",
  storageBucket: "karan-de07b.firebasestorage.app",
  messagingSenderId: "229150689879",
  appId: "1:229150689879:web:3a334bf0bf774db1ad3112",
  measurementId: "G-CSJDT7TJT5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ImgBB API key
const IMGBB_API_KEY = 'c92f0a43537f4d2c663b2b07451cb148';

interface HeroImage {
  id?: string;
  imageUrl: string;
  createdAt: Date;
  originalFilename: string;
  size: number;
  deleteUrl?: string; // Only for ImgBB images
}

export default function ImageUploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [imageLink, setImageLink] = useState<string | null>(null);
  const [heroImages, setHeroImages] = useState<HeroImage[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [portalOpen, setPortalOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch hero images from Firestore
  useEffect(() => {
    const q = query(collection(db, 'heroImages'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const images: HeroImage[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        images.push({
          id: doc.id,
          imageUrl: data.imageUrl,
          createdAt: data.createdAt.toDate(),
          originalFilename: data.originalFilename,
          size: data.size,
          deleteUrl: data.deleteUrl || undefined,
        });
      });
      setHeroImages(images);
    });

    return () => unsubscribe();
  }, [db]);

  // Animation Effect
  useEffect(() => {
    const interval = setInterval(() => {
      const hueRotate = Math.floor(Math.random() * 360);
      document.documentElement.style.setProperty('--hue-rotate', `${hueRotate}deg`);
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadStatus('idle');
      setImageLink(null);
      setPortalOpen(true);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadStatus('uploading');
    setUploadProgress(0);

    try {
      // Upload to ImgBB
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await axios.post(
        `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
        formData,
        {
          onUploadProgress: (progressEvent) => {
            const progress = Math.round(
              (progressEvent.loaded / (progressEvent.total || 1)) * 100
            );
            setUploadProgress(progress);
          },
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      const imgUrl = response.data.data.url;
      const deleteUrl = response.data.data.delete_url;
      setImageLink(imgUrl);
      setUploadStatus('success');

      // Save to Firestore in heroImages collection
      try {
        const docRef = await addDoc(collection(db, 'heroImages'), {
          imageUrl: imgUrl, // Storing as imageUrl
          createdAt: new Date(),
          originalFilename: selectedFile.name,
          size: selectedFile.size,
          deleteUrl: deleteUrl,
        });
        console.log('Document written with ID: ', docRef.id);
      } catch (firestoreError) {
        console.error('Error adding document to Firestore: ', firestoreError);
      }

    } catch (error) {
      console.error('Error uploading image: ', error);
      setUploadStatus('error');
    }
  };

  const deleteHeroImage = async (image: HeroImage) => {
    if (!image.id) return;
    
    setIsDeleting(image.id);
    
    try {
      // Delete from Firestore's heroImages collection
      await deleteDoc(doc(db, 'heroImages', image.id));

      // If it's an ImgBB image, try to delete from ImgBB
      if (image.deleteUrl) {
        try {
          await axios.delete(image.deleteUrl, {
            headers: {
              'Content-Type': 'application/json',
            },
          });
        } catch (imgbbError) {
          console.warn('Could not delete from ImgBB (may be rate limited)', imgbbError);
        }
      }

      // Remove from local state (will also be updated via Firestore listener)
      setHeroImages(prev => prev.filter(img => img.id !== image.id));
    } catch (error) {
      console.error('Error deleting hero image: ', error);
    } finally {
      setIsDeleting(null);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setUploadProgress(0);
    setUploadStatus('idle');
    setImageLink(null);
    setPortalOpen(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen text-white overflow-hidden relative cosmic-background">
      {/* Animated Background Elements */}
      <div className="floating-orbs">
        {[...Array(12)].map((_, i) => (
          <div key={i} className={`orb orb-${i + 1}`}></div>
        ))}
      </div>
      
      <div className="floating-tech-lines">
        {[...Array(20)].map((_, i) => (
          <div key={i} className={`tech-line tech-line-${i + 1}`}></div>
        ))}
      </div>

      {/* Main Content */}
      <div className="container mx-auto py-8 px-4 relative z-10">
        <div className="neo-brutalism-card mb-8">
          <div className="cyber-header">
            <div className="glitch-text" data-text="COSMIC HERO VAULT">COSMIC HERO VAULT</div>
            <div className="cyber-subtitle">MULTIVERSAL IMAGE REPOSITORY</div>
          </div>
        
          {/* Upload Section */}
          <div className="upload-container cyberpunk-panel mb-8">
            <div className="panel-header">
              <span className="panel-label">QUANTUM UPLINK</span>
              <div className="panel-dots">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="panel-dot"></div>
                ))}
              </div>
            </div>
            
            {!portalOpen ? (
              <div className="teleporter-pad">
                <label className="cosmic-button">
                  <span className="button-text">SELECT IMAGE FOR DIMENSIONAL TRANSFER</span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <div className="teleporter-rings">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className={`teleporter-ring ring-${i + 1}`}></div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="portal-container">
                {previewUrl && (
                  <div className="preview-container">
                    <div className="preview-shield">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="preview-image"
                      />
                      <div className="shield-effect"></div>
                    </div>
                    <div className="image-stats">
                      <div className="stat-line">
                        <span className="stat-label">FILE NAME:</span> 
                        <span className="stat-value">{selectedFile?.name}</span>
                      </div>
                      <div className="stat-line">
                        <span className="stat-label">SIZE:</span> 
                        <span className="stat-value">{formatFileSize(selectedFile?.size || 0)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {selectedFile && (
                  <button
                    onClick={handleUpload}
                    disabled={uploadStatus === 'uploading'}
                    className="energy-button"
                  >
                    <div className="energy-button-inner">
                      {uploadStatus === 'uploading' ? 'TRANSFERRING TO QUANTUM REALM...' : 'INITIATE DIMENSIONAL UPLOAD'}
                    </div>
                    <div className="energy-button-glow"></div>
                  </button>
                )}

                {uploadStatus === 'uploading' && (
                  <div className="quantum-progress">
                    <div className="quantum-progress-bar">
                      <div
                        className="quantum-progress-fill"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                      <div className="quantum-sparks">
                        {[...Array(10)].map((_, i) => (
                          <div key={i} className="quantum-spark"></div>
                        ))}
                      </div>
                    </div>
                    <div className="quantum-progress-text">
                      <span className="quantum-percentage">{uploadProgress}%</span>
                      <span className="quantum-status">QUANTUM TRANSFER IN PROGRESS</span>
                    </div>
                  </div>
                )}

                {uploadStatus === 'success' && imageLink && (
                  <div className="success-portal">
                    <div className="success-title">DIMENSIONAL TRANSFER COMPLETE!</div>
                    <div className="success-message">
                      <div className="success-link">
                        <span className="success-label">INTERDIMENSIONAL LINK:</span>
                        <a href={imageLink} target="_blank" rel="noopener noreferrer" className="quantum-link">
                          {imageLink.substring(0, 30)}...
                        </a>
                      </div>
                      <div className="success-info">ASSET SECURELY STORED IN THE COSMIC VAULT</div>
                    </div>
                    <button
                      onClick={resetForm}
                      className="reset-button"
                    >
                      PREPARE NEW TRANSMISSION
                    </button>
                  </div>
                )}

                {uploadStatus === 'error' && (
                  <div className="error-container">
                    <div className="error-title">TRANSMISSION FAILURE</div>
                    <div className="error-message">QUANTUM FIELD DISRUPTED - RETRY REQUIRED</div>
                    <button
                      onClick={resetForm}
                      className="error-button"
                    >
                      RECALIBRATE SYSTEMS
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Gallery Section */}
          <div className="gallery-container">
            <div className="gallery-header">
              <div className="gallery-title">MULTIVERSAL ARCHIVE</div>
              <div className="gallery-counter">{heroImages.length} COSMIC ASSETS</div>
            </div>
            
            {heroImages.length === 0 ? (
              <div className="empty-vault">
                <div className="empty-message">THE COSMIC VAULT AWAITS YOUR FIRST HERO IMAGE</div>
                <div className="empty-icon"></div>
              </div>
            ) : (
              <div className="cosmic-grid">
                {heroImages.map((image) => (
                  <div key={image.id} className="cosmic-card">
                    <div className="card-frame">
                      <div className="image-container">
                        <img
                          src={image.imageUrl}
                          alt={image.originalFilename}
                          className="hero-image"
                        />
                        <div className="image-overlay"></div>
                      </div>
                      <button
                        onClick={() => deleteHeroImage(image)}
                        disabled={isDeleting === image.id}
                        className="delete-button"
                        aria-label="Delete hero image"
                      >
                        {isDeleting === image.id ? (
                          <FaSpinner className="animate-spin" />
                        ) : (
                          <div className="delete-icon">
                            <FaTrash />
                          </div>
                        )}
                      </button>
                      <div className="card-details">
                        <div className="filename">{image.originalFilename}</div>
                        <div className="filesize">{formatFileSize(image.size)}</div>
                        <div className="timestamp">
                          ADDED: {new Date(image.createdAt).toLocaleDateString()}
                        </div>
                        <a
                          href={image.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="view-link"
                        >
                          VIEW FULL RESOLUTION
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Cursor Effect */}
      <div className="cosmic-cursor"></div>

      <style jsx global>{`
        :root {
          --primary-color: #ff00ff;
          --secondary-color: #00ffff;
          --accent-color: #ffff00;
          --bg-dark: #0a0a20;
          --panel-bg: rgba(20, 20, 50, 0.8);
          --glow-color: #ff00cc;
          --energy-color: #00f7ff;
          --hue-rotate: 0deg;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Orbitron', sans-serif;
          background: #000;
          color: #fff;
          overflow-x: hidden;
          cursor: none;
        }

        /* Custom Cursor */
        .cosmic-cursor {
          position: fixed;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--accent-color);
          box-shadow: 0 0 15px var(--accent-color);
          pointer-events: none;
          transform: translate(-50%, -50%);
          mix-blend-mode: difference;
          z-index: 9999;
          opacity: 0.7;
          transition: width 0.2s, height 0.2s;
        }

        /* Animated Background */
        .cosmic-background {
          background: linear-gradient(135deg, #000235 0%, #1a0038 50%, #220042 100%);
          background-size: 400% 400%;
          animation: gradientShift 15s ease infinite;
        }

        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        .floating-orbs {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          overflow: hidden;
          z-index: 1;
          filter: blur(3px);
        }

        .orb {
          position: absolute;
          border-radius: 50%;
          opacity: 0.3;
          box-shadow: 0 0 40px rgba(255, 255, 255, 0.5);
          animation: floatOrb 20s linear infinite, pulsate 6s ease-in-out infinite;
        }

        @keyframes floatOrb {
          0% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-50vh) rotate(180deg); }
          100% { transform: translateY(0) rotate(360deg); }
        }

        @keyframes pulsate {
          0% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.2); opacity: 0.6; }
          100% { transform: scale(1); opacity: 0.3; }
        }

        .orb-1 {
          width: 80px;
          height: 80px;
          background: radial-gradient(circle, #ff00c8 0%, transparent 70%);
          left: 10%;
          top: 20%;
          animation-delay: 0s;
          animation-duration: 25s;
        }

        .orb-2 {
          width: 120px;
          height: 120px;
          background: radial-gradient(circle, #00ffea 0%, transparent 70%);
          left: 80%;
          top: 10%;
          animation-delay: 2s;
          animation-duration: 30s;
        }

        .orb-3 {
          width: 150px;
          height: 150px;
          background: radial-gradient(circle, #7700ff 0%, transparent 70%);
          left: 30%;
          top: 70%;
          animation-delay: 1s;
          animation-duration: 20s;
        }

        .orb-4 {
          width: 100px;
          height: 100px;
          background: radial-gradient(circle, #ff0055 0%, transparent 70%);
          left: 60%;
          top: 40%;
          animation-delay: 3s;
          animation-duration: 35s;
        }

        .orb-5 {
          width: 90px;
          height: 90px;
          background: radial-gradient(circle, #ffaa00 0%, transparent 70%);
          left: 20%;
          top: 40%;
          animation-delay: 4s;
          animation-duration: 22s;
        }

        .orb-6 {
          width: 70px;
          height: 70px;
          background: radial-gradient(circle, #00ff77 0%, transparent 70%);
          left: 70%;
          top: 80%;
          animation-delay: 5s;
          animation-duration: 28s;
        }

        .orb-7, .orb-8, .orb-9, .orb-10, .orb-11, .orb-12 {
          width: 60px;
          height: 60px;
          background: radial-gradient(circle, #aa00ff 0%, transparent 70%);
          animation-delay: 2s;
          animation-duration: 26s;
        }

        .orb-7 { left: 5%; top: 90%; }
        .orb-8 { left: 15%; top: 60%; }
        .orb-9 { left: 90%; top: 30%; }
        .orb-10 { left: 45%; top: 20%; }
        .orb-11 { left: 85%; top: 70%; }
        .orb-12 { left: 42%; top: 85%; }

        /* Tech Lines */
        .floating-tech-lines {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          overflow: hidden;
          z-index: 1;
        }

        .tech-line {
          position: absolute;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--secondary-color), transparent);
          opacity: 0.3;
          box-shadow: 0 0 8px var(--secondary-color);
          animation: floatTechLine 15s linear infinite;
        }

        @keyframes floatTechLine {
          0% { transform: translateY(-100vh); }
          100% { transform: translateY(100vh); }
        }

        .tech-line-1 { width: 30%; left: 10%; animation-delay: 0s; }
        .tech-line-2 { width: 20%; left: 40%; animation-delay: 2s; }
        .tech-line-3 { width: 40%; left: 70%; animation-delay: 4s; }
        .tech-line-4 { width: 15%; left: 5%; animation-delay: 6s; }
        .tech-line-5 { width: 25%; left: 55%; animation-delay: 8s; }
        .tech-line-6 { width: 35%; left: 25%; animation-delay: 10s; }
        .tech-line-7 { width: 22%; left: 75%; animation-delay: 1s; }
        .tech-line-8 { width: 18%; left: 50%; animation-delay: 3s; }
        .tech-line-9 { width: 28%; left: 15%; animation-delay: 5s; }
        .tech-line-10 { width: 32%; left: 65%; animation-delay: 7s; }
        .tech-line-11 { width: 25%; left: 35%; animation-delay: 9s; }
        .tech-line-12 { width: 30%; left: 85%; animation-delay: 11s; }
        .tech-line-13 { width: 15%; left: 8%; animation-delay: 0.5s; }
        .tech-line-14 { width: 20%; left: 45%; animation-delay: 2.5s; }
        .tech-line-15 { width: 25%; left: 75%; animation-delay: 4.5s; }
        .tech-line-16 { width: 18%; left: 28%; animation-delay: 6.5s; }
        .tech-line-17 { width: 22%; left: 60%; animation-delay: 8.5s; }
        .tech-line-18 { width: 28%; left: 18%; animation-delay: 10.5s; }
        .tech-line-19 { width: 15%; left: 92%; animation-delay: 1.5s; }
        .tech-line-20 { width: 30%; left: 70%; animation-delay: 3.5s; }

        /* Neo-Brutalism Card */
        .neo-brutalism-card {
          position: relative;
          background: rgba(15, 15, 45, 0.8);
          border: 4px solid var(--primary-color);
          box-shadow: 12px 12px 0 rgba(255, 0, 255, 0.4);
          backdrop-filter: blur(8px);
          padding: 2rem;
          border-radius: 16px;
          z-index: 10;
          transition: transform 0.3s, box-shadow 0.3s;
          overflow: hidden;
        }

        .neo-brutalism-card:hover {
          transform: translate(-4px, -4px);
          box-shadow: 16px 16px 0 rgba(255, 0, 255, 0.6);
        }

        .neo-brutalism-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, 
              rgba(255, 0, 255, 0.1) 0%,
              rgba(0, 255, 255, 0.1) 50%,
              rgba(255, 255, 0, 0.1) 100%);
          z-index: -1;
          animation: gradientMove 8s ease infinite;
        }

        @keyframes gradientMove {
          0% { background-position: 0% 0%; }
          50% { background-position: 100% 100%; }
          100% { background-position: 0% 0%; }
        }

        /* Cyber Header */
        .cyber-header {
          text-align: center;
          margin-bottom: 2rem;
          position: relative;
        }

        .glitch-text {
          font-size: 3rem;
          font-weight: 900;
          color: #fff;
          position: relative;
          text-shadow: 
            0 0 10px var(--primary-color),
            0 0 20px var(--primary-color),
            0 0 30px var(--primary-color);
          animation: glitch 2s infinite;
          letter-spacing: 4px;
        }

        .glitch-text::before,
        .glitch-text::after {
          content: attr(data-text);
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
        }

        .glitch-text::before {
          left: 2px;
          text-shadow: -2px 0 red;
          animation: glitch-1 3s infinite linear alternate-reverse;
        }

        .glitch-text::after {
          left: -2px;
          text-shadow: 2px 0 blue;
          animation: glitch-2 2s infinite linear alternate-reverse;
        }

        @keyframes glitch {
          0% { text-shadow: 0 0 10px var(--primary-color), 0 0 20px var(--primary-color), 0 0 30px var(--primary-color); }
          50% { text-shadow: 0 0 20px var(--secondary-color), 0 0 30px var(--secondary-color), 0 0 40px var(--secondary-color); }
          100% { text-shadow: 0 0 10px var(--primary-color), 0 0 20px var(--primary-color), 0 0 30px var(--primary-color); }
        }

        @keyframes glitch-1 {
          0% { clip-path: inset(20% 0 60% 0); }
          20% { clip-path: inset(30% 0 40% 0); }
          40% { clip-path: inset(50% 0 10% 0); }
          60% { clip-path: inset(10% 0 70% 0); }
          80% { clip-path: inset(40% 0 30% 0); }
          100% { clip-path: inset(60% 0 20% 0); }
        }

        @keyframes glitch-2 {
          0% { clip-path: inset(60% 0 20% 0); }
          20% { clip-path: inset(10% 0 70% 0); }
          40% { clip-path: inset(40% 0 30% 0); }
          60% { clip-path: inset(30% 0 40% 0); }
          80% { clip-path: inset(50% 0 10% 0); }
          100% { clip-path: inset(20% 0 60% 0); }
        }

        .cyber-subtitle {
          font-size: 1rem;
          font-weight: 400;
          color: var(--secondary-color);
          margin-top: 1rem;
          letter-spacing: 6px;
          animation: pulse 4s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; }
        }

        /* Cyberpunk Panel */
        .cyberpunk-panel {
          position: relative;
          background: var(--panel-bg);
          border: 2px solid var(--secondary-color);
          border-radius: 8px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 0 15px rgba(0, 255, 255, 0.5);
          overflow: hidden;
        }

        .cyberpunk-panel::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, 
              transparent 0%,
              var(--secondary-color) 50%,
              transparent 100%);
          animation: scanline 3s linear infinite;
        }

        @keyframes scanline {
          0% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(50vh); opacity: 0.8; }
          100% { transform: translateY(100vh); opacity: 0.5; }
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid rgba(0, 255, 255, 0.3);
        }

        .panel-label {
          font-size: 1rem;
          color: var(--accent-color);
          font-weight: 700;
          letter-spacing: 2px;
          position: relative;
          padding-left: 15px;
        }

        .panel-label::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 8px;
          height: 8px;
          background: var(--accent-color);
          clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
          animation: rotateDiamond 3s linear infinite;
        }

        @keyframes rotateDiamond {
          0% { transform: translateY(-50%) rotate(0deg); }
          100% { transform: translateY(-50%) rotate(360deg); }
        }

        .panel-dots {
          display: flex;
          gap: 6px;
        }

        .panel-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--secondary-color);
          animation: dotPulse 3s infinite;
        }

        .panel-dot:nth-child(2) { animation-delay: 0.6s; }
        .panel-dot:nth-child(3) { animation-delay: 1.2s; }
        .panel-dot:nth-child(4) { animation-delay: 1.8s; }
        .panel-dot:nth-child(5) { animation-delay: 2.4s; }

        @keyframes dotPulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.5); opacity: 1; }
        }

        /* Teleporter Pad */
        .teleporter-pad {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 300px;
          position: relative;
        }

        .cosmic-button {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem 2rem;
          background: transparent;
          border: 2px solid var(--primary-color);
          color: #fff;
          font-weight: 700;
          position: relative;
          overflow: hidden;
          cursor: pointer;
          border-radius: 4px;
          z-index: 1;
          transition: all 0.3s;
          text-align: center;
          margin-bottom: 2rem;
        }

        .cosmic-button:hover {
          transform: translateY(-3px);
          box-shadow: 0 0 15px var(--primary-color);
        }

        .cosmic-button::before {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          width: 0;
          height: 0;
          background: var(--primary-color);
          transform: translate(-50%, -50%);
          z-index: -1;
          transition: width 0.6s, height 0.6s;
        }

        .cosmic-button:hover::before {
          width: 300%;
          height: 300%;
        }

        .button-text {
          position: relative;
          z-index: 2;
          font-size: 1rem;
          letter-spacing: 1px;
          text-shadow: 0 0 5px #fff;
        }

        .teleporter-rings {
          position: absolute;
          width: 300px;
          height: 300px;
        }

        .teleporter-ring {
          position: absolute;
          border-radius: 50%;
          border: 4px dashed var(--secondary-color);
          box-shadow: 0 0 10px var(--secondary-color);
          animation: ringRotate 20s linear infinite;
        }

        .ring-1 {
          width: 100px;
          height: 100px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation-duration: 20s;
          animation-direction: normal;
        }

        .ring-2 {
          width: 200px;
          height: 200px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation-duration: 25s;
          animation-direction: reverse;
        }

        .ring-3 {
          width: 300px;
          height: 300px;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          animation-duration: 30s;
          animation-direction: normal;
        }

        @keyframes ringRotate {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }

        /* Portal Container */
        .portal-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2rem;
          position: relative;
        }

        .preview-container {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .preview-shield {
          position: relative;
          border-radius: 8px;
          overflow: hidden;
          border: 3px solid var(--secondary-color);
          box-shadow: 0 0 20px var(--secondary-color);
          width: 100%;
          max-width: 400px;
          height: 300px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .preview-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          z-index: 2;
          filter: drop-shadow(0 0 8px var(--glow-color));
        }

        .shield-effect {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, 
            rgba(255, 0, 255, 0.1) 0%,
            rgba(0, 255, 255, 0.1) 50%,
            rgba(255, 255, 0, 0.1) 100%);
          opacity: 0.5;
          z-index: 1;
          animation: shieldPulse 3s ease-in-out infinite;
        }

        @keyframes shieldPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }

        .image-stats {
          width: 100%;
          max-width: 400px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid var(--secondary-color);
          border-radius: 4px;
          padding: 0.75rem;
        }

        .stat-line {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
          font-family: monospace;
          font-size: 0.9rem;
        }

        .stat-label {
          color: var(--secondary-color);
        }

        .stat-value {
          color: #fff;
          text-shadow: 0 0 5px var(--secondary-color);
        }

        /* Energy Button */
        .energy-button {
          position: relative;
          padding: 1rem 2rem;
          background: transparent;
          border: none;
          color: #fff;
          font-weight: 700;
          font-size: 1rem;
          text-transform: uppercase;
          letter-spacing: 2px;
          cursor: pointer;
          overflow: hidden;
          transition: all 0.3s;
          z-index: 1;
        }

        .energy-button-inner {
          position: relative;
          z-index: 2;
          padding: 1rem 2rem;
          background: rgba(0, 0, 0, 0.7);
          border: 2px solid var(--energy-color);
          border-radius: 4px;
          transition: all 0.3s;
          animation: borderGradient 3s linear infinite;
        }

        .energy-button:disabled .energy-button-inner {
          opacity: 0.7;
          border-color: #555;
        }

        @keyframes borderGradient {
          0%, 100% { border-color: var(--energy-color); }
          50% { border-color: var(--primary-color); }
        }

        .energy-button-glow {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--energy-color);
          filter: blur(20px);
          opacity: 0.5;
          z-index: 0;
          transition: all 0.3s;
          transform: scale(0.9);
        }

        .energy-button:hover .energy-button-glow {
          transform: scale(1.1);
          opacity: 0.8;
        }

        .energy-button:disabled .energy-button-glow {
          opacity: 0.2;
        }

        /* Quantum Progress */
        .quantum-progress {
          width: 100%;
          max-width: 500px;
          margin: 1rem 0;
        }

        .quantum-progress-bar {
          height: 20px;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid var(--energy-color);
          border-radius: 10px;
          overflow: hidden;
          position: relative;
        }

        .quantum-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, 
            var(--energy-color), 
            var(--primary-color), 
            var(--secondary-color));
          background-size: 200% 100%;
          animation: gradientMove 2s linear infinite;
          position: relative;
          transition: width 0.3s ease;
        }

        .quantum-sparks {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .quantum-spark {
          position: absolute;
          width: 2px;
          height: 10px;
          background: #fff;
          border-radius: 50%;
          opacity: 0;
          animation: sparkFly 2s ease-out infinite;
        }

        @keyframes sparkFly {
          0% { 
            transform: translateY(10px) translateX(0); 
            opacity: 0; 
          }
          20% { 
            opacity: 1; 
          }
          100% { 
            transform: translateY(-20px) translateX(30px); 
            opacity: 0; 
          }
        }

        .quantum-spark:nth-child(1) { left: 10%; animation-delay: 0s; }
        .quantum-spark:nth-child(2) { left: 20%; animation-delay: 0.4s; }
        .quantum-spark:nth-child(3) { left: 30%; animation-delay: 0.8s; }
        .quantum-spark:nth-child(4) { left: 40%; animation-delay: 1.2s; }
        .quantum-spark:nth-child(5) { left: 50%; animation-delay: 0.2s; }
        .quantum-spark:nth-child(6) { left: 60%; animation-delay: 0.6s; }
        .quantum-spark:nth-child(7) { left: 70%; animation-delay: 1.0s; }
        .quantum-spark:nth-child(8) { left: 80%; animation-delay: 1.4s; }
        .quantum-spark:nth-child(9) { left: 90%; animation-delay: 0.3s; }
        .quantum-spark:nth-child(10) { left: 95%; animation-delay: 0.7s; }

        .quantum-progress-text {
          display: flex;
          justify-content: space-between;
          margin-top: 0.5rem;
          font-size: 0.9rem;
        }

        .quantum-percentage {
          color: var(--energy-color);
          font-weight: bold;
          text-shadow: 0 0 5px var(--energy-color);
        }

        .quantum-status {
          color: #fff;
          text-shadow: 0 0 3px #fff;
        }

        /* Success Portal */
        .success-portal {
          background: rgba(0, 0, 0, 0.5);
          border: 2px solid var(--accent-color);
          border-radius: 8px;
          padding: 1.5rem;
          width: 100%;
          max-width: 500px;
          position: relative;
          overflow: hidden;
        }

        .success-portal::before {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: radial-gradient(circle, 
            rgba(255, 255, 0, 0.2) 0%,
            transparent 70%);
          animation: successGlow 4s ease-in-out infinite;
        }

        @keyframes successGlow {
          0%, 100% { transform: scale(1); opacity: 0.2; }
          50% { transform: scale(1.2); opacity: 0.4; }
        }

        .success-title {
          font-size: 1.5rem;
          font-weight: bold;
          color: var(--accent-color);
          text-align: center;
          margin-bottom: 1rem;
          position: relative;
          text-shadow: 0 0 10px var(--accent-color);
          animation: successPulse 2s ease-in-out infinite;
        }

        @keyframes successPulse {
          0%, 100% { text-shadow: 0 0 10px var(--accent-color); }
          50% { text-shadow: 0 0 20px var(--accent-color), 0 0 30px var(--accent-color); }
        }

        .success-message {
          background: rgba(0, 0, 0, 0.6);
          border-radius: 4px;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .success-link {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .success-label {
          color: var(--secondary-color);
          font-size: 0.8rem;
          letter-spacing: 1px;
        }

        .quantum-link {
          color: #fff;
          text-decoration: none;
          font-family: monospace;
          word-break: break-all;
          position: relative;
          padding-left: 1rem;
          display: inline-block;
          text-shadow: 0 0 5px var(--secondary-color);
        }

        .quantum-link::before {
          content: '>';
          position: absolute;
          left: 0;
          top: 0;
          color: var(--secondary-color);
          animation: blinkCursor 1s step-end infinite;
        }

        @keyframes blinkCursor {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        .success-info {
          font-size: 0.9rem;
          color: var(--primary-color);
          text-align: center;
          margin-top: 0.5rem;
        }

        .reset-button {
          background: transparent;
          border: 2px solid var(--accent-color);
          color: #fff;
          padding: 0.75rem;
          width: 100%;
          font-size: 0.9rem;
          font-weight: bold;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.3s;
          position: relative;
          overflow: hidden;
          z-index: 1;
        }

        .reset-button::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: var(--accent-color);
          z-index: -1;
          transform: scaleX(0);
          transform-origin: left;
          transition: transform 0.3s;
        }

        .reset-button:hover::before {
          transform: scaleX(1);
        }

        /* Error Container */
        .error-container {
          background: rgba(50, 0, 0, 0.7);
          border: 2px solid #ff0000;
          border-radius: 8px;
          padding: 1.5rem;
          width: 100%;
          max-width: 500px;
          text-align: center;
        }

        .error-title {
          font-size: 1.5rem;
          font-weight: bold;
          color: #ff3333;
          margin-bottom: 1rem;
          animation: errorFlicker 2s infinite;
        }

        @keyframes errorFlicker {
          0%, 100% { text-shadow: 0 0 10px #ff0000; }
          50% { text-shadow: 0 0 20px #ff0000, 0 0 30px #ff0000; }
        }

        .error-message {
          color: #ff9999;
          margin-bottom: 1.5rem;
        }

        .error-button {
          background: transparent;
          border: 2px solid #ff3333;
          color: #fff;
          padding: 0.75rem 1.5rem;
          font-weight: bold;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.3s;
        }

        .error-button:hover {
          background: rgba(255, 0, 0, 0.3);
          box-shadow: 0 0 15px #ff3333;
        }

        /* Gallery Section */
        .gallery-container {
          margin-top: 3rem;
        }

        .gallery-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid var(--primary-color);
        }

        .gallery-title {
          font-size: 1.5rem;
          font-weight: bold;
          color: var(--primary-color);
          letter-spacing: 2px;
          position: relative;
          padding-left: 20px;
        }

        .gallery-title::before {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          transform: translateY(-50%);
          width: 12px;
          height: 12px;
          background: var(--primary-color);
          clip-path: polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%);
          animation: rotateDiamond 3s linear infinite;
        }

        .gallery-counter {
          font-size: 0.9rem;
          color: var(--secondary-color);
          background: rgba(0, 0, 0, 0.5);
          padding: 0.5rem 1rem;
          border-radius: 20px;
          border: 1px solid var(--secondary-color);
        }

        .empty-vault {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 200px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px dashed var(--primary-color);
          border-radius: 8px;
          padding: 2rem;
        }

        .empty-message {
          color: var(--primary-color);
          font-size: 1.2rem;
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .empty-icon {
          width: 80px;
          height: 80px;
          border: 2px dashed var(--secondary-color);
          border-radius: 50%;
          position: relative;
          animation: emptyPulse 3s infinite;
        }

        .empty-icon::before,
        .empty-icon::after {
          content: '';
          position: absolute;
          background: var(--secondary-color);
        }

        .empty-icon::before {
          width: 2px;
          height: 40px;
          top: 20px;
          left: 39px;
        }

        .empty-icon::after {
          width: 40px;
          height: 2px;
          top: 39px;
          left: 20px;
        }

        @keyframes emptyPulse {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.1); opacity: 1; }
        }

        /* Cosmic Grid */
        .cosmic-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 2rem;
          perspective: 1000px;
        }

        .cosmic-card {
          position: relative;
          height: 300px;
          transform-style: preserve-3d;
          transition: transform 0.6s;
        }

        .cosmic-card:hover {
          transform: rotateY(10deg) translateZ(10px);
        }

        .card-frame {
          position: relative;
          width: 100%;
          height: 100%;
          background: rgba(20, 20, 40, 0.8);
          border: 2px solid var(--primary-color);
          border-radius: 10px;
          overflow: hidden;
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
          transform-style: preserve-3d;
        }

        .card-frame::before {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          border: 2px solid transparent;
          border-image: linear-gradient(
            var(--hue-rotate),
            var(--primary-color),
            var(--secondary-color),
            var(--accent-color),
            var(--primary-color)
          ) 1;
          z-index: 1;
          pointer-events: none;
        }

        .image-container {
          width: 100%;
          height: 60%;
          position: relative;
          overflow: hidden;
        }

        .hero-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s;
        }

        .cosmic-card:hover .hero-image {
          transform: scale(1.1);
        }

        .image-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            to bottom,
            transparent 70%,
            rgba(20, 20, 40, 0.8) 100%
          );
        }

        .delete-button {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: rgba(255, 0, 0, 0.7);
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 3;
          opacity: 0;
          transition: all 0.3s;
        }

        .cosmic-card:hover .delete-button {
          opacity: 1;
        }

        .delete-button:hover {
          background: #ff0000;
          box-shadow: 0 0 10px #ff0000;
          transform: scale(1.1);
        }

        .delete-icon {
          color: #fff;
        }

        .card-details {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 1rem;
          background: rgba(20, 20, 40, 0.9);
          border-top: 1px solid var(--primary-color);
        }

        .filename {
          font-weight: bold;
          color: #fff;
          margin-bottom: 0.25rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .filesize {
          font-size: 0.8rem;
          color: var(--secondary-color);
          margin-bottom: 0.25rem;
        }

        .timestamp {
          font-size: 0.7rem;
          color: #aaa;
          margin-bottom: 0.5rem;
        }

        .view-link {
          display: inline-block;
          font-size: 0.8rem;
          color: var(--accent-color);
          text-decoration: none;
          transition: all 0.3s;
        }

        .view-link:hover {
          color: #fff;
          text-shadow: 0 0 5px var(--accent-color);
        }

        /* Media Queries */
        @media (max-width: 768px) {
          .glitch-text {
            font-size: 2rem;
          }
          
          .cosmic-grid {
            grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
            gap: 1rem;
          }
          
          .cosmic-card {
            height: 250px;
          }
        }

        @media (max-width: 480px) {
          .glitch-text {
            font-size: 1.5rem;
          }
          
          .cosmic-grid {
            grid-template-columns: 1fr;
          }
          
          .preview-shield {
            height: 200px;
          }
        }
      `}</style>
      </div>
  );
}