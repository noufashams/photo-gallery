'use client';

import { useState } from 'react';
import RowsPhotoAlbum from 'react-photo-album';
import Lightbox from 'yet-another-react-lightbox';
import 'react-photo-album/rows.css';
import 'yet-another-react-lightbox/styles.css';

export default function Gallery({ albums }) {
  const [activeTab, setActiveTab] = useState(Object.keys(albums)[0]);
  const [index, setIndex] = useState(-1);

  const currentPhotos = albums[activeTab] || [];

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 px-6 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-light tracking-widest uppercase">Yaseen & Nada</h1>
        <p className="text-xs text-neutral-400 mt-2 uppercase tracking-wider">Wedding Gallery</p>
      </div>

      {/* Album Tabs */}
      <div className="flex justify-center gap-8 border-b border-neutral-800 pb-4 mb-8 text-sm">
        {Object.keys(albums).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`capitalize tracking-wide transition-colors ${
              activeTab === tab
                ? 'text-white font-medium border-b-2 border-white pb-4 -mb-4'
                : 'text-neutral-500 hover:text-neutral-300'
            }`}
          >
            {tab.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Photo Grid */}
      <RowsPhotoAlbum
        photos={currentPhotos}
        targetRowHeight={300}
        onClick={({ index }) => setIndex(index)}
      />

      {/* Lightbox Preview */}
      <Lightbox
        open={index >= 0}
        index={index}
        close={() => setIndex(-1)}
        slides={currentPhotos.map((p) => ({ src: p.src }))}
      />
    </div>
  );
}