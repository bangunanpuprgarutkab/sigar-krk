self.addEventListener('install', event => {
  console.log('Service worker installing...');
  // Cache assets if needed
});

self.addEventListener('activate', event => {
  console.log('Service worker activating...');
});

self.addEventListener('fetch', event => {
  // Handle fetch events
  event.respondWith(
    fetch(event.request)
      .catch(() => {
        // Fallback for offline
        return new Response('Offline');
      })
  );
});
