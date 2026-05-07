import React, { useState, useEffect, useRef } from 'react';
import API_URLS, { BRAND, CATEGORIES } from './config';

const STORAGE_ACCOUNT = 'cloudphlogstorage';
const CONTAINER = 'audio';
const SAS_TOKEN = 'sv=2025-11-05&ss=bfqt&srt=co&sp=rwdlacupiytfx&se=2026-06-07T04:05:55Z&st=2026-05-07T19:50:55Z&spr=https&sig=1ivDnTobeYnqFySYFCpLEMVQd2OWRqrJt%2F8dGwTp37s%3D';
const CAT_COLOR = { Nature: BRAND.teal, Music: BRAND.violet, Water: BRAND.azure, Ambient: '#F59E0B' };
const accent = (cat) => CAT_COLOR[cat] || BRAND.teal;
const fmtTime = (s) => { const sec = parseInt(s) || 0; return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`; };
const WAVE_H = Array.from({ length: 40 }, (_, i) => Math.max(10, 20 + Math.sin(i * 0.7) * 26 + Math.sin(i * 1.4) * 12));
const suggestTags = (title, category) => {
  const catTags = { Nature: ['nature', 'outdoor', 'earth'], Music: ['music', 'audio', 'sound'], Water: ['water', 'aquatic', 'ocean'], Ambient: ['ambient', 'background', 'atmospheric'] };
  const titleWords = (title || '').toLowerCase().split(/\s+/).filter(w => w.length > 3);
  const suggested = [...(catTags[category] || []), ...titleWords.slice(0, 3)];
  return [...new Set(suggested)].slice(0, 5);
};

function UploadZone({ onUploaded, currentUrl }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef();

  const uploadFile = async (file) => {
    if (!file) return;
    if (!file.name.match(/\.(mp3|wav|flac)$/i) && !file.type.startsWith('audio/')) {
      alert('Please upload an MP3, WAV, or FLAC file.'); return;
    }
    setUploading(true); setProgress(0); setFileName(file.name);
    const slug = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
    const url = `https://${STORAGE_ACCOUNT}.blob.core.windows.net/${CONTAINER}/${slug}?${SAS_TOKEN}`;
    try {
      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('PUT', url);
        xhr.setRequestHeader('x-ms-blob-type', 'BlockBlob');
        xhr.setRequestHeader('Content-Type', file.type || 'audio/mpeg');
        xhr.upload.onprogress = (e) => { if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100)); };
        xhr.onload = () => xhr.status === 201 ? resolve() : reject(new Error(`HTTP ${xhr.status}`));
        xhr.onerror = reject;
        xhr.send(file);
      });
      setProgress(100);
      onUploaded(`https://${STORAGE_ACCOUNT}.blob.core.windows.net/${CONTAINER}/${slug}`);
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const onDrop = (e) => { e.preventDefault(); setDragging(false); uploadFile(e.dataTransfer.files[0]); };
  const done = progress === 100 && !uploading;

  return (
    <div>
      <div style={{ border: `2px dashed ${dragging ? BRAND.teal : done ? BRAND.teal + '70' : 'rgba(255,255,255,0.14)'}`, borderRadius: 12, padding: '28px 20px', textAlign: 'center', background: dragging ? `${BRAND.teal}0c` : 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'all 0.2s' }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current.click()}
      >
        <div style={{ fontSize: 30, marginBottom: 8 }}>{uploading ? '⏳' : done ? '✅' : '🎵'}</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', lineHeight: 1.7 }}>
          {uploading ? <>Uploading <strong style={{ color: BRAND.teal }}>{fileName}</strong>… {progress}%</>
            : done ? <><strong style={{ color: BRAND.teal }}>Uploaded:</strong> {fileName}</>
            : <><strong style={{ color: '#fff' }}>Drag & drop</strong> audio here<br /><span style={{ fontSize: 11, opacity: 0.6 }}>MP3 · WAV · FLAC · or click to browse</span></>}
        </div>
        {uploading && (
          <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.07)', marginTop: 12, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, background: `linear-gradient(90deg,${BRAND.teal},${BRAND.azure})`, transition: 'width 0.3s', borderRadius: 2 }} />
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept=".mp3,.wav,.flac,audio/*" style={{ display: 'none' }} onChange={(e) => uploadFile(e.target.files[0])} />
      {currentUrl && <div style={{ fontSize: 11, color: BRAND.teal, marginTop: 6, opacity: 0.7, wordBreak: 'break-all' }}>✔ {currentUrl}</div>}
    </div>
  );
}

function WaveformBars({ isPlaying, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2.5, height: 48, width: '100%' }}>
      {WAVE_H.map((h, i) => (
        <div key={i} style={{
          flex: '0 0 3px', width: 3,
          height: isPlaying ? undefined : `${h}%`,
          minHeight: 4, maxHeight: '100%',
          borderRadius: 2,
          background: color,
          opacity: isPlaying ? 0.9 : 0.45,
          animation: isPlaying ? `cpWave ${0.5 + (i % 6) * 0.09}s ease-in-out infinite alternate` : 'none',
          animationDelay: `${i * 0.033}s`,
        }} />
      ))}
    </div>
  );
}

function SoundscapeCard({ sc, isPlaying, onPlay, onEdit, onDelete }) {
  const [hover, setHover] = useState(false);
  const col = accent(sc.category);
  const tags = Array.isArray(sc.tags) ? sc.tags : (sc.tags ? sc.tags.split(',').map(t => t.trim()) : []);
  const isPrivate = sc.isPrivate || sc.private;

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: isPlaying ? `linear-gradient(145deg,${col}14 0%,${BRAND.azure}0a 100%)` : 'rgba(255,255,255,0.035)',
        backdropFilter: 'blur(24px)',
        border: `1px solid ${isPlaying ? col + '55' : hover ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.07)'}`,
        borderRadius: 20, overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
        transform: hover ? 'translateY(-6px)' : 'translateY(0)',
        boxShadow: hover ? `0 24px 56px ${col}22, 0 8px 24px rgba(0,0,0,0.3)` : '0 4px 16px rgba(0,0,0,0.22)',
        animation: 'cpFadeUp 0.5s ease-out both',
      }}
    >
      <div style={{ position: 'relative', height: 176, overflow: 'hidden', background: `linear-gradient(145deg,${col}2e 0%,${col}0a 100%)` }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `linear-gradient(${col}18 1px,transparent 1px),linear-gradient(90deg,${col}18 1px,transparent 1px)`, backgroundSize: '22px 22px' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', padding: '0 18px' }}>
          <WaveformBars isPlaying={isPlaying} color={col} />
        </div>
        <div style={{ position: 'absolute', top: 14, left: 14, display: 'flex', gap: 8 }}>
          <div style={{ padding: '4px 12px', borderRadius: 100, background: `${col}22`, border: `1px solid ${col}55`, color: col, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.09em', backdropFilter: 'blur(8px)' }}>
            {sc.category}
          </div>
          {isPrivate && (
            <div style={{ padding: '4px 10px', borderRadius: 100, background: '#ef444422', border: '1px solid #ef444455', color: '#ef4444', fontSize: 10, fontWeight: 700, backdropFilter: 'blur(8px)' }}>
              🔒 Private
            </div>
          )}
        </div>
        <button onClick={onPlay} style={{
          position: 'absolute', bottom: 14, right: 14, width: 50, height: 50, borderRadius: '50%',
          background: isPlaying ? 'rgba(255,255,255,0.12)' : `linear-gradient(135deg,${col},${col}cc)`,
          border: `2px solid ${col}`, color: '#fff', fontSize: 18, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(8px)',
          boxShadow: isPlaying ? `0 0 24px ${col}90` : `0 4px 16px ${col}60`,
          animation: isPlaying ? 'cpPulse 2s ease-in-out infinite' : 'none',
        }}>{isPlaying ? '⏸' : '▶'}</button>
      </div>

      <div style={{ padding: '18px 20px 20px' }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Playfair Display, serif', marginBottom: 6, lineHeight: 1.3, letterSpacing: '-0.01em' }}>{sc.title}</h3>
        <div style={{ display: 'flex', gap: 14, fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
          <span>⏱ {fmtTime(sc.duration)}</span>
          <span>▶ {(sc.playCount || 0).toLocaleString()}</span>
        </div>
        {tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
            {tags.slice(0, 3).map((t, i) => (
              <span key={i} style={{ fontSize: 11, padding: '3px 10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 100, color: 'rgba(255,255,255,0.6)' }}>#{t}</span>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onEdit} style={{ flex: 1, padding: '9px 0', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Edit</button>
          <button onClick={onDelete} style={{ flex: 1, padding: '9px 0', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 10, color: '#ef4444', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function NowPlayingBar({ soundscape, isPlaying, onToggle, onClose }) {
  if (!soundscape) return null;
  const col = accent(soundscape.category);
  return (
    <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 48px)', maxWidth: 680, background: 'rgba(8,14,30,0.92)', backdropFilter: 'blur(32px)', border: `1px solid ${col}55`, borderRadius: 18, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16, zIndex: 200, boxShadow: `0 8px 48px rgba(0,0,0,0.65), 0 0 32px ${col}30`, animation: 'cpFadeUp 0.4s ease-out' }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, flexShrink: 0, background: `linear-gradient(135deg,${col},${col}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🎵</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{soundscape.title}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 }}>{soundscape.category} · Now Playing</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 2, height: 26, flexShrink: 0 }}>
        {Array.from({ length: 18 }, (_, i) => (
          <div key={i} style={{ width: 2.5, borderRadius: 1.5, background: `linear-gradient(${col},${BRAND.azure})`, animation: `cpWave ${0.45 + (i % 5) * 0.09}s ease-in-out infinite alternate`, animationDelay: `${i * 0.04}s`, minHeight: 4, maxHeight: 22 }} />
        ))}
      </div>
      <button onClick={onToggle} style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, background: `linear-gradient(135deg,${col},${BRAND.azure})`, border: 'none', color: BRAND.navyDeep, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{isPlaying ? '⏸' : '▶'}</button>
      <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 14 }}>✕</button>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</label>
      {children}
    </div>
  );
}

const INPUT_STYLE = { width: '100%', padding: '12px 16px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 10, color: '#fff', fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' };

function FormModal({ editMode, formData, setFormData, onSubmit, onCancel, saving }) {
  const [urlMode, setUrlMode] = useState(false);
  const suggested = suggestTags(formData.title, formData.category);

  return (
    <div onClick={(e) => e.target === e.currentTarget && onCancel()} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, animation: 'cpFadeIn 0.2s ease-out' }}>
      <div style={{ background: `linear-gradient(145deg,${BRAND.navyLight},${BRAND.navy})`, border: '1px solid rgba(255,255,255,0.1)', borderRadius: 24, padding: '36px 32px', width: '100%', maxWidth: 560, maxHeight: '92vh', overflowY: 'auto', boxShadow: `0 32px 80px rgba(0,0,0,0.7), 0 0 48px ${BRAND.teal}18`, animation: 'cpSlideUp 0.3s cubic-bezier(0.4,0,0.2,1)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
          <h2 style={{ fontSize: 22, fontWeight: 800, fontFamily: 'Playfair Display, serif' }}>
            {editMode ? '✏️ Edit Soundscape' : '🎵 New Soundscape'}
          </h2>
          <button onClick={onCancel} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '50%', width: 36, height: 36, color: '#fff', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>

        <form onSubmit={onSubmit}>
          <Field label="Title *">
            <input style={INPUT_STYLE} required placeholder="e.g. Forest Rain at Dawn"
              value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
            <Field label="Category *">
              <select style={{ ...INPUT_STYLE, background: BRAND.navy }} required value={formData.category}
                onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}>
                <option value="">Select…</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Duration (seconds)">
              <input style={INPUT_STYLE} type="number" min="0" placeholder="180"
                value={formData.duration} onChange={e => setFormData(p => ({ ...p, duration: e.target.value }))} />
            </Field>
          </div>

          {suggested.length > 0 && (
            <Field label="Auto-Suggested Tags">
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {suggested.map(t => (
                  <button key={t} type="button" onClick={() => {
                    const current = formData.tags.split(',').map(x => x.trim()).filter(Boolean);
                    if (!current.includes(t)) setFormData(p => ({ ...p, tags: [...current, t].join(', ') }));
                  }}
                    style={{ padding: '4px 10px', borderRadius: 100, fontSize: 11, background: `${BRAND.teal}22`, border: `1px solid ${BRAND.teal}66`, color: BRAND.teal, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                    + {t}
                  </button>
                ))}
              </div>
            </Field>
          )}

          <Field label="Tags (comma-separated)">
            <input style={INPUT_STYLE} placeholder="rain, forest, morning"
              value={formData.tags} onChange={e => setFormData(p => ({ ...p, tags: e.target.value }))} />
          </Field>

          <Field label="Privacy">
            <div style={{ display: 'flex', gap: 8 }}>
              {['Public', 'Private'].map(mode => {
                const isPrivate = mode === 'Private';
                const active = formData.isPrivate === isPrivate;
                return (
                  <button key={mode} type="button" onClick={() => setFormData(p => ({ ...p, isPrivate }))}
                    style={{ flex: 1, padding: '10px', borderRadius: 10, fontSize: 13, fontWeight: 600, fontFamily: 'inherit', background: active ? `${isPrivate ? '#ef4444' : BRAND.teal}22` : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? (isPrivate ? '#ef4444' : BRAND.teal) + '66' : 'rgba(255,255,255,0.1)'}`, color: active ? (isPrivate ? '#ef4444' : BRAND.teal) : 'rgba(255,255,255,0.55)' }}>
                    {isPrivate ? '🔒 Private' : '🌍 Public'}
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Audio File">
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {[['upload', '⬆ Upload file'], ['url', '🔗 Paste URL']].map(([mode, label]) => {
                const active = urlMode ? mode === 'url' : mode === 'upload';
                return (
                  <button key={mode} type="button" onClick={() => setUrlMode(mode === 'url')}
                    style={{ padding: '7px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', background: active ? `${BRAND.teal}22` : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? BRAND.teal + '66' : 'rgba(255,255,255,0.1)'}`, color: active ? BRAND.teal : 'rgba(255,255,255,0.55)' }}>
                    {label}
                  </button>
                );
              })}
            </div>
            {urlMode
              ? <input style={INPUT_STYLE} type="url" placeholder="https://…"
                  value={formData.blobUrl} onChange={e => setFormData(p => ({ ...p, blobUrl: e.target.value }))} />
              : <UploadZone currentUrl={formData.blobUrl} onUploaded={url => setFormData(p => ({ ...p, blobUrl: url }))} />
            }
          </Field>

          <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
            <button type="button" onClick={onCancel} style={{ flex: 1, padding: '14px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.11)', borderRadius: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
            <button type="submit" disabled={saving || !formData.title || !formData.category}
              style={{ flex: 2, padding: '14px', background: `linear-gradient(135deg,${BRAND.teal},${BRAND.azure})`, border: 'none', borderRadius: 12, color: BRAND.navyDeep, fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit', opacity: (saving || !formData.title || !formData.category) ? 0.5 : 1 }}>
              {saving ? 'Saving…' : editMode ? 'Save Changes' : 'Upload Soundscape'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const EMPTY_FORM = { id: '', title: '', category: '', duration: '', tags: '', uploaderId: 'user-demo', blobUrl: '', isPrivate: false };

export default function App() {
  const [soundscapes, setSoundscapes] = useState([]);
  const [filteredSoundscapes, setFilteredSoundscapes] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortBy, setSortBy] = useState('Newest');
  const [showForm, setShowForm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [playingId, setPlayingId] = useState(null);
  const [playingSc, setPlayingSc] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const audioRef = useRef(null);

  const fetchSoundscapes = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_URLS.getAll);
      const data = await res.json();
      setSoundscapes(Array.isArray(data) ? data : data.soundscapes || data.value || []);
    } catch (err) { console.error('Fetch error:', err); setSoundscapes([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSoundscapes(); }, []);

  useEffect(() => {
    let result = [...soundscapes];
    if (activeCategory !== 'All') result = result.filter(s => s.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const getTags = (s) => Array.isArray(s.tags) ? s.tags : (s.tags ? s.tags.split(',') : []);
      result = result.filter(s => s.title?.toLowerCase().includes(q) || s.category?.toLowerCase().includes(q) || getTags(s).some(t => t.toLowerCase().includes(q)));
    }
    
    if (sortBy === 'Newest') {
      result.sort((a, b) => new Date(b.uploadDate || 0) - new Date(a.uploadDate || 0));
    } else if (sortBy === 'Most Played') {
      result.sort((a, b) => (b.playCount || 0) - (a.playCount || 0));
    } else if (sortBy === 'Trending') {
      result.sort((a, b) => {
        const scoreB = (b.playCount || 0) + (new Date() - new Date(b.uploadDate || 0)) / (1000 * 60 * 60 * 24);
        const scoreA = (a.playCount || 0) + (new Date() - new Date(a.uploadDate || 0)) / (1000 * 60 * 60 * 24);
        return scoreB - scoreA;
      });
    }
    
    setFilteredSoundscapes(result);
  }, [soundscapes, searchQuery, activeCategory, sortBy]);

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const newItem = { id: 'sc-' + Date.now(), title: formData.title, category: formData.category, duration: parseInt(formData.duration) || 0, tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean), uploaderId: formData.uploaderId, uploadDate: new Date().toISOString(), playCount: 0, blobUrl: formData.blobUrl, isPrivate: formData.isPrivate };
      await fetch(API_URLS.create, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newItem) });
      if (window.appInsights) window.appInsights.trackEvent({ name: 'SoundscapeCreated', properties: { category: newItem.category, isPrivate: newItem.isPrivate } });
      await fetchSoundscapes(); resetForm();
    } catch (err) { alert('Create failed: ' + err.message); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      const updated = { id: formData.id, title: formData.title, category: formData.category, duration: parseInt(formData.duration) || 0, tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean), uploaderId: formData.uploaderId, blobUrl: formData.blobUrl, isPrivate: formData.isPrivate };
      const url = API_URLS.update.replace('{id}', formData.id);
      await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
      if (window.appInsights) window.appInsights.trackEvent({ name: 'SoundscapeUpdated', properties: { id: formData.id, isPrivate: formData.isPrivate } });
      await fetchSoundscapes(); resetForm();
    } catch (err) { alert('Update failed: ' + err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this soundscape?')) return;
    try {
      const url = API_URLS.delete.replace('{id}', id);
      await fetch(url, { method: 'DELETE' });
      if (window.appInsights) window.appInsights.trackEvent({ name: 'SoundscapeDeleted', properties: { id } });
      setSoundscapes(prev => prev.filter(s => s.id !== id));
      if (playingId === id) stopAudio();
    } catch (err) { alert('Delete failed: ' + err.message); }
  };

  const handleEdit = (sc) => {
    const tags = Array.isArray(sc.tags) ? sc.tags.join(', ') : (sc.tags || '');
    setFormData({ id: sc.id, title: sc.title, category: sc.category, duration: String(sc.duration || ''), tags, uploaderId: sc.uploaderId || 'user-demo', blobUrl: sc.blobUrl || '', isPrivate: sc.isPrivate || false });
    setEditMode(true); setShowForm(true);
  };

  const resetForm = () => { setFormData({ ...EMPTY_FORM }); setEditMode(false); setShowForm(false); };

  const handlePlay = (sc) => {
    if (playingId === sc.id) { audioRef.current?.pause(); setPlayingId(null); setPlayingSc(null); return; }
    stopAudio();
    if (!sc.blobUrl) { alert('No audio URL for this soundscape.'); return; }
    const audio = new Audio(sc.blobUrl);
    audio.play().catch(() => alert('Could not play audio. Check the URL.'));
    audio.onended = () => { setPlayingId(null); setPlayingSc(null); };
    audioRef.current = audio;
    setPlayingId(sc.id); setPlayingSc(sc);
    if (window.appInsights) window.appInsights.trackEvent({ name: 'SoundscapePlayed', properties: { id: sc.id, title: sc.title } });
  };

  const stopAudio = () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; } setPlayingId(null); setPlayingSc(null); };

  const totalPlays = soundscapes.reduce((s, sc) => s + (sc.playCount || 0), 0);
  const totalDuration = soundscapes.reduce((s, sc) => s + (parseInt(sc.duration) || 0), 0);

  return (
    <div style={{ minHeight: '100vh', background: `radial-gradient(ellipse 80% 60% at 50% 0%,${BRAND.navyLight} 0%,${BRAND.navyDeep} 55%,#000 100%)`, color: '#fff', position: 'relative', overflow: 'hidden', paddingBottom: 120 }}>

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        body{font-family:'Outfit',-apple-system,sans-serif;background:${BRAND.navyDeep};-webkit-font-smoothing:antialiased;}
        @keyframes cpFloat{0%,100%{transform:translate(0,0) scale(1);}50%{transform:translate(18px,-22px) scale(1.04);}}
        @keyframes cpWave{from{height:5px;}to{height:36px;}}
        @keyframes cpFadeUp{from{opacity:0;transform:translateY(16px);}to{opacity:1;transform:translateY(0);}}
        @keyframes cpFadeIn{from{opacity:0;}to{opacity:1;}}
        @keyframes cpSlideUp{from{opacity:0;transform:translateY(32px) scale(0.97);}to{opacity:1;transform:translateY(0) scale(1);}}
        @keyframes cpSpin{to{transform:rotate(360deg);}}
        @keyframes cpPulse{0%,100%{box-shadow:0 0 0 0 ${BRAND.teal}60;}50%{box-shadow:0 0 0 8px ${BRAND.teal}00;}}
        input:focus,select:focus{outline:none;border-color:${BRAND.teal}!important;box-shadow:0 0 0 3px ${BRAND.teal}20!important;}
        button{transition:all 0.2s;cursor:pointer;}
        button:hover{filter:brightness(1.1);}
        button:active{transform:scale(0.97)!important;}
        ::-webkit-scrollbar{width:6px;}::-webkit-scrollbar-track{background:transparent;}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:3px;}
        input::placeholder{color:rgba(255,255,255,0.27);}
      `}</style>

      {[{ c: BRAND.teal, t: '-8%', l: '-8%', s: 500, d: 20 }, { c: BRAND.azure, t: '40%', r: '-6%', s: 520, d: 26 }, { c: BRAND.violet, t: '65%', l: '35%', s: 380, d: 23 }].map((o, i) => (
        <div key={i} style={{ position: 'fixed', top: o.t, left: o.l, right: o.r, width: o.s, height: o.s, borderRadius: '50%', background: `radial-gradient(circle,${o.c}28 0%,transparent 65%)`, filter: 'blur(48px)', animation: `cpFloat ${o.d}s ease-in-out infinite ${i % 2 ? 'reverse' : ''}`, pointerEvents: 'none', zIndex: 0 }} />
      ))}

      <header style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: '48px 40px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <svg width="52" height="52" viewBox="0 0 52 52">
            <defs><linearGradient id="cpLg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor={BRAND.teal} /><stop offset="50%" stopColor={BRAND.azure} /><stop offset="100%" stopColor={BRAND.violet} /></linearGradient></defs>
            <circle cx="26" cy="26" r="4" fill="url(#cpLg)" />
            <circle cx="26" cy="26" r="10" fill="none" stroke="url(#cpLg)" strokeWidth="2" opacity="0.85" />
            <circle cx="26" cy="26" r="17" fill="none" stroke="url(#cpLg)" strokeWidth="1.5" opacity="0.5" />
            <circle cx="26" cy="26" r="24" fill="none" stroke="url(#cpLg)" strokeWidth="1" opacity="0.25" />
            <rect x="35" y="22" width="2.5" height="8" fill={BRAND.teal} rx="1.2" />
            <rect x="39" y="18" width="2.5" height="16" fill={BRAND.azure} rx="1.2" />
            <rect x="43" y="24" width="2.5" height="4" fill={BRAND.violet} rx="1.2" />
          </svg>
          <div>
            <h1 style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1 }}>
              <span style={{ fontWeight: 300, opacity: 0.9 }}>Cloud</span>
              <span style={{ background: `linear-gradient(135deg,${BRAND.teal},${BRAND.azure})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 900 }}>Phlog</span>
            </h1>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.42)', marginTop: 3, letterSpacing: '0.03em' }}>Soundscape sharing for creators</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
          {[{ label: 'Soundscapes', value: soundscapes.length }, { label: 'Total Plays', value: totalPlays.toLocaleString() }, { label: 'Duration', value: `${Math.round(totalDuration / 60)}m` }].map(s => (
            <div key={s.label} style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 30, fontWeight: 700, fontFamily: 'Playfair Display, serif', background: `linear-gradient(135deg,${BRAND.teal},${BRAND.azure})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </header>

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: '0 40px 20px', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
          <div style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', opacity: 0.4, pointerEvents: 'none', fontSize: 17 }}>🔍</div>
          <input type="text" placeholder="Search soundscapes, tags, categories…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            style={{ width: '100%', padding: '13px 18px 13px 46px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 12, color: '#fff', fontSize: 15, fontFamily: 'inherit' }} />
        </div>

        <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ padding: '10px 16px', background: BRAND.navy, border: `1px solid rgba(255,255,255,0.09)`, borderRadius: 10, color: '#fff', fontSize: 13, fontFamily: 'inherit', cursor: 'pointer' }}>
          {['Newest', 'Most Played', 'Trending'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['All', ...CATEGORIES].map(cat => {
            const active = activeCategory === cat;
            const col = CAT_COLOR[cat];
            return (
              <button key={cat} onClick={() => setActiveCategory(cat)} style={{ padding: '10px 20px', borderRadius: 100, fontSize: 14, fontWeight: active ? 700 : 500, fontFamily: 'inherit', background: active ? `${col || BRAND.teal}22` : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? (col || BRAND.teal) + '66' : 'rgba(255,255,255,0.09)'}`, color: active ? (col || BRAND.teal) : 'rgba(255,255,255,0.6)' }}>{cat}</button>
            );
          })}
        </div>
        <button onClick={() => { setFormData({ ...EMPTY_FORM }); setEditMode(false); setShowForm(true); }}
          style={{ padding: '13px 26px', background: `linear-gradient(135deg,${BRAND.teal},${BRAND.azure})`, border: 'none', borderRadius: 12, color: BRAND.navyDeep, fontWeight: 800, fontSize: 15, fontFamily: 'inherit', boxShadow: `0 4px 20px ${BRAND.teal}44`, letterSpacing: '-0.01em', flexShrink: 0 }}>
          + New
        </button>
      </div>

      <main style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: '8px 40px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '100px 0' }}>
            <div style={{ width: 44, height: 44, border: `3px solid rgba(255,255,255,0.08)`, borderTop: `3px solid ${BRAND.teal}`, borderRadius: '50%', animation: 'cpSpin 0.8s linear infinite' }} />
            <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: 20, fontSize: 16 }}>Loading soundscapes…</p>
          </div>
        ) : filteredSoundscapes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '100px 24px', opacity: 0.5 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎧</div>
            <h3 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10 }}>{searchQuery || activeCategory !== 'All' ? 'No matches found' : 'No soundscapes yet'}</h3>
            <p style={{ fontSize: 15, opacity: 0.7 }}>{searchQuery || activeCategory !== 'All' ? 'Try a different search or category' : 'Hit "+ New" to get started'}</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
            {filteredSoundscapes.map((sc, i) => (
              <div key={sc.id} style={{ animationDelay: `${i * 0.06}s` }}>
                <SoundscapeCard sc={sc} isPlaying={playingId === sc.id} onPlay={() => handlePlay(sc)} onEdit={() => handleEdit(sc)} onDelete={() => handleDelete(sc.id)} />
              </div>
            ))}
          </div>
        )}
      </main>

      <footer style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '60px auto 0', padding: '32px 40px', borderTop: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
        <p style={{ color: 'rgba(255,255,255,0.22)', fontSize: 12 }}>CloudPhlog · COM682 Cloud Native Development · Imran Mahmud B00974566 · Ulster University 2026</p>
      </footer>

      {playingSc && (
        <NowPlayingBar soundscape={playingSc} isPlaying={!!playingId}
          onToggle={() => { if (playingId) { audioRef.current?.pause(); setPlayingId(null); } else { audioRef.current?.play(); setPlayingId(playingSc.id); } }}
          onClose={stopAudio} />
      )}

      {showForm && (
        <FormModal editMode={editMode} formData={formData} setFormData={setFormData}
          onSubmit={editMode ? handleUpdate : handleCreate} onCancel={resetForm} saving={saving} />
      )}
    </div>
  );
}