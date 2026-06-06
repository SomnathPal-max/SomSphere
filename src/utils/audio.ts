export const playNotificationChime = () => {
    if (localStorage.getItem('isSoundEnabled') === 'true') {
        const audio = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3?filename=success-1-6297.mp3');
        audio.volume = 0.5;
        audio.play().catch(e => console.error("Audio playback blocked: ", e));
    }
};
