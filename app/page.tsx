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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadStatus('idle');
      setImageLink(null);
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
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-5xl p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Hero Image Upload</h1>
        
        {/* Upload Section */}
        <div className="mb-8 p-6 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Upload New Hero Image</h2>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Choose an image
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100"
            />
          </div>

          {previewUrl && (
            <div className="mb-6">
              <h2 className="text-sm font-medium text-gray-700 mb-2">Preview</h2>
              <div className="border rounded-md p-2">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-64 mx-auto"
                />
              </div>
            </div>
          )}

          {selectedFile && (
            <div className="mb-6">
              <button
                onClick={handleUpload}
                disabled={uploadStatus === 'uploading'}
                className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  uploadStatus === 'uploading'
                    ? 'bg-blue-300'
                    : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
              >
                {uploadStatus === 'uploading' ? 'Uploading...' : 'Upload Hero Image'}
              </button>
            </div>
          )}

          {uploadStatus === 'uploading' && (
            <div className="mb-6">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Progress: {uploadProgress}%
              </p>
            </div>
          )}

          {uploadStatus === 'success' && imageLink && (
            <div className="mb-6 p-4 bg-green-50 rounded-md">
              <h2 className="text-sm font-medium text-green-800 mb-2">Upload Successful!</h2>
              <p className="text-sm text-green-700 mb-2">
                Image URL: <a href={imageLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{imageLink}</a>
              </p>
              <p className="text-sm text-green-700">The URL has been saved to heroImages collection.</p>
              <button
                onClick={resetForm}
                className="mt-3 inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Upload Another Image
              </button>
            </div>
          )}

          {uploadStatus === 'error' && (
            <div className="mb-6 p-4 bg-red-50 rounded-md">
              <h2 className="text-sm font-medium text-red-800">Upload Failed</h2>
              <p className="text-sm text-red-700">Please try again.</p>
              <button
                onClick={resetForm}
                className="mt-3 inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Gallery Section */}
        <div>
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Hero Images Gallery</h2>
          
          {heroImages.length === 0 ? (
            <p className="text-gray-500">No hero images uploaded yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {heroImages.map((image) => (
                <div key={image.id} className="border rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  <div className="relative h-48 bg-gray-100">
                    <img
                      src={image.imageUrl}
                      alt={image.originalFilename}
                      className="w-full h-full object-contain"
                    />
                    <button
                      onClick={() => deleteHeroImage(image)}
                      disabled={isDeleting === image.id}
                      className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      aria-label="Delete hero image"
                    >
                      {isDeleting === image.id ? (
                        <FaSpinner className="animate-spin" />
                      ) : (
                        <FaTrash />
                      )}
                    </button>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-gray-900 truncate">{image.originalFilename}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(image.size)}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Uploaded: {new Date(image.createdAt).toLocaleDateString()}
                    </p>
                    <a
                      href={image.imageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline block mt-2 truncate"
                    >
                      View Full Image
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}