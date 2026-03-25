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

    // Handle File Import
    fileInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (files.length > 0) {
            files.forEach(file => {
                playlist.push(file);
            });
            renderPlaylist();
            
            if (playlist.length === files.length) {
                // If this is the first import (playlist was empty), load the first track
                loadTrack(0);
                playTrack();
            }
        }
    });

    // Search Filter
    searchInput.addEventListener('input', (e) => {
        renderPlaylist(e.target.value);
    });

    // Mini Player Control
    miniPlayBtn.addEventListener('click', togglePlay);

    function loadTrack(index) {
        if (index >= 0 && index < playlist.length) {
            currentTrackIndex = index;
            const file = playlist[index];
            const fileUrl = URL.createObjectURL(file);
            
            audio.src = fileUrl;
            titleDisplay.textContent = file.name.replace(/\.[^/.]+$/, "");
            artistDisplay.textContent = "Local File";
            playBtn.disabled = false;

            renderPlaylist();
            updateUI(); // To check favorite status

            // Update Mini Player Text
            miniTitle.textContent = titleDisplay.textContent;
            miniPlayer.classList.remove('hidden-mini');

            // Extract Album Art using jsmediatags
            const albumArtImg = document.querySelector('.album-art');
            if (window.jsmediatags && file) {
                window.jsmediatags.read(file, {
                    onSuccess: function(tag) {
                        const picture = tag.tags.picture;
                        if (picture) {
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
        
        if (favorites.has(currentFile.name)) {
            favorites.delete(currentFile.name);
        } else {
            favorites.add(currentFile.name);
        }
        updateUI();
        renderPlaylist(); // Update lists
    });

    // Load metadata to get duration
    audio.addEventListener('loadedmetadata', () => {
        progressBar.max = audio.duration;
        durationDisplay.textContent = formatTime(audio.duration);
    });

    // Play/Pause Toggle
    playBtn.addEventListener('click', togglePlay);

    function togglePlay() {
        if (isPlaying) {
            pauseTrack();
        } else {
            playTrack();
        }
    }

    function playTrack() {
        audio.play().then(() => {
            isPlaying = true;
            updateUI();
        }).catch(e => console.error("Playback failed", e));
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
        isPlaying = false;
        updateUI();
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
});