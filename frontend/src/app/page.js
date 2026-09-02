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

  // Load Favorites from LocalStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('wedding_gallery_favs');
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse favorites:', e);
      }
    }
  }, []);

  // Save Favorites to LocalStorage whenever updated
  useEffect(() => {
    localStorage.setItem('wedding_gallery_favs', JSON.stringify(favorites));
  }, [favorites]);

  // Fetch photos from backend
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
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download failed:', err);
      window.open(url, '_blank');
    }
  };

  // Bulk Download Favorites ZIP
  const handleDownloadAllFavorites = async () => {
    if (favorites.length === 0) return;
    setDownloadingFavs(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://photo-gallery-iw5a.onrender.com';
      const response = await fetch(`${apiUrl}/api/download-favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoIds: favorites }),
      });

      if (!response.ok) throw new Error('Failed to generate ZIP file');

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = 'wedding-favorites.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error('Download favorites ZIP failed:', err);
      alert('Failed to download favorites ZIP file.');
    } finally {
      setDownloadingFavs(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#111] text-stone-300">
        <p className="text-xs tracking-[0.25em] uppercase font-light animate-pulse">Loading Gallery...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#111] text-stone-100 p-6 text-center">
        <h2 className="text-xl font-serif font-light mb-2">Connection Error</h2>
        <p className="max-w-md text-stone-400 text-sm">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2.5 bg-white text-stone-900 text-xs tracking-widest uppercase rounded-none hover:bg-stone-200 transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const currentPhotos =
    activeTab === 'Favorites'
      ? data.photos.filter((p) => favorites.includes(p.id))
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

  // Find a background image for the Favorites page blurred background
  const favoritePhotosList = data.photos.filter((p) => favorites.includes(p.id));
  const favoritesBgUrl = favoritePhotosList.length > 0 ? favoritePhotosList[0].url : '/cover-bg.jpg';

  return (
    <main className="min-h-screen text-stone-900 select-none relative bg-[#FDFBF7]">
      {/* Google Fonts Import for Aesthetic Script */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
      <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400..700&display=swap" rel="stylesheet" />

      {/* Persistent Top Right Floating Favorites Button */}
      <div className="fixed top-6 right-6 z-50">
        <button
          onClick={() => setActiveTab('Favorites')}
          className={`px-5 py-2.5 rounded-none text-[11px] font-light tracking-[0.2em] uppercase transition-all duration-300 flex items-center gap-2.5 backdrop-blur-md shadow-sm border ${
            activeTab === 'Favorites'
              ? 'bg-stone-900/80 text-white border-stone-700 hover:bg-stone-900'
              : 'bg-stone-900/60 text-white border-white/20 hover:bg-stone-900/80'
          }`}
        >
          <span className="text-xs text-red-400">♥</span>
          <span className="font-normal">Favorites</span>
          <span className="ml-0.5 px-2 py-0.5 rounded-none text-[10px] tracking-normal bg-white/20 text-white">
            {favorites.length}
          </span>
        </button>
      </div>

      {/* Persistent Top Left Title */}
      <div className="fixed top-6 left-6 z-50 pointer-events-none">
        <span className="text-white text-xs uppercase tracking-[0.25em] font-light drop-shadow-md">
          Yaseen <span className="italic font-normal">&amp;</span> Nada
        </span>
      </div>

      {/* Global Full-Page Blurred Background ONLY for Favorites Tab */}
      {activeTab === 'Favorites' && (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
          <img
            src={favoritesBgUrl}
            alt="Favorites Background"
            className="w-full h-full object-cover object-center filter blur-3xl scale-110 opacity-40"
          />
          <div className="absolute inset-0 bg-[#FDFBF7]/85 backdrop-blur-2xl"></div>
        </div>
      )}

      {/* Hero Cover Section (Always shown at top on initial load, scroll down to see gallery) */}
      <section className="relative h-screen w-full flex flex-col justify-center items-center text-center px-6 overflow-hidden bg-stone-950">
        {/* Background Image & Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="/cover-bg.jpg"
            alt="Wedding Cover"
            className="w-full h-full object-cover object-center"
          />
          {/* Subtle dark gradient overlay to make text pop like in your photo */}
          <div className="absolute inset-0 bg-stone-950/40"></div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-4xl space-y-4 text-white mt-12">
          {/* Groom & Bride Names with Aesthetic Script Font */}
          <h1 className="text-6xl md:text-8xl tracking-wide drop-shadow-lg" style={{ fontFamily: "'Dancing Script', cursive" }}>
            Yaseen <span className="text-stone-300 italic font-normal">&amp;</span> Nada
          </h1>
          
          <div className="flex items-center justify-center gap-4 text-stone-300 text-xs pt-2">
            <span className="h-[1px] w-10 bg-white/40"></span>
            <span className="uppercase tracking-[0.3em] font-light drop-shadow-md">18 July 2025</span>
            <span className="h-[1px] w-10 bg-white/40"></span>
          </div>
        </div>

        {/* Scroll Down Indicator */}
        <div className="absolute bottom-8 z-10 flex flex-col items-center text-white/70 animate-bounce">
          <span className="text-[10px] uppercase tracking-[0.25em] font-light mb-1">Scroll</span>
          <span className="text-xs">↓</span>
        </div>
      </section>

      {/* Gallery Content Section (Appears below the full-height cover banner) */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-16">
        {/* Navigation Area: Left-aligned Back button on Favorites, or Centered Album Tabs otherwise */}
        <nav className={`flex ${activeTab === 'Favorites' ? 'justify-start' : 'justify-center'} gap-2 flex-wrap mb-10`}>
          {activeTab === 'Favorites' ? (
            <button
              onClick={() => {
                if (data.albums && data.albums.length > 0) {
                  setActiveTab(data.albums[0]);
                }
              }}
              className="px-6 py-2.5 bg-white/80 hover:bg-white text-stone-900 text-xs font-light tracking-[0.2em] uppercase rounded-none border border-stone-300 hover:border-stone-900 transition-all duration-300 shadow-sm backdrop-blur-md flex items-center gap-2"
            >
              <span>←</span> Back to Gallery
            </button>
          ) : (
            data.albums.map((album) => (
              <button
                key={album}
                onClick={() => setActiveTab(album)}
                className={`px-6 py-2.5 rounded-none text-xs font-light tracking-[0.15em] uppercase transition-all ${
                  activeTab === album
                    ? 'bg-stone-900 text-white font-normal shadow-sm'
                    : 'bg-stone-100/90 text-stone-600 hover:bg-stone-200 hover:text-stone-900 border border-stone-200'
                }`}
              >
                {album} 
              </button>
            ))
          )}
        </nav>

        {/* Dynamic Album Title Header */}
        {activeTab !== 'Favorites' && (
          <div className="text-center mb-12 space-y-1">
            <h2 className="text-2xl md:text-3xl font-light tracking-[0.2em] uppercase text-stone-800">
              {activeTab}
            </h2>
            <p className="text-[11px] tracking-[0.15em] uppercase text-stone-400 font-light">
              {activeTab} Moments
            </p>
          </div>
        )}

        {/* Favorites Header floating over blurred background */}
        {activeTab === 'Favorites' && (
          <div className="text-center mb-12 space-y-3">
            <p className="text-[10px] uppercase tracking-[0.3em] text-stone-500 font-light">
              Curated Collection
            </p>
            <h2 className="text-4xl md:text-6xl font-light tracking-wide text-stone-900" style={{ fontFamily: "'Dancing Script', cursive" }}>
              Your Favorite Moments
            </h2>
            <div className="flex items-center justify-center gap-4 text-stone-500 text-xs pt-1">
              <span className="h-[1px] w-8 bg-stone-300"></span>
              <span className="uppercase tracking-[0.2em] text-[10px] font-light">Saved Memories</span>
              <span className="h-[1px] w-8 bg-stone-300"></span>
            </div>
          </div>
        )}

        {/* Download All Favorites Button */}
        {activeTab === 'Favorites' && favorites.length > 0 && (
          <div className="flex justify-center mb-12">
            <button
              onClick={handleDownloadAllFavorites}
              disabled={downloadingFavs}
              className="px-8 py-3 bg-white/80 hover:bg-white text-stone-900 text-xs tracking-[0.2em] uppercase font-light rounded-none border border-stone-300 hover:border-stone-900 shadow-sm backdrop-blur-md transition-all duration-300 flex items-center gap-3 disabled:opacity-50"
            >
              {downloadingFavs ? 'Packing ZIP File...' : `Download All (${favorites.length})`}
            </button>
          </div>
        )}

        {/* Photo Grid */}
        {currentPhotos.length === 0 ? (
          <div className="text-center py-24 space-y-4">
            <span className="text-3xl text-stone-300">♥</span>
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
                  className="group relative cursor-pointer overflow-hidden rounded-none bg-stone-200 aspect-[4/5] shadow-sm hover:shadow-md border border-stone-200 transition-all duration-300"
                >
                  <img
                    src={photo.url}
                    alt={photo.filename}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />

                  {/* Overlay Controls */}
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

              <div className="h-4 w-[1px] bg-stone-800" />

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