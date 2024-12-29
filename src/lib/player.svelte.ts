let player: any;

export const playerState = $state({
	state: {} as any,
	setPlayer: (p: any) => {
		player = p;
		changePlayer();
	},
	togglePlay: async () => {
		await player.togglePlay();
	},
	nextTrack: async () => {
		await player.nextTrack();
	},
	previousTrack: async () => {
		await player.previousTrack();
	},
	setVolume: async (volume_rate: number) => {
		await player.setVolume(volume_rate);
	},
	seek: async (position_ms: number) => {
		await player.seek(position_ms);
	}
});

const changePlayer = () => {
	player.addListener('ready', ({ device_id }) => {
		console.log('Ready with Device ID', device_id);

		fetch('/api/player', {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ device_id })
		}).then((res) => {
			console.log('Player connected to Spotify', res);

			player.getCurrentState().then((s) => {
				playerState.state = s;

				if (!s) {
					console.error('User is not playing music through the Web Playback SDK');
					return;
				}
			});
		});
	});
	player.addListener('not_ready', ({ device_id }) => {
		console.log('Device ID has gone offline', device_id);
	});
	player.addListener('initialization_error', ({ message }) => {
		console.error(message);
	});
	player.addListener('authentication_error', ({ message }) => {
		console.error(message);
	});
	player.addListener('account_error', ({ message }) => {
		console.error(message);
	});
	player.connect().then((success) => {
		if (success) {
			console.log('The Web Playback SDK successfully connected to Spotify!');
		}
	});
	player.addListener('player_state_changed', (s) => {
		console.log('Player state changed', s);
		playerState.state = s;
	});
	player.addListener('autoplay_failed', () => {
		console.log('Autoplay is not allowed by the browser autoplay rules');
	});
	player.on('playback_error', ({ message }) => {
		console.error('Failed to perform playback', message);
	});
	player.on('playback_failed', ({ message }) => {
		console.error('Failed to perform playback', message);
	});
};
