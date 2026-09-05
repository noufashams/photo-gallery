'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [data, setData] = useState({ albums: [], photos: [] });
  const [activeTab, setActiveTab] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Interactive States
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState(null);
  const [favorites, setFavorites] = useState([]);
  const [downloadingFavs, setDownloadingFavs] = useState(false);

  // Map your custom dates for each specific album name here
  const albumDates = {
    'mehndi night': '9 October 2025',
    'nikkah': '10 October 2025',
    'WEDDING DAY': '18 JULY 2026',
    'wedding eve': '17 JULY 2026',
    

    // Add any other albums and their custom dates here
  };

  // Load Favorites from LocalStorage on mount and sanitize
  useEffect(() => {
    const saved = localStorage.getItem('wedding_gallery_favs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setFavorites(Array.isArray(parsed) ? parsed : []);
      } catch (e) {
        console.error('Failed to parse favorites:', e);
        setFavorites([]);
      }
    }
  }, []);

  // Save Favorites to LocalStorage whenever updated
  useEffect(() => {
    localStorage.setItem('wedding_gallery_favs', JSON.stringify(favorites));
  }, [favorites]);

  // Fetch photos from backend and clean stale IDs
  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://photo-gallery-iw5a.onrender.com';

    fetch(`${apiUrl}/api/photos`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((resData) => {
        if (resData.success) {
          setData(resData);
          if (resData.albums && resData.albums.length > 0) {
            setActiveTab(resData.albums[0]);
          }

          const validPhotoIds = new Set(resData.photos.map((p) => p.id));
          setFavorites((prev) => prev.filter((id) => validPhotoIds.has(id)));
        } else {
          setError(resData.error || 'Failed to load photos');
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Fetch error:', err);
        setError('Could not connect to backend server.');
        setLoading(false);
      });
  }, []);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (selectedPhotoIndex === null) return;
      if (e.key === 'Escape') setSelectedPhotoIndex(null);
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhotoIndex]);

  const toggleFavorite = (photoId, e) => {
    if (e) e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(photoId) ? prev.filter((id) => id !== photoId) : [...prev, photoId]
    );
  };

  const handleDownloadSingle = async (url, filename) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename && filename.includes('.') ? filename : `${filename || 'photo'}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed:', err);
      window.open(url, '_blank');
    }
  };

  // Bulletproof Client-side ZIP download with enforced .jpg extensions
  const handleDownloadAllFavorites = async () => {
    const validFavorites = favorites.filter((id) => data.photos.some((p) => p.id === id));
    if (validFavorites.length === 0) return;
    setDownloadingFavs(true);

    try {
      if (!window.JSZip) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
          script.onerror = () => {
            const fallback = document.createElement('script');
            fallback.src = 'https://unpkg.com/jszip@3.10.1/dist/jszip.min.js';
            fallback.onload = resolve;
            fallback.onerror = reject;
            document.head.appendChild(fallback);
          };
          script.onload = resolve;
          document.head.appendChild(script);
        });
      }

      const zip = new window.JSZip();
      const selectedPhotosData = data.photos.filter((p) => validFavorites.includes(p.id));

      await Promise.all(
        selectedPhotosData.map(async (photo, idx) => {
          try {
            const response = await fetch(photo.url);
            const blob = await response.blob();
            
            let baseName = photo.filename || photo.id.split('/').pop() || `wedding_photo_${idx + 1}`;
            if (baseName.includes('.')) {
              baseName = baseName.substring(0, baseName.lastIndexOf('.'));
            }
            const safeFilename = `${baseName}.jpg`;

            zip.file(safeFilename, blob);
          } catch (err) {
            console.error(`Failed to fetch image for zip: ${photo.url}`, err);
          }
        })
      );

      const content = await zip.generateAsync({ type: 'blob' });
      const blobUrl = window.URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'wedding-favorites.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Client-side ZIP generation failed:', err);
      alert('Failed to download ZIP file.');
    } finally {
      setDownloadingFavs(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FDFBF7] text-stone-800">
        <p className="text-xs tracking-[0.25em] uppercase font-light animate-pulse text-stone-500">Loading Gallery...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FDFBF7] text-stone-900 p-6 text-center">
        <h2 className="text-xl font-serif font-light mb-2">Connection Error</h2>
        <p className="max-w-md text-stone-500 text-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2.5 bg-stone-900 text-white text-xs tracking-widest uppercase rounded-none hover:bg-stone-800 transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const currentFavoritesList = data.photos.filter((p) => favorites.includes(p.id));

  const currentPhotos =
    activeTab === 'Favorites'
      ? currentFavoritesList
      : data.photos.filter((p) => p.folder === activeTab);

  const selectedPhoto = selectedPhotoIndex !== null ? currentPhotos[selectedPhotoIndex] : null;

  const handleNext = () => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex < currentPhotos.length - 1) {
      setSelectedPhotoIndex(selectedPhotoIndex + 1);
    }
  };

  const handlePrev = () => {
    if (selectedPhotoIndex !== null && selectedPhotoIndex > 0) {
      setSelectedPhotoIndex(selectedPhotoIndex - 1);
    }
  };

  return (
    <main className={`min-h-screen select-none relative transition-colors duration-500 ${
      activeTab === 'Favorites' ? 'bg-[#F9F1F2] text-stone-900' : 'bg-[#FDFBF7] text-stone-900'
    }`}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400..700&display=swap" rel="stylesheet" />

      {/* Persistent Top Right Floating Favorites Button */}
      <div className="fixed top-6 right-6 z-50">
        <button
          onClick={() => setActiveTab('Favorites')}
          className={`px-5 py-2.5 rounded-none text-[11px] font-light tracking-[0.2em] uppercase transition-all duration-300 flex items-center gap-2.5 backdrop-blur-md shadow-sm border ${
            activeTab === 'Favorites'
              ? 'bg-white/60 text-stone-900 border-rose-200 hover:bg-white/80 shadow-rose-100/50'
              : 'bg-stone-900/60 text-white border-white/20 hover:bg-stone-900/80'
          }`}
        >
          <span className="text-xs text-red-500">♥</span>
          <span className="font-normal">Favorites</span>
          <span className={`ml-0.5 px-2 py-0.5 rounded-none text-[10px] tracking-normal ${
            activeTab === 'Favorites' ? 'bg-rose-100 text-stone-800 border border-rose-200' : 'bg-white/20 text-white'
          }`}>
            {currentFavoritesList.length}
          </span>
        </button>
      </div>

      {/* Persistent Top Left Back Button (Only shown when on Favorites tab) */}
      {activeTab === 'Favorites' && (
        <div className="fixed top-6 left-6 z-50">
          <button
            onClick={() => {
              if (data.albums && data.albums.length > 0) {
                setActiveTab(data.albums[0]);
              }
            }}
            className="px-5 py-2.5 bg-white/60 text-stone-900 text-[11px] font-light tracking-[0.2em] uppercase rounded-none border border-rose-200 hover:bg-white/80 transition-all duration-300 shadow-sm flex items-center gap-2 backdrop-blur-md shadow-rose-100/50"
          >
            <span>←</span> Back
          </button>
        </div>
      )}

      {/* Hero Cover Section (Only shown when NOT on Favorites tab) */}
      {activeTab !== 'Favorites' && (
        <section className="relative h-screen w-full flex flex-col justify-center items-center text-center px-6 overflow-hidden bg-stone-950">
          <div className="absolute inset-0 z-0">
            <img
              src="/cover-bg.jpg"
              alt="Wedding Cover"
              className="w-full h-full object-cover object-center"
            />
            <div className="absolute inset-0 bg-stone-950/40"></div>
          </div>

          <div className="relative z-10 max-w-4xl space-y-4 text-white mt-12">
            <h1 className="text-6xl md:text-8xl tracking-wide drop-shadow-lg" style={{ fontFamily: "'Dancing Script', cursive" }}>
              Yaseen <span className="text-stone-300 italic font-normal">&amp;</span> Nada
            </h1>
            
            <div className="flex items-center justify-center gap-4 text-stone-300 text-xs pt-2">
              <span className="h-[1px] w-12 bg-white/40"></span>
              <span className="uppercase tracking-[0.2em] text-[11px] font-light drop-shadow-md">Wedding Celebration</span>
              <span className="h-[1px] w-12 bg-white/40"></span>
            </div>
          </div>

          <div className="absolute bottom-8 z-10 flex flex-col items-center text-white/70 animate-bounce">
            <span className="text-[10px] uppercase tracking-[0.25em] font-light mb-1">Scroll</span>
            <span className="text-xs">↓</span>
          </div>
        </section>
      )}

      {/* Gallery Content Section */}
      <section className={`relative z-10 max-w-7xl mx-auto px-6 py-16 ${activeTab === 'Favorites' ? 'pt-28' : ''}`}>
        {/* Navigation tabs (Only album tabs shown here now) */}
        {activeTab !== 'Favorites' && (
          <nav className="flex justify-center gap-2 flex-wrap mb-10">
            {data.albums.map((album) => (
              <button
                key={album}
                onClick={() => setActiveTab(album)}
                className={`px-6 py-2.5 rounded-none text-xs font-light tracking-[0.15em] uppercase transition-all ${
                  activeTab === album
                    ? 'bg-stone-900 text-white font-normal shadow-sm'
                    : 'bg-stone-100/80 text-stone-600 hover:bg-stone-200 hover:text-stone-900 border border-stone-200'
                }`}
              >
                {album} 
              </button>
            ))}
          </nav>
        )}

        {activeTab !== 'Favorites' && (
          <div className="text-center mb-12 space-y-1">
            <h2 className="text-2xl md:text-3xl font-light tracking-[0.2em] uppercase text-stone-800">
              {activeTab}
            </h2>
            <p className="text-[11px] tracking-[0.15em] uppercase text-stone-400 font-light">
              {albumDates[activeTab] || 'Wedding Celebration'}
            </p>
          </div>
        )}

        {activeTab === 'Favorites' && (
          <div className="text-center mb-12 space-y-3">
            <p className="text-[10px] uppercase tracking-[0.3em] text-rose-400 font-light">
              Curated Collection
            </p>
            <h2 className="text-4xl md:text-5xl font-light tracking-wide text-stone-900" style={{ fontFamily: "'Dancing Script', cursive" }}>
              Your Favorite Moments
            </h2>
            <div className="flex items-center justify-center gap-4 text-rose-300 text-xs pt-1">
              <span className="h-[1px] w-8 bg-rose-200"></span>
              <span className="uppercase tracking-[0.2em] text-[10px] font-light text-stone-500">Saved Memories</span>
              <span className="h-[1px] w-8 bg-rose-200"></span>
            </div>
          </div>
        )}

        {activeTab === 'Favorites' && currentFavoritesList.length > 0 && (
          <div className="flex justify-center mb-12">
            <button
              onClick={handleDownloadAllFavorites}
              disabled={downloadingFavs}
              className="px-8 py-3 bg-white/70 hover:bg-white text-stone-900 text-xs tracking-[0.2em] uppercase font-light rounded-none border border-rose-200 shadow-sm transition-all duration-300 flex items-center gap-3 disabled:opacity-50 backdrop-blur-md"
            >
              {downloadingFavs ? 'Packing ZIP File...' : `Download All (${currentFavoritesList.length})`}
            </button>
          </div>
        )}

        {currentPhotos.length === 0 ? (
          <div className="text-center py-24 space-y-4">
            <span className="text-3xl text-rose-300">♥</span>
            <p className="text-stone-500 font-light text-sm tracking-widest uppercase">
              {activeTab === 'Favorites' ? 'No favorite photos added yet' : 'No photos found in this category.'}
            </p>
            {activeTab === 'Favorites' && (
              <p className="text-stone-400 text-xs font-light max-w-sm mx-auto">
                Tap the heart icon on any photograph while browsing the gallery to curate your personal collection.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {currentPhotos.map((photo, index) => {
              const isFav = favorites.includes(photo.id);
              return (
                <div
                  key={photo.id}
                  onClick={() => setSelectedPhotoIndex(index)}
                  className="group relative cursor-pointer overflow-hidden rounded-none bg-stone-200 aspect-[4/5] shadow-sm hover:shadow-md border-0 transition-all duration-300"
                >
                  <img
                    src={photo.url}
                    alt={photo.filename}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/60 via-transparent to-stone-950/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-4 flex flex-col justify-between">
                    <div className="flex justify-end">
                      <button
                        onClick={(e) => toggleFavorite(photo.id, e)}
                        className="w-9 h-9 rounded-full bg-white/90 hover:bg-white text-stone-800 flex items-center justify-center shadow-md backdrop-blur-md transition"
                        title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <span className={`text-xs ${isFav ? 'text-red-500' : 'text-stone-700'}`}>♥</span>
                      </button>
                    </div>
                    <div className="flex justify-between items-center text-xs text-white">
                      <span className="truncate pr-2 font-mono text-[10px] text-stone-300 font-light">{photo.filename}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadSingle(photo.url, photo.filename);
                        }}
                        className="px-3 py-1 bg-stone-900/80 hover:bg-stone-900 backdrop-blur-md text-white rounded-none text-[10px] tracking-widest uppercase transition border border-stone-700"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Lightbox Modal */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/90 backdrop-blur-md p-4">
          <button
            onClick={() => setSelectedPhotoIndex(null)}
            className="absolute top-6 right-6 z-10 p-3 text-stone-400 hover:text-white text-xl font-light transition"
          >
            ✕
          </button>

          {selectedPhotoIndex > 0 && (
            <button
              onClick={handlePrev}
              className="absolute left-6 z-10 p-3 bg-stone-900/60 hover:bg-stone-900 text-white rounded-none transition border border-stone-800"
            >
              ◀
            </button>
          )}

          {selectedPhotoIndex < currentPhotos.length - 1 && (
            <button
              onClick={handleNext}
              className="absolute right-6 z-10 p-3 bg-stone-900/60 hover:bg-stone-900 text-white rounded-none transition border border-stone-800"
            >
              ▶
            </button>
          )}

          <div className="max-w-5xl max-h-[85vh] flex flex-col items-center">
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.filename}
              className="max-w-full max-h-[75vh] object-contain rounded-none shadow-2xl"
            />

            <div className="mt-6 flex items-center gap-6 bg-stone-900/95 border border-stone-800 backdrop-blur-md px-6 py-3 rounded-none shadow-2xl text-white">
              <span className="text-[11px] tracking-[0.15em] uppercase text-stone-400 font-light">
                {selectedPhoto.folder} • {selectedPhotoIndex + 1} / {currentPhotos.length}
              </span>

              <div className="h-4 w-[1px] bg-stone-800" />

              <button
                onClick={() => toggleFavorite(selectedPhoto.id)}
                className={`flex items-center gap-2 text-[11px] font-light tracking-[0.15em] uppercase transition ${
                  favorites.includes(selectedPhoto.id) ? 'text-red-500' : 'text-stone-400 hover:text-white'
                }`}
              >
                ♥ {favorites.includes(selectedPhoto.id) ? 'Favorited' : 'Favorite'}
              </button>

              <div className="h-4 w-[1px] text-white/20" />

              <button
                onClick={() => handleDownloadSingle(selectedPhoto.url, selectedPhoto.filename)}
                className="flex items-center gap-2 text-[11px] font-light tracking-[0.15em] uppercase text-stone-300 hover:text-white transition"
              >
                Download Image
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}