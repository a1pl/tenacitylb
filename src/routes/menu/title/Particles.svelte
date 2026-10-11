<script lang="ts">
    import {onMount} from "svelte";

    /*
     * Port of Tenacity 6's main menu ParticleEngine: up to six blurred blobs (at most four small and
     * two big ones) drift from the right towards the bottom left, fading in and slowly rotating.
     * Positions are in Tenacity units (GUI scale 2), every unit is 2px.
     */

    interface ParticleImage {
        id: number;
        width: number;
        height: number;
        big: boolean;
    }

    interface Particle {
        image: ParticleImage;
        initialX: number;
        initialY: number;
        x: number;
        y: number;
        ticks: number;
        speed: number;
        rotation: number;
        createdAt: number;
        big: boolean;
    }

    const images: ParticleImage[] = [
        [1, 297, 301], [2, 303, 310], [3, 748, 781], [4, 227, 283],
        [5, 251, 302], [6, 253, 228], [7, 419, 476], [8, 564, 626],
    ].map(([id, width, height]) => ({id, width, height, big: width > 350}));

    const SMALL_LIMIT = 4;
    const BIG_LIMIT = 2;

    let particles: Particle[] = [];
    let smallCount = 0;
    let bigCount = 0;
    let seed = 0;
    let now = performance.now();

    function nextType(): boolean {
        if (smallCount === 0 && bigCount === 0) {
            bigCount++;
            return true;
        } else if (smallCount < SMALL_LIMIT) {
            smallCount++;
            return false;
        } else {
            bigCount++;
            return true;
        }
    }

    function createParticle(width: number, height: number): Particle {
        const big = nextType();
        const candidates = images.filter(i => i.big === big);
        // Tenacity never picks the last image of each kind
        const image = candidates[Math.floor(Math.random() * (candidates.length - 1))];

        const randomX = width + Math.random() * (width / 2);
        const randomY = Math.random() * -height;
        const particle: Particle = {
            image,
            initialX: randomX + randomX * (seed * .1),
            initialY: randomY + randomY * (seed * .1),
            x: 0,
            y: 0,
            ticks: Math.random() * (height / 4),
            speed: big ? 1.5 : 3,
            rotation: Math.random() * 360,
            createdAt: performance.now(),
            big,
        };

        seed = seed > 6 ? 0 : seed + 1;
        return particle;
    }

    function decelerate(t: number) {
        const x = Math.min(1, Math.max(0, t));
        return 1 - (x - 1) * (x - 1);
    }

    onMount(() => {
        let frame = 0;
        let last = performance.now();

        const update = (time: number) => {
            // Tenacity advances ticks by .03 every frame, assume 60 frames per second
            const delta = Math.min(100, time - last) / (1000 / 60);
            last = time;
            now = time;

            const width = window.innerWidth / 2;
            const height = window.innerHeight / 2;

            if (particles.length < 6 && (smallCount < SMALL_LIMIT || bigCount < BIG_LIMIT)) {
                particles.push(createParticle(width, height));
            }

            particles = particles.filter(p => {
                p.x = p.initialX - p.ticks * 20;
                p.y = p.initialY + p.ticks * (p.ticks * p.speed / 7);
                p.ticks += .03 * delta;

                const outside = p.x + p.image.width / 2 < 0 || p.y > height || p.x > width;
                if (outside) {
                    if (p.big) {
                        bigCount = Math.max(0, bigCount - 1);
                    } else {
                        smallCount = Math.max(0, smallCount - 1);
                    }
                }
                return !outside;
            });

            frame = requestAnimationFrame(update);
        };

        frame = requestAnimationFrame(update);
        return () => cancelAnimationFrame(frame);
    });

    // Fade in over one second (DecelerateAnimation), then rotate over ten seconds
    function style(p: Particle, time: number) {
        const age = time - p.createdAt;
        const fade = decelerate(age / 1000);
        const rotate = age > 1000 ? decelerate((age - 1000) / 10000) : 0;
        return `left: ${p.x * 2}px; top: ${p.y * 2}px; width: ${p.image.width}px; height: ${p.image.height}px;` +
            ` opacity: ${fade}; transform: rotate(${p.rotation * rotate}deg);`;
    }
</script>

<div class="particles">
    {#each [...particles].sort((a, b) => (b.image.width + b.image.height) - (a.image.width + a.image.height)) as p (p)}
        <img class="particle" src="img/tenacity/particles{p.image.id}.png" alt="" style={style(p, now)}/>
    {/each}
</div>

<style lang="scss">
  .particles {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
  }

  .particle {
    position: absolute;
    transform-origin: center;
  }
</style>
