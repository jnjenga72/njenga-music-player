document.addEventListener('DOMContentLoaded', () => {
    const audio = new Audio();
    const disk = document.getElementById('disk');
    const arm = document.getElementById('arm');
    const playBtn = document.getElementById('play-btn');
    const playIcon = document.getElementById('play-icon');
    const fileInput = document.getElementById('audio-upload');
    const titleDisplay = document.getElementById('track-title');
    const artistDisplay = document.getElementById('track-artist');
    const progressBar = document.getElementById('progress-bar');
    const currentTimeDisplay = document.getElementById('current-time');
    const durationDisplay = document.getElementById('duration');
    const volumeSlider = document.getElementById('volume-slider');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const playlistList = document.getElementById('playlist-list');
    const favoritesList = document.getElementById('favorites-list');
    const searchInput = document.getElementById('search-bar');
    const miniPlayer = document.querySelector('.mini-player');
    const miniTitle = document.getElementById('mini-title');
    const miniPlayBtn = document.getElementById('mini-play-btn');
    
    // Navigation Elements
    const playerPage = document.getElementById('player-page');
    const libraryPage = document.getElementById('library-page');
    const libraryBtn = document.getElementById('library-btn');
    const backBtn = document.getElementById('back-btn');
    const favBtn = document.getElementById('fav-toggle-btn');

    let isPlaying = false;
    let playlist = [];
    let favorites = new Set(); // Stores names of favorite files
    let currentTrackIndex = 0;
    let currentObjectUrl = null;
    let db;

    // Initialize Database
    const dbRequest = indexedDB.open('MusicPlayerDB', 1);
    dbRequest.onupgradeneeded = (e) => {
        db = e.target.result;
        if (!db.objectStoreNames.contains('tracks')) {
            db.createObjectStore('tracks', { keyPath: 'name' });
        }
    };
    dbRequest.onsuccess = (e) => {
        db = e.target.result;
        loadLibrary();
    };
    dbRequest.onerror = (e) => console.error("DB Error", e);

    function loadLibrary(callback) {
        if (!db) return;
        const tx = db.transaction(['tracks'], 'readonly');
        const store = tx.objectStore('tracks');
        const req = store.getAll();
        req.onsuccess = () => {
            const result = req.result || [];
            result.sort((a, b) => a.dateAdded - b.dateAdded);

            playlist = result.map(item => item.file);
            favorites.clear();
            result.forEach(item => {
                if (item.isFavorite) favorites.add(item.name);
            });

            renderPlaylist(searchInput.value);
            if (callback) callback();
        };
    }

    // Handle File Import
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0 && db) {
            const tx = db.transaction(['tracks'], 'readwrite');
            const store = tx.objectStore('tracks');
            const wasEmpty = playlist.length === 0;

            files.forEach(file => {
                const isFav = favorites.has(file.name);
                const track = {
                    name: file.name,
                    file: file,
                    isFavorite: isFav,
                    dateAdded: Date.now()
                };
                store.put(track);
            });

            tx.oncomplete = () => {
                loadLibrary(() => {
                    if (wasEmpty && playlist.length > 0) {
                        loadTrack(0);
                        playTrack();
                    }
                });
            };
        }
        e.target.value = ''; // Reset input to allow selecting the same file again
    });

    // Search Filter
    searchInput.addEventListener('input', (e) => {
        renderPlaylist(e.target.value);
    });

    // Mini Player Control
    miniPlayBtn.addEventListener('click', togglePlay);

    function loadTrack(index) {
        if (index >= 0 && index < playlist.length) {
            // Revoke previous URL to prevent memory leaks
            if (currentObjectUrl) {
                URL.revokeObjectURL(currentObjectUrl);
            }

            currentTrackIndex = index;
            const file = playlist[index];
            currentObjectUrl = URL.createObjectURL(file);
            
            audio.src = currentObjectUrl;
            titleDisplay.textContent = file.name.replace(/\.[^/.]+$/, "");
            artistDisplay.textContent = "Local File";
            playBtn.disabled = false;

            renderPlaylist(searchInput.value);
            updateUI(); // To check favorite status

            // Update Mini Player Text
            miniTitle.textContent = titleDisplay.textContent;
            miniPlayer.classList.remove('hidden-mini');

            // Extract Album Art using jsmediatags
            const albumArtImg = document.querySelector('.album-art');
            if (albumArtImg) albumArtImg.src = "https://via.placeholder.com/300"; // Reset before loading
            const loadingIndex = currentTrackIndex; // Capture index to prevent race condition

            if (window.jsmediatags && file) {
                window.jsmediatags.read(file, {
                    onSuccess: function(tag) {
                        const picture = tag.tags.picture;
                        if (picture && albumArtImg && loadingIndex === currentTrackIndex) {
                            const base64String = picture.data.reduce((acc, cur) => acc + String.fromCharCode(cur), "");
                            const base64 = "data:" + picture.format + ";base64," + window.btoa(base64String);
                            albumArtImg.src = base64;
                        } else {
                            albumArtImg.src = "https://via.placeholder.com/300";
                        }
                    },
                    onError: function(error) {
                        albumArtImg.src = "https://via.placeholder.com/300";
                    }
                });
            }
        }
    }

    function renderPlaylist(filterText = '') {
        playlistList.innerHTML = '';
        playlist.forEach((file, index) => {
            // Filter logic
            if (filterText && !file.name.toLowerCase().includes(filterText.toLowerCase())) {
                return;
            }

            const li = document.createElement('li');
            const isFav = favorites.has(file.name);
            li.innerHTML = `${file.name.replace(/\.[^/.]+$/, "")} ${isFav ? ' <span style="color:#ef4444">♥</span>' : ''}`;
            li.className = `playlist-item ${index === currentTrackIndex ? 'active' : ''}`;
            li.addEventListener('click', () => {
                loadTrack(index);
                playTrack();
                libraryPage.classList.add('hidden');
                playerPage.classList.remove('hidden');
            });
            playlistList.appendChild(li);
        });
        renderFavorites();
    }

    function renderFavorites() {
        favoritesList.innerHTML = '';
        playlist.forEach((file, index) => {
            if (favorites.has(file.name)) {
                const li = document.createElement('li');
                li.className = `playlist-item ${index === currentTrackIndex ? 'active' : ''}`;
                li.textContent = file.name.replace(/\.[^/.]+$/, "");
                li.addEventListener('click', () => {
                    loadTrack(index);
                    playTrack();
                });
                favoritesList.appendChild(li);
            }
        });
        if (favoritesList.children.length === 0) {
            favoritesList.innerHTML = '<li style="color:#666; padding:10px;">No favorites yet</li>';
        }
    }

    // View Navigation
    libraryBtn.addEventListener('click', () => {
        playerPage.classList.add('hidden');
        libraryPage.classList.remove('hidden');
    });

    backBtn.addEventListener('click', () => {
        libraryPage.classList.add('hidden');
        playerPage.classList.remove('hidden');
    });

    // Favorites Logic
    favBtn.addEventListener('click', () => {
        if (playlist.length === 0) return;
        const currentFile = playlist[currentTrackIndex];
        const isFav = favorites.has(currentFile.name);
        
        if (isFav) {
            favorites.delete(currentFile.name);
        } else {
            favorites.add(currentFile.name);
        }

        // Update DB
        if (db) {
            const tx = db.transaction(['tracks'], 'readwrite');
            const store = tx.objectStore('tracks');
            store.get(currentFile.name).onsuccess = (e) => {
                const data = e.target.result;
                if (data) {
                    data.isFavorite = !isFav;
                    store.put(data);
                }
            };
        }
        updateUI();
        renderPlaylist(searchInput.value); // Update lists
    });

    // Load metadata to get duration
    audio.addEventListener('loadedmetadata', () => {
        progressBar.max = audio.duration;
        durationDisplay.textContent = formatTime(audio.duration);
    });

    // Play/Pause Toggle
    playBtn.addEventListener('click', togglePlay);

    // Sync state with Audio Element events
    audio.addEventListener('play', () => {
        isPlaying = true;
        updateUI();
    });
    audio.addEventListener('pause', () => {
        isPlaying = false;
        updateUI();
    });

    function togglePlay() {
        if (playlist.length === 0) return;
        if (audio.paused) {
            playTrack();
        } else {
            pauseTrack();
        }
    }

    function playTrack() {
        audio.play().catch(e => console.error("Playback failed", e));
    }

    // Prev/Next
    prevBtn.addEventListener('click', () => {
        if (currentTrackIndex > 0) {
            loadTrack(currentTrackIndex - 1);
            playTrack();
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentTrackIndex < playlist.length - 1) {
            loadTrack(currentTrackIndex + 1);
            playTrack();
        }
    });

    function pauseTrack() {
        audio.pause();
    }

    function updateUI() {
        if (isPlaying) {
            disk.classList.add('spinning');
            arm.classList.add('active');
            playIcon.innerHTML = "❚❚"; 
            miniPlayBtn.innerHTML = "❚❚";
        } else {
            disk.classList.remove('spinning');
            arm.classList.remove('active');
            playIcon.innerHTML = "▶"; 
            miniPlayBtn.innerHTML = "▶";
        }

        // Update Fav Icon
        if (playlist.length > 0 && favorites.has(playlist[currentTrackIndex].name)) {
            favBtn.textContent = "♥";
            favBtn.classList.add('active');
        } else {
            favBtn.textContent = "♡";
            favBtn.classList.remove('active');
        }
    }

    // Progress Bar
    audio.addEventListener('timeupdate', () => {
        progressBar.value = audio.currentTime;
        currentTimeDisplay.textContent = formatTime(audio.currentTime);
    });

    progressBar.addEventListener('input', () => {
        audio.currentTime = progressBar.value;
    });

    // Volume Control
    volumeSlider.addEventListener('input', () => {
        audio.volume = volumeSlider.value;
    });

    // Reset when audio finishes
    audio.addEventListener('ended', () => {
        if (currentTrackIndex < playlist.length - 1) {
            loadTrack(currentTrackIndex + 1);
            playTrack();
        } else {
            isPlaying = false;
            updateUI();
            audio.currentTime = 0;
            progressBar.value = 0;
            currentTimeDisplay.textContent = '0:00';
        }
    });

    // Helper function to format time
    function formatTime(time) {
        if (isNaN(time) || !isFinite(time)) return '0:00';
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time - minutes * 60);
        return `${minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
    }

    // PWA Install Logic
    let deferredPrompt;
    const installBtn = document.createElement('button');
    installBtn.textContent = "Download App";
    Object.assign(installBtn.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: '9999',
        padding: '12px 24px',
        background: '#2563eb',
        color: 'white',
        border: 'none',
        borderRadius: '50px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
        fontWeight: 'bold',
        cursor: 'pointer',
        display: 'none'
    });
    document.body.appendChild(installBtn);

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installBtn.style.display = 'block';
    });

    installBtn.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        installBtn.style.display = 'none';
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        deferredPrompt = null;
    });

    window.addEventListener('appinstalled', () => {
        installBtn.style.display = 'none';
    });
});