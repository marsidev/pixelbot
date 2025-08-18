// content-script.js
if ('serviceWorker' in navigator) {
    // Listen for any change in the controlling service worker
    navigator.serviceWorker.addEventListener('controllerchange', async () => {
        console.log('Service Worker controller changed!');

        try {
            const registrations = await navigator.serviceWorker.getRegistrations();
            if (registrations.length === 0) {
                console.log('No service workers found.');
            } else {
                for (let reg of registrations) {
                    const success = await reg.unregister();
                    console.log(success
                        ? `Service Worker unregistered: ${reg.scope}`
                        : `Failed to unregister: ${reg.scope}`);
                }
            }
        } catch (err) {
            console.error('Error getting registrations:', err);
        }
    });
}
