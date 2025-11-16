document.addEventListener('DOMContentLoaded', () => {
    // --- Audio & Visualizer ---
    const audio = document.getElementById('background-music');
    const lastPage = document.getElementById('page-16');
    const volumeSlider = document.getElementById('volume-slider');
    const volumeIcon = document.getElementById('volume-icon');
    
    let isMusicPlaying = false;
    let visualizerInitialized = false;
    let lastVolume = 0.4;

    const updateVolumeIcon = (volume) => {
        if (!volumeIcon) return;
        if (volume === 0) volumeIcon.textContent = '🔇';
        else if (volume < 0.5) volumeIcon.textContent = '🔉';
        else volumeIcon.textContent = '🔊';
    };

    if (audio) {
        audio.volume = lastVolume;
        if (volumeSlider) {
            volumeSlider.value = String(audio.volume * 100);
            updateVolumeIcon(audio.volume);
        }
    }

    // --- Volume Controls ---
    if (volumeSlider && audio && volumeIcon) {
        volumeSlider.addEventListener('input', (e) => {
            const value = e.target.value;
            const newVolume = parseInt(value, 10) / 100;
            audio.volume = newVolume;
            if (newVolume > 0) lastVolume = newVolume;
            updateVolumeIcon(newVolume);
        });

        volumeIcon.addEventListener('click', () => {
            if (audio.volume > 0) {
                audio.volume = 0;
                volumeSlider.value = '0';
                updateVolumeIcon(0);
            } else {
                const newVolume = lastVolume > 0 ? lastVolume : 0.4;
                audio.volume = newVolume;
                volumeSlider.value = String(newVolume * 100);
                updateVolumeIcon(newVolume);
            }
        });
    }

    const initializeVisualizer = () => {
        if (visualizerInitialized || !audio) return;
        visualizerInitialized = true;

        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaElementSource(audio);
        const analyser = audioContext.createAnalyser();

        analyser.fftSize = 64;
        source.connect(analyser);
        analyser.connect(audioContext.destination);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);

        const animateBars = () => {
            requestAnimationFrame(animateBars);
            analyser.getByteFrequencyData(dataArray);

            const allBars = document.querySelectorAll('.sound-visualizer .bar');
            allBars.forEach((bar, i) => {
                const dataIndex = i % analyser.frequencyBinCount;
                const height = (dataArray[dataIndex] / 255) * 40;
                bar.style.height = `${height}px`;
            });
        };
        animateBars();
    };

    // --- Flipbook ---
    const pages = document.querySelectorAll('.page');
    const totalPages = pages.length;

    const lazyLoadImages = (pageElement) => {
        if (!pageElement) return;
        const images = pageElement.querySelectorAll('img[data-src]');
        images.forEach(img => {
            const dataSrc = img.getAttribute('data-src');
            if (dataSrc) {
                img.src = dataSrc;
                img.removeAttribute('data-src');
                img.onload = () => img.classList.add('loaded');
            }
        });
    };

    if (pages[0]) lazyLoadImages(pages[0]);
    if (pages[1]) lazyLoadImages(pages[1]);

    const flippedState = Array(totalPages).fill(false);

    const updateZIndexes = () => {
        let unFlipped = totalPages, flipped = 1;
        pages.forEach((page, i) => {
            page.style.zIndex = flippedState[i] ? flipped++ : unFlipped--;
        });
    };
    updateZIndexes();

    pages.forEach((page, index) => {
        page.addEventListener('click', () => {
            if (!isMusicPlaying && audio) {
                audio.play().catch(err => console.error(err));
                isMusicPlaying = true;
                initializeVisualizer();
            }

            lazyLoadImages(pages[index + 1]);
            lazyLoadImages(pages[index + 2]);

            page.classList.toggle('flipped');
            flippedState[index] = !flippedState[index];
            updateZIndexes();

            if (page === lastPage && audio) {
                if (page.classList.contains('flipped')) audio.pause();
                else audio.play().catch(err => console.error(err));
            }
        });
    });

    // --- Heart cursor ---
    const canvas = document.getElementById('sparkle-canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    let particles = [];
    const mouse = { x:-100, y:-100 };

    window.addEventListener('mousemove', (e) => {
        mouse.x = e.x;
        mouse.y = e.y;
        for (let i=0;i<2;i++) particles.push(new Particle());
    });

    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });

    function Particle(){
        this.x = mouse.x; this.y = mouse.y;
        this.size = Math.random()*5+2;
        this.speedX = Math.random()*3-1.5;
        this.speedY = Math.random()*3-1.5;
        this.color = `hsl(${Math.random()*20+330},100%,75%)`;
        this.rotation = (Math.random()-0.5)*0.5;
        this.rotationSpeed = (Math.random()-0.5)*0.02;
        this.update = function(){
            this.x+=this.speedX; this.y+=this.speedY; this.rotation+=this.rotationSpeed;
            if(this.size>0.2)this.size-=0.1;
        };
        this.draw = function(){
            if(!ctx) return;
            ctx.save();
            ctx.translate(this.x,this.y);
            ctx.rotate(this.rotation);
            const scale = this.size/60;
            ctx.scale(scale,scale);
            ctx.translate(-75,-75);
            ctx.fillStyle=this.color;
            ctx.beginPath();
            ctx.moveTo(75,40);
            ctx.bezierCurveTo(75,37,70,25,50,25);
            ctx.bezierCurveTo(20,25,20,62.5,20,62.5);
            ctx.bezierCurveTo(20,80,40,102,75,120);
            ctx.bezierCurveTo(110,102,130,80,130,62.5);
            ctx.bezierCurveTo(130,62.5,130,25,100,25);
            ctx.bezierCurveTo(85,25,75,37,75,40);
            ctx.fill();
            ctx.restore();
        };
    }

    function handleParticles(){
        for(let i=0;i<particles.length;i++){
            particles[i].update();
            particles[i].draw();
            if(particles[i].size<=0.2){particles.splice(i,1); i--;}
        }
    }

    // --- Falling leaves ---
    const leafContainer = document.getElementById('falling-leaves-container');
    if(leafContainer){
        for(let i=0;i<50;i++){
            const leaf = document.createElement('div');
            leaf.classList.add('leaf');
            leaf.style.left = `${Math.random()*100}vw`;
            leaf.style.animationDuration = `${Math.random()*8+7}s`;
            leaf.style.animationDelay = `-${Math.random()*10}s`;
            leaf.style.opacity = String(Math.random()*0.6+0.4);
            const size = Math.random()*10+5;
            leaf.style.width = `${size}px`; leaf.style.height = `${size}px`;
            leaf.style.backgroundColor = `hsl(330,100%,${Math.random()*15+75}%)`;
            leafContainer.appendChild(leaf);
        }
    }

    function animate(){
        if(ctx) ctx.clearRect(0,0,canvas.width,canvas.height);
        handleParticles();
        requestAnimationFrame(animate);
    }
    animate();
});
