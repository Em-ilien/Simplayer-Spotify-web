import { writable } from 'svelte/store';
import axios from 'axios';
import { isAuthentified } from '$lib/authentification.svelte';

export const playlistsStore = writable([]);

async function fetchPlaylists() {
	try {
		const response = await axios.get('/api/playlists');
		const playlists = response.data;
		playlistsStore.set(playlists);
	} catch (error) {
		console.error('Error fetching playlists:', error);
	}
}

setTimeout(() => {
	if (isAuthentified()) fetchPlaylists();
});
