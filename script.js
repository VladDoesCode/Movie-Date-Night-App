let vladimirMoviePicker, taylorMoviePicker;

class MoviePicker {
    constructor(user) {
        this.movies = [];
        this.currentIndex = 0;
        this.likedMovies = [];
        this.apiKey = '6f49ffb34a0f0c5c866d05f814a9f51c';
        this.user = user;
        this.initEventListeners();
        this.initFilterEventListeners();
        this.initGameEventListeners();
        this.loadLikedMovies();
        this.preferences = {
            genres: [],
            ratings: [],
            keywords: []
        };
        this.fetchGenres();
        this.genres = [];
    }

    initEventListeners() {
        $("#searchForm").submit(this.searchMovies.bind(this));
        $("#randomMovieButton").click(this.createMarbleRace.bind(this));
        $(`#saveMoviesButton-${this.user}`).click(this.saveLikedMovies.bind(this));
        $(`#loadMoviesButton-${this.user}`).click(this.loadLikedMovies.bind(this));
    }

    searchMovies(event) {
        event.preventDefault();
        const query = $("#searchInput").val();
        const url = `https://api.themoviedb.org/3/search/movie?api_key=${this.apiKey}&query=${encodeURIComponent(query)}`;
    
        $.ajax({
            url: url,
            method: "GET",
            success: (response) => {
                if (response.results.length > 0) {
                    this.processSearchResults(response.results);
                    $('.tab-button').removeClass('active');
                    $('.tab-button[data-user="swipe"]').addClass('active');
                    $('.tab-content').removeClass('active');
                    $('#swipeContent').addClass('active');
                } else {
                    $("#movieSwipeContainer").html("<p>No movies found. Try another search!</p>");
                }
            },
            error: () => {
                alert("An error occurred during the search. Please try again.");
            }
        });
    }

    processSearchResults(results) {
        this.movies = results.map(movie => ({
            title: movie.title,
            year: movie.release_date ? movie.release_date.substring(0, 4) : 'N/A',
            poster: movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'default_poster.png',
            id: movie.id,
            genres: movie.genre_ids.map(id => this.getGenreName(id)),
            releaseDates: movie.release_dates
        }));
        this.currentIndex = 0;
        this.displayCurrentMovie();
    }

    displayCurrentMovie() {
        if (this.movies.length > 0 && this.currentIndex < this.movies.length) {
            const movie = this.movies[this.currentIndex];
    
            this.fetchMovieDetails(movie.id)
                .then(response => {
                    const certification = response.certification || 'Not Rated';
                    movie.certification = certification;
    
                    $('#movieSwipeContainer').html(`
                        <div class="movie-card">
                            <img src="${movie.poster}" alt="Poster" onerror="this.onerror=null;this.src='default_poster.png';">
                            <div class="movie-info">
                                <h3>${movie.title} (${movie.year})</h3>
                                <div class="movie-synopsis"></div>
                                <div class="movie-details"></div>
                                <div class="movie-actions">
                                    <button id="likeButtonVladimir" class="vladimir-button">Like for Vladimir</button>
                                    <button id="likeButtonTaylor" class="taylor-button">Like for Taylor</button>
                                    <button id="passButton">Pass</button>
                                </div>
                            </div>
                        </div>
                    `);
    
                    $('#likeButtonVladimir').click(() => vladimirMoviePicker.likeMovie(movie));
                    $('#likeButtonTaylor').click(() => taylorMoviePicker.likeMovie(movie));
                    $('#passButton').click(this.passMovie.bind(this));
    
                    const synopsisContainer = $(".movie-synopsis");
                    synopsisContainer.html(`<p>${response.synopsis}</p>`);
    
                    const detailsContainer = $(".movie-details");
                    detailsContainer.html(`
                        <p style="text-align: center;"><strong>Genres:</strong> ${response.genres}</p>
                        <p style="text-align: center;"><strong>Age Rating:</strong> ${certification}</p>
                        <p style="text-align: center;"><strong>Duration:</strong> ${response.runtime} minutes</p>
                        ${response.trailerLink ? `<p style="text-align: center;"><a href="${response.trailerLink}" target="_blank">Watch Trailer</a></p>` : ''}
                        <p style="text-align: center; font-size: 14px;"><strong>Keywords:</strong></p>
                        <div class="keyword-container">${response.keywords}</div>
                    `);
                });
    
            const movieCard = $('.movie-card');
            let touchStartX = 0;
            let touchEndX = 0;
    
            movieCard.on('touchstart', function(event) {
                touchStartX = event.touches[0].clientX;
            });
    
            movieCard.on('touchend', function(event) {
                touchEndX = event.changedTouches[0].clientX;
                if (touchEndX < touchStartX - 100) {
                    vladimirMoviePicker.passMovie();
                } else if (touchEndX > touchStartX + 100) {
                    vladimirMoviePicker.likeMovie(movie);
                }
            });
        } else {
            $('#movieSwipeContainer').html("<p>No movies found. Try another search!</p>");
        }
    }

    fetchMovieDetails(movieId) {
        const url = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${this.apiKey}&append_to_response=videos,keywords,release_dates`;
        
        return $.ajax({
            url: url,
            method: "GET"
        }).then(response => {
            const synopsis = response.overview || 'No synopsis available.';
            const genres = response.genres.map(genre => genre.name).join(', ') || 'No genres listed.';
            const runtime = response.runtime || 'Runtime not available.';
            const trailerKey = response.videos.results.length > 0 ? response.videos.results[0].key : '';
            const trailerLink = trailerKey ? `https://www.youtube.com/watch?v=${trailerKey}` : 'No trailer available.';
            const keywords = response.keywords.keywords.map(keyword => `<span class="keyword">${keyword.name}</span>`).join('') || 'No keywords found.';
    
            let certification = 'NR'; // Default certification
            const usReleaseDates = response.release_dates.results.find(result => result.iso_3166_1 === 'US');
            if (usReleaseDates) {
                const rating = usReleaseDates.release_dates.find(release => release.certification !== '');
                if (rating) {
                    certification = rating.certification;
                }
            }
            
            return {
                synopsis: synopsis,
                genres: genres,
                runtime: runtime,
                trailerLink: trailerLink,
                keywords: keywords,
                certification: certification
            };
        });
    } 

    likeMovie(movie) {
        if (!this.likedMovies.some(m => this.compareMovies(m, movie))) {
            this.fetchMovieDetails(movie.id)
                .then(() => {
                    this.likedMovies.push(movie);
                    this.displayLikedMovies(this.likedMovies); 
                    this.currentIndex++;
                    if (this.currentIndex < this.movies.length) {
                        this.displayCurrentMovie();
                    } else {
                        $('#movieSwipeContainer').html("<p>End of search results, or start a new search.</p>");
                    }
                    this.findCommonLikedMovies();
                    this.displayCommonLikedMovies();
                    this.updatePreferences(movie);
                    this.suggestMovies();
                });
        } else {
            this.currentIndex++;
            if (this.currentIndex < this.movies.length) {
                this.displayCurrentMovie();
            } else {
                $('#movieSwipeContainer').html("<p>End of search results, or start a new search.</p>");
            }
        }
    }

    removeMovie(movieId) {
        this.likedMovies = this.likedMovies.filter(m => m.id !== movieId);
        this.displayLikedMovies();
    }

    passMovie() {
        this.currentIndex++;
        if (this.currentIndex < this.movies.length) {
            this.displayCurrentMovie();
        } else {
            $('#movieSwipeContainer').html("<p>End of search results, or start a new search.</p>");
        }
    }

    displayLikedMovies(movies) {
        const container = $(`#likedMoviesList-${this.user}`);
        if (movies.length > 0) {
            const html = movies.map(movie => `
                <div class="liked-movie">
                    <img src="${movie.poster}" alt="Poster">
                    <span>${movie.title} (${movie.year})</span>
                    <button class="removeButton" data-movie-id="${movie.id}">Remove</button>
                </div>
            `).join("");
            container.html(html);

            $(".removeButton").click((event) => {
                const movieId = $(event.target).data("movie-id");
                this.removeMovie(movieId);
            });
        } else {
            container.html("<p>No liked movies found.</p>");
        }
    }

    saveLikedMovies() {
        const data = JSON.stringify(this.likedMovies, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `liked_movies_${this.user}.json`;
        link.click();

        URL.revokeObjectURL(url);
    }

    loadLikedMovies() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';

        input.onchange = (event) => {
            const file = event.target.files[0];
            const reader = new FileReader();

            reader.onload = (e) => {
                this.likedMovies = JSON.parse(e.target.result);
                this.displayLikedMovies(this.likedMovies); // Pass the loaded movies
            };

            reader.readAsText(file);
        };

        input.click();
    }

    createMarbleRace() {
        const genre = $('#genre-select').val();
        const rating = $('#rating-select').val();
    
        let combinedLikedMovies = new Set([...vladimirMoviePicker.likedMovies, ...taylorMoviePicker.likedMovies]);
    
        // Apply filters
        if (genre !== 'All') {
            combinedLikedMovies = new Set([...combinedLikedMovies].filter(movie => movie.genres.includes(genre)));
        }
        if (rating !== 'All') {
            combinedLikedMovies = new Set([...combinedLikedMovies].filter(movie => movie.rating === rating));
        }
    
        if (combinedLikedMovies.size === 0) {
            alert("No liked movies found with the selected filters. Try adjusting your filters or liking more movies!");
            return;
        }
    
        const raceContainer = document.getElementById('raceContainer');
        raceContainer.classList.remove('hidden');
    
        const raceTrack = document.getElementById('raceTrack');
        const winnerDisplay = document.getElementById('winnerDisplay');
        const closeButton = document.getElementById('closeButton');
    
        const marbles = Array.from(combinedLikedMovies).map(movie => ({
            title: movie.title,
            poster: movie.poster,
            element: document.createElement('div')
        }));
    
        marbles.forEach(marble => {
            marble.element.classList.add('marble');
            const posterElement = document.createElement('img');
            posterElement.src = marble.poster;
            posterElement.alt = 'Movie Poster';
            marble.element.appendChild(posterElement);
            raceTrack.appendChild(marble.element);
        });
    
        const startRace = () => {
            const winnerIndex = Math.floor(Math.random() * marbles.length);
            const winningMarble = marbles[winnerIndex];
    
            marbles.forEach((marble, index) => {
                const distance = index === winnerIndex ? raceTrack.clientWidth - marble.element.clientWidth : Math.random() * (raceTrack.clientWidth - marble.element.clientWidth);
                const duration = 3;
                marble.element.style.transform = `translateX(${distance}px)`;
                marble.element.style.transition = `transform ${duration}s ease-in-out`;
                marble.element.style.zIndex = index === winnerIndex ? '1' : '1';
            });
    
            setTimeout(() => {
                winnerDisplay.innerHTML = `
                    <h2>${winningMarble.title}</h2>
                    <img src="${winningMarble.poster}" alt="Movie Poster">
                `;
                winnerDisplay.classList.add('show');
                this.showConfetti();
                closeButton.classList.add('show');
            }, 3500);
        };
    
        const closeMarbleRace = () => {
            raceContainer.classList.add('hidden');
            winnerDisplay.classList.remove('show');
            closeButton.classList.remove('show');
            confettiContainer.classList.remove('show');
            raceTrack.innerHTML = '';
        };
    
        closeButton.addEventListener('click', closeMarbleRace);
    
        startRace();
    }

    showConfetti() {
        confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
        });
    }

    findCommonLikedMovies() {
        const commonMovies = this.likedMovies.filter(movie => {
            return taylorMoviePicker.likedMovies.some(m => m.id === movie.id);
        });
    
        if (commonMovies.length > 0) {
            const movieList = commonMovies.map(movie => `<li>${movie.title}</li>`).join('');
            $('#commonLikedMovies').html(`
                <h3>Movies You Both Like:</h3>
                <ul>${movieList}</ul>
            `);
        } else {
            $('#commonLikedMovies').html('<p>No common liked movies yet.</p>');
        }
    }

    displayCommonLikedMovies() {
        const commonLikedMovies = vladimirMoviePicker.likedMovies.filter(movie => 
            taylorMoviePicker.likedMovies.some(tMovie => tMovie.id === movie.id)
        );
    
        // Assume there's an element with ID 'commonLikedMovies' in index.html where the common movies will be displayed
        if (commonLikedMovies.length > 0) {
            let moviesHTML = commonLikedMovies.map(movie => `<li>${movie.title}</li>`).join('');
            $('#commonLikedMovies').html(`<ul>${moviesHTML}</ul>`);
        } else {
            $('#commonLikedMovies').html('No common movies liked yet.');
        }
    }

    initFilterEventListeners() {
        $('#genre-select').change(this.filterByGenre.bind(this));
        $('#rating-select').change(this.filterByRating.bind(this));
    }
    
    filterByGenre() {
        const genre = $('#genre-select').val();
        const filteredMovies = genre === 'All' 
            ? this.likedMovies 
            : this.likedMovies.filter(movie => movie.genres && movie.genres.includes(genre)); // Add check for movie.genres
        this.displayLikedMovies(filteredMovies);
    }

    getGenreName(genreId) {
        const genre = this.genres.find(g => g.id === genreId);
        return genre ? genre.name : 'Unknown';
    }
    
    filterByRating() {
        const rating = $('#rating-select').val();
        const filteredMovies = rating === 'All' ? this.likedMovies : this.likedMovies.filter(movie => movie.certification === rating);
        this.displayLikedMovies(filteredMovies);
    }

    getRating(isAdult, releaseDate) {
        if (isAdult) {
            return 'R';
        } else {
            const releaseDateObj = new Date(releaseDate);
            if (releaseDateObj >= new Date('1984-07-01') && releaseDateObj < new Date('1990-01-01')) {
                return 'PG-13';
            } else if (releaseDateObj >= new Date('1990-01-01')) {
                return 'PG-13';
            } else if (releaseDateObj >= new Date('1968-11-01') && releaseDateObj < new Date('1984-07-01')) {
                return 'PG';
            } else {
                return 'G';
            }
        }
    }

    initGameEventListeners() {
        $('#startGameButton').click(this.startGame.bind(this));
    }
    
    startGame() {
        const combinedLikedMovies = [...vladimirMoviePicker.likedMovies, ...taylorMoviePicker.likedMovies];
        if (combinedLikedMovies.length < 2) {
            alert("You need to like at least two movies to start the game.");
            return;
        }
    
        let currentMovies = [...combinedLikedMovies];
        let currentPlayer = vladimirMoviePicker;
    
        const playRound = () => {
            if (currentMovies.length === 1) {
                const winner = currentPlayer === vladimirMoviePicker ? 'Vladimir' : 'Taylor';
                $('#gameResults').html(`<p>${winner} wins! The movie for date night is: ${currentMovies[0].title}</p>`);
                return;
            }
    
            const randomIndex = Math.floor(Math.random() * currentMovies.length);
            const movie = currentMovies[randomIndex];
    
            $('#gameResults').html(`
                <p>${currentPlayer.user === 'vladimir' ? 'Vladimir' : 'Taylor'}, do you want to keep or remove "${movie.title}"?</p>
                <button id="keepMovie">Keep</button>
                <button id="removeMovie">Remove</button>
            `);
    
            $('#keepMovie').click(() => {
                playRound();
            });
    
            $('#removeMovie').click(() => {
                currentMovies = currentMovies.filter(m => m !== movie);
                currentPlayer = currentPlayer === vladimirMoviePicker ? taylorMoviePicker : vladimirMoviePicker;
                playRound();
            });
        };
    
        playRound();
    }

    updatePreferences(movie) {
        // Update user preferences based on liked movies
        movie.genres.forEach(genre => {
            if (!this.preferences.genres.includes(genre)) {
                this.preferences.genres.push(genre);
            }
        });
        // Similarly update ratings and keywords
    }

    calculateMatchScore(movie1, movie2) {
        let score = 0;
        // Compare genres and increment score based on overlap
        movie1.genres.forEach(genre => {
            if (movie2.genres.includes(genre)) {
                score++;
            }
        });
        // Similarly compare ratings and keywords
        return score;
    }

    suggestMovies() {
        const otherUser = this === vladimirMoviePicker ? taylorMoviePicker : vladimirMoviePicker;
        const suggestions = otherUser.likedMovies.map(movie => ({
            movie,
            score: this.calculateMatchScore(movie, this.preferences)
        })).sort((a, b) => b.score - a.score).slice(0, 3);

        // Display suggestions in the UI (e.g., in a new div)
        // ...
    }

    fetchGenres() {
        const url = `https://api.themoviedb.org/3/genre/movie/list?api_key=${this.apiKey}`;
        $.ajax({
            url: url,
            method: "GET",
            success: (response) => {
                this.genres = response.genres; // Store fetched genres in this.genres
                const genreOptions = response.genres.map(genre => `<option value="${genre.name}">${genre.name}</option>`).join('');
                $('#genre-select').append(genreOptions);
            },
            error: () => {
                alert("An error occurred while fetching genres.");
            }
        });
    }

    compareMovies(movie1, movie2) {
        return movie1.title === movie2.title && movie1.year === movie2.year;
    }
}

$(document).ready(function() {
    vladimirMoviePicker = new MoviePicker('vladimir');
    taylorMoviePicker = new MoviePicker('taylor');

    $('.tab-button').click(function() {
        $('.tab-button').removeClass('active');
        $(this).addClass('active');

        const user = $(this).data('user');
        $('.tab-content').removeClass('active');
        $(`#${user}Content`).addClass('active');
    });
});
