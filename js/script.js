const RADIO_NAME = 'FM Olive';

// Change Stream URL Here, Supports, ICECAST, ZENO, SHOUTCAST, RADIOJAR and any other stream service.
const URL_STREAMING = 'https://radio01.ferozo.com/proxy/ra01001227?mp=/stream';

//API URL /
const API_URL = 'https://twj.es/free/?url='+URL_STREAMING;
const FALLBACK_API_URL = 'https://twj.es/metadata/?url=' + URL_STREAMING;

// Visit https://api.vagalume.com.br/docs/ to get your API key
const API_KEY = "18fe07917957c289983464588aabddfb";

let userInteracted = true;

let musicaAtual = null;

// Cache para las búsquedas de portadas
const cache = {};

window.addEventListener('load', () => { 
    const page = new Page();
    page.changeTitlePage();
    page.setVolume();

    const player = new Player();
    player.play();

    // Chama a função getStreamingData imediatamente quando a página carrega
    getStreamingData();

    // Define o intervalo para atualizar os dados de streaming a cada 10 segundos
    const streamingInterval = setInterval(getStreamingData, 3000);

    // Ajusta a altura da capa do álbum para ser igual à sua largura
    const coverArt = document.querySelector('.cover-album');
    if (coverArt) { 
      coverArt.style.height = `${coverArt.offsetWidth}px`;
    } else {
      console.warn("Elemento .cover-album não encontrado.");
    }
});

// DOM control
class Page {
    constructor() {
        this.changeTitlePage = function (title = RADIO_NAME) {
            document.title = title;
        };

        this.refreshCurrentSong = function(song, artist) {
            const currentSong = document.getElementById('currentSong');
            const currentArtist = document.getElementById('currentArtist');
            const lyricsSong = document.getElementById('lyricsSong');
        
            if (song !== currentSong.textContent || artist !== currentArtist.textContent) { 
                currentSong.classList.add('fade-out');
                currentArtist.classList.add('fade-out');
        
                setTimeout(function() {
                    currentSong.textContent = song; 
                    currentArtist.textContent = artist;
                    lyricsSong.textContent = song + ' - ' + artist;
        
                    currentSong.classList.remove('fade-out');
                    currentSong.classList.add('fade-in');
                    currentArtist.classList.remove('fade-out');
                    currentArtist.classList.add('fade-in');
                }, 500); 
        
                setTimeout(function() {
                    currentSong.classList.remove('fade-in');
                    currentArtist.classList.remove('fade-in');
                }, 1000); 
            }
        };
          
        this.refreshHistoric = async function (info, n) {
            const historicDiv = document.querySelectorAll("#historicSong article")[n];
            const songName = document.querySelectorAll("#historicSong article .music-info .song")[n];
            const artistName = document.querySelectorAll("#historicSong article .music-info .artist")[n];
            const coverHistoric = document.querySelectorAll("#historicSong article .cover-historic")[n];

            const defaultCoverArt = "img/cover.png";

            const songTitle = typeof info.song === "object" ? info.song.title : info.song;
            const songArtist = typeof info.artist === "object" ? info.artist.title : info.artist;

            songName.innerHTML = songTitle || "Desconhecido";
            artistName.innerHTML = songArtist || "Desconhecido";

            try {
                const data = await getDataFromMusicBrainz(songArtist, songTitle, defaultCoverArt, defaultCoverArt);
                coverHistoric.style.backgroundImage = "url(" + (data.art || defaultCoverArt) + ")";
            } catch (error) {
                console.log("Error buscando portada en MusicBrainz:");
                console.error(error);
                coverHistoric.style.backgroundImage = "url(" + defaultCoverArt + ")";
            }

            historicDiv.classList.add("animated", "slideInRight");
            setTimeout(() => historicDiv.classList.remove("animated", "slideInRight"), 2000);
        };
                
        this.refreshCover = async function (song = '', artist) {
            const coverArt = document.getElementById('currentCoverArt');
            const coverBackground = document.getElementById('bgCover');
            const defaultCoverArt = 'img/cover.png'; 
        
            try {
                const data = await getDataFromMusicBrainz(artist, song, defaultCoverArt, defaultCoverArt);
        
                coverArt.style.backgroundImage = 'url(' + data.art + ')';
                coverBackground.style.backgroundImage = 'url(' + data.cover + ')';
        
                coverArt.classList.add('animated', 'bounceInLeft');
                setTimeout(() => coverArt.classList.remove('animated', 'bounceInLeft'), 2000);
              
                if ('mediaSession' in navigator) {
                    const artwork = [
                        { src: data.art, sizes: '96x96',   type: 'image/png' },
                        { src: data.art, sizes: '128x128', type: 'image/png' },
                        { src: data.art, sizes: '192x192', type: 'image/png' },
                        { src: data.art, sizes: '256x256', type: 'image/png' },
                        { src: data.art, sizes: '384x384', type: 'image/png' },
                        { src: data.art, sizes: '512x512', type: 'image/png' },
                    ];
                
                    navigator.mediaSession.metadata = new MediaMetadata({ 
                        title: song, 
                        artist: artist, 
                        artwork 
                    });
                }
            } catch (error) {
                console.log("Error buscando portada en MusicBrainz:", error);
                coverArt.style.backgroundImage = 'url(' + defaultCoverArt + ')';
                coverBackground.style.backgroundImage = 'url(' + defaultCoverArt + ')';
            }
        };

        this.changeVolumeIndicator = function(volume) {
            document.getElementById('volIndicator').textContent = volume;
        
            if (typeof Storage !== 'undefined') {
              localStorage.setItem('volume', volume);
            }
          };
          
        this.setVolume = function() {
            if (typeof Storage !== 'undefined') {
              const volumeLocalStorage = localStorage.getItem('volume') || 80;
          
              document.getElementById('volume').value = volumeLocalStorage;
              document.getElementById('volIndicator').textContent = volumeLocalStorage;
            }
          };

        this.refreshLyric = async function (currentSong, currentArtist) {
            const openLyric = document.getElementsByClassName('lyrics')[0];
            const modalLyric = document.getElementById('modalLyrics');
            
            try {
              const response = await fetch('https://api.vagalume.com.br/search.php?apikey=' + API_KEY + '&art=' + currentArtist + '&mus=' + currentSong.toLowerCase());
              const data = await response.json();
          
              if (data.type === 'exact' || data.type === 'aprox') {
                const lyric = data.mus[0].text;
          
                document.getElementById('lyric').innerHTML = lyric.replace(/\n/g, '<br />');
                openLyric.style.opacity = "1";
                openLyric.setAttribute('data-toggle', 'modal');
          
                modalLyric.style.display = "none";
                modalLyric.setAttribute('aria-hidden', 'true');
                if (document.getElementsByClassName('modal-backdrop')[0]) {
                  document.getElementsByClassName('modal-backdrop')[0].remove();
                }
              } else {
                openLyric.style.opacity = "0.3";
                openLyric.removeAttribute('data-toggle');
              }
            } catch (error) {
              console.log("Erro ao buscar a letra da música:", error);
              openLyric.style.opacity = "0.3";
              openLyric.removeAttribute('data-toggle');
            }
        };
    }
}

async function getStreamingData() {
    try {
        let data = await fetchStreamingData(API_URL);
        if (!data) {
            data = await fetchStreamingData(FALLBACK_API_URL);
        }

        if (data) {
            const page = new Page();
            const currentSong = data.songtitle || (typeof data.song === "object" ? data.song.title : data.song);
            const currentArtist = typeof data.artist === "object" ? data.artist.title : data.artist;

            const safeCurrentSong = (currentSong || "").replace(/'/g, "'").replace(/&/g, "&");
            const safeCurrentArtist = (currentArtist || "").replace(/'/g, "'").replace(/&/g, "&");

            if (safeCurrentSong !== musicaAtual) {
                document.title = `${safeCurrentSong} - ${safeCurrentArtist} | ${RADIO_NAME}`;

                page.refreshCover(safeCurrentSong, safeCurrentArtist);
                page.refreshCurrentSong(safeCurrentSong, safeCurrentArtist);
                page.refreshLyric(safeCurrentSong, safeCurrentArtist);

                const historicContainer = document.getElementById("historicSong");
                historicContainer.innerHTML = "";

                const historyArray = data.song_history
                    ? data.song_history.map((item) => ({ song: item.song.title, artist: item.song.artist }))
                    : data.history;

                const maxSongsToDisplay = 4;
                const limitedHistory = historyArray.slice(Math.max(0, historyArray.length - maxSongsToDisplay));

                for (let i = 0; i < limitedHistory.length; i++) {
                    const songInfo = limitedHistory[i];
                    const article = document.createElement("article");
                    article.classList.add("col-12", "col-md-6");
                    article.innerHTML = `
                        <div class="cover-historic" style="background-image: url('img/cover.png');"></div>
                        <div class="music-info">
                          <p class="song">${songInfo.song || "Desconhecido"}</p>
                          <p class="artist">${songInfo.artist || "Desconhecido"}</p>
                        </div>
                      `;
                    historicContainer.appendChild(article);
                    try {
                        page.refreshHistoric(songInfo, i);
                    } catch (error) {
                        console.error("Error refreshing historic song:", error);
                    }
                }
                musicaAtual = safeCurrentSong;
            }
        }
    } catch (error) {
        console.log("Erro ao buscar dados de streaming:", error);
    }
}

async function fetchStreamingData(apiUrl) {
  try {
    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`Erro na requisição da API: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.log("Erro ao buscar dados de streaming da API:", error);
    return null;
  }
}

// Nueva función: Buscar portada con MusicBrainz + Cover Art Archive
const getDataFromMusicBrainz = async (artist, title, defaultArt, defaultCover) => {
  let text = artist === title ? title : `${artist} ${title}`;
  const cacheKey = text.toLowerCase();

  if (cache[cacheKey]) {
    return cache[cacheKey];
  }

  try {
    // Paso 1: Buscar en MusicBrainz
    const mbQuery = encodeURIComponent(`artist:"${artist}" AND recording:"${title}"`);
    const mbUrl = `https://musicbrainz.org/ws/2/recording/?query=${mbQuery}&limit=1&inc=releases&fmt=json`;

    const mbResponse = await fetch(mbUrl, {
      headers: { 'User-Agent': 'FMOliveRadio/1.0 ( gastonschachtl@gmail.com )' }  // <<< CAMBIÁ ESTE EMAIL POR EL TUYO >>>
    });

    if (!mbResponse.ok) throw new Error('Error en MusicBrainz');

    const mbData = await mbResponse.json();

    if (mbData.count === 0 || !mbData.recordings || mbData.recordings.length === 0) {
      throw new Error('No se encontró la canción');
    }

    const releases = mbData.recordings[0].releases;
    if (!releases || releases.length === 0) throw new Error('No hay releases');

    const releaseId = releases[0].id;

    // Paso 2: URLs directas de Cover Art Archive
    const caUrlSmall = `https://coverartarchive.org/release/${releaseId}/front-500`;
    const caUrl = `https://coverartarchive.org/release/${releaseId}/front-1200`;

    // Verificamos que exista la portada grande (HEAD request)
    const checkResponse = await fetch(caUrl, { method: 'HEAD' });
    if (!checkResponse.ok) throw new Error('No hay portada disponible');

    const results = {
      title,
      artist,
      art: caUrlSmall,    // Portada actual (más rápida)
      cover: caUrl,       // Fondo grande
      stream_url: "#not-found",
    };
    cache[cacheKey] = results;
    return results;

  } catch (error) {
    console.log("Error buscando portada en MusicBrainz:", error);
    const results = {
      title,
      artist,
      art: defaultArt,
      cover: defaultCover,
      stream_url: "#not-found",
    };
    cache[cacheKey] = results;
    return results;
  }
};

