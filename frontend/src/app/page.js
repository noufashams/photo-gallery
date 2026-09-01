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
      <div className="flex min-h-screen items-center justify-center bg-[#FBF9F5] text-stone-800">
        <p className="text-xs tracking-[0.25em] uppercase font-light animate-pulse text-stone-500">Loading Gallery...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FBF9F5] text-stone-900 p-6 text-center">
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

  return (
    <main className="min-h-screen bg-[#FBF9F5] text-stone-900 select-none relative">
      {/* Top Right Floating Favorites Button */}
      <div className="fixed top-6 right-6 z-40">
        <button
          onClick={() => setActiveTab('Favorites')}
          className={`px-5 py-2.5 rounded-none text-xs font-medium tracking-widest uppercase transition-all flex items-center gap-2 backdrop-blur-md shadow-sm border ${
            activeTab === 'Favorites'
              ? 'bg-stone-900 text-white border-stone-900'
              : 'bg-[#FBF9F5]/90 text-stone-800 hover:bg-stone-100 border-stone-300'
          }`}
        >
          <span className="text-stone-400">♥</span>
          <span>Favorites</span>
          <span className="ml-1 bg-stone-200 text-stone-900 px-2 py-0.5 rounded-none text-[10px] font-semibold">
            {favorites.length}
          </span>
        </button>
      </div>

      {/* Hero Cover Section with Background Image */}
      <section className="relative min-h-[70vh] flex flex-col justify-center items-center text-center px-6 border-b border-stone-200 overflow-hidden">
        {/* Background Image & Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="/cover-bg.jpg"
            alt="Wedding Cover"
            className="w-full h-full object-cover object-center"
          />
          {/* Dark overlay to keep text readable */}
          <div className="absolute inset-0 bg-stone-950/40"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-4xl space-y-5 text-white">
          <p className="text-xs uppercase tracking-[0.3em] text-stone-300 font-light drop-shadow-md">
            Together Forever
          </p>
          
          {/* Groom & Bride Names */}
          <h1 className="text-5xl md:text-7xl font-serif font-light tracking-wide drop-shadow-lg">
            YASEEN <span className="text-stone-300 italic font-normal">&amp;</span> NADA
          </h1>
          
          <div className="flex items-center justify-center gap-4 text-stone-300 text-sm">
            <span className="h-[1px] w-12 bg-white/40"></span>
            <span className="uppercase tracking-[0.2em] text-[11px] font-light drop-shadow-md">Wedding Celebration</span>
            <span className="h-[1px] w-12 bg-white/40"></span>
          </div>
        </div>
      </section>

      {/* Gallery Content Section */}
      <section className="max-w-7xl mx-auto px-6 py-12">
        {/* Category Navigation Tabs */}
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

        {/* Download All Favorites Button */}
        {activeTab === 'Favorites' && favorites.length > 0 && (
          <div className="flex justify-center mb-10">
            <button
              onClick={handleDownloadAllFavorites}
              disabled={downloadingFavs}
              className="px-8 py-3 bg-stone-900 hover:bg-stone-800 text-white text-xs tracking-[0.2em] uppercase font-light rounded-none shadow-sm transition flex items-center gap-3 disabled:opacity-50"
            >
              {downloadingFavs ? 'Packing ZIP File...' : `Download All Favorites (${favorites.length})`}
            </button>
          </div>
        )}

        {/* Photo Grid */}
        {currentPhotos.length === 0 ? (
          <div className="text-center py-24 text-stone-400 font-light text-sm tracking-wide">
            {activeTab === 'Favorites'
              ? 'No favorite photos added yet. Click the heart icon on any photo to save it here.'
              : 'No photos found in this category.'}
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
                        className={`p-2.5 rounded-none backdrop-blur-md transition ${
                          isFav ? 'bg-stone-900 text-white' : 'bg-white/90 text-stone-800 hover:bg-white'
                        }`}
                        title={isFav ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        ♥
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
                  favorites.includes(selectedPhoto.id) ? 'text-stone-200' : 'text-stone-400 hover:text-white'
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