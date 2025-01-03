<script lang="ts">
	import { run } from 'svelte/legacy';

	import { FontAwesomeIcon } from '@fortawesome/svelte-fontawesome';
	import { faPlay, faSearch, faTimesSquare } from '@fortawesome/free-solid-svg-icons';
	import { scale } from 'svelte/transition';

	import User from './User.svelte';
	import { playerState } from '$lib/player.svelte';

	let { accessToken }: { accessToken: string } = $props();

	let searchResults: any[] = $state([]);
	let searchQuery = $state('');

	let selectedResult = $state(0);

	async function searchItems() {
		if (!searchQuery) return;

		const typeCategories = ['track', 'album', 'artist', 'playlist'];
		let query = searchQuery.toLowerCase();
		typeCategories.forEach((type) => {
			query = query.replace(`@${type}s`, '');
		});
		query.replace(/ +/g, ' ');
		const queryKeys = query.split(' ');

		const types = typeCategories.filter((type) =>
			searchQuery.toLowerCase().split(' ').includes(`@${type}s`)
		);
		const searchTypes = types.length > 0 ? types : typeCategories;

		try {
			const response = await fetch(
				`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=${searchTypes.join(',')}`,
				{
					headers: {
						Authorization: `Bearer ${accessToken}`
					}
				}
			);

			if (!response.ok) throw new Error(`Error: ${response.statusText}`);
			const data = await response.json();

			const calculateScore = (item: {
				name: string;
				artists: { name: string }[];
				popularity: number;
			}) => {
				const name = item.name.toLowerCase();
				const artists = item?.artists?.map((artist) => artist.name.toLowerCase()).join(' ') || '';
				const popularity = item.popularity || 0;

				const nameScore = queryKeys.reduce(
					(score, key) => (name.includes(key) ? score + 1 : score),
					0
				);
				const artistsScore = queryKeys.reduce(
					(score, key) => (artists.includes(key) ? score + 1 : score),
					0
				);
				const popularityScore = popularity / 100;

				return nameScore + artistsScore + popularityScore;
			};

			const tracks = data.tracks?.items;
			const albums = data.albums?.items;
			const playlists = data.playlists?.items.filter((item: {}) => item !== null);
			const artists = data.artists?.items;

			searchResults = [];
			let indices: Record<string, number> = { tracks: 0, albums: 0, playlists: 0, artists: 0 };

			const sources = [
				{ type: 'tracks', items: tracks },
				{ type: 'albums', items: albums },
				{ type: 'playlists', items: playlists },
				{ type: 'artists', items: artists }
			].filter(({ items }) => items);

			while (true) {
				const scores = sources.map(({ items, type }) => {
					const item = items[indices[type]];
					return item ? { score: calculateScore(item), item } : { score: -1, item: null };
				});

				const maxScoreData = scores.reduce(
					(max, current) => (current.score > max.score ? current : max),
					{ score: -1, item: undefined }
				);

				if (maxScoreData.score === -1) break;

				const { item } = maxScoreData;
				const source = sources.find(({ items }) => items.includes(item));
				if (!source) break;
				const sourceType = source.type;
				indices[sourceType]++;

				searchResults.push({
					name: item.name,
					uri: item.uri,
					artists: item.artists || [],
					type: item.type,
					popularity: item.popularity || 0
				});
			}
		} catch (error) {
			console.error(error);
		}
	}

	function stopSearch() {
		searchQuery = '';
		searchResults = [];
	}

	run(() => {
		if (searchQuery.length) searchItems();
		else stopSearch();
	});

	function playItem(itemUri: string) {
		fetch('/api/play', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				uris: itemUri.includes('spotify:track:') ? [itemUri] : null,
				context_uri: itemUri.includes('spotify:track:') ? null : itemUri,
				currentDeviceId: playerState.devices.find((device) => device?.is_this_device)?.id
			})
		});
	}

	function onkeydown(event: KeyboardEvent) {
		event.stopPropagation();

		switch (event.key) {
			case 'Escape':
				stopSearch();
				searchInput?.blur();
				break;
			case 'ArrowDown':
				selectedResult = Math.min(selectedResult + 1, searchResults.length - 1);
				break;
			case 'ArrowUp':
				selectedResult = Math.max(selectedResult - 1, 0);
				break;
			case 'Enter':
				playItem(searchResults[selectedResult].uri);
				break;
			default:
				selectedResult = 0;
		}
	}

	let searchInput: HTMLInputElement;

	function handleKeydownWindow(event: KeyboardEvent) {
		if (event.key === '/' || (event.ctrlKey && event.key === 'f')) {
			event.preventDefault();
			searchInput?.focus();
		}
	}

	function focusInput() {
		searchInput?.focus();
	}
</script>

<svelte:window on:keydown={handleKeydownWindow} />

<div class="px-6 flex items-center justify-between">
	{#if searchQuery.length}
		<button
			class="flex items-center mr-3 transition-opacity duration-300 ease-in-out opacity-100"
			in:scale={{ duration: 300 }}
			out:scale={{ duration: 300 }}
			onclick={stopSearch}
			tabindex="0"
		>
			<FontAwesomeIcon icon={faTimesSquare} class="text-gray-400 cursor-pointer size-6 ml-[-3px]" />
		</button>
	{/if}

	<div
		class="flex items-center border rounded flex-grow cursor-text focus-within:outline focus-within:outline-orange-500 focus-within:outline-1"
		onkeydown={handleKeydownWindow}
		onfocus={focusInput}
		role="button"
		tabindex="-1"
	>
		<FontAwesomeIcon
			icon={faSearch}
			class="text-gray-300 text-sm ml-2"
			style={'witdh: 14px; height:14px;'}
		/>
		<input
			type="text"
			placeholder="/  Search for @tracks, @playlists, @albums, @artists..."
			class="outline-none w-full p-2 text-sm"
			tabindex="0"
			bind:this={searchInput}
			bind:value={searchQuery}
			{onkeydown}
		/>
	</div>

	<div class="ml-4">
		<User {accessToken} />
	</div>
</div>

{#if searchResults.length > 0}
	<ul class="mt-2 pb-6 border-b-gray-500 border-b-2">
		{#each searchResults as item, i}
			<li>
				<button
					class="px-6 py-1 cursor-pointer hover:bg-slate-100 w-full flex items-baseline {i ===
					selectedResult
						? 'bg-slate-200'
						: ''}"
					onclick={() => playItem(item.uri)}
				>
					<FontAwesomeIcon icon={faPlay} class="text-gray-400 text-xs mr-3" />
					<div class="flex items-baseline justify-items-start flex-wrap gap-2 gap-y-1">
						<span class="text-base text-gray-800 text-left">{item.name}</span>
						<span class="text-xs text-gray-500 text-left">
							{#each item.artists as artist, index}
								{artist.name}{index < item.artists.length - 1 ? ', ' : ''}
							{/each}
						</span>
					</div>
				</button>
			</li>
		{/each}
	</ul>
{/if}
